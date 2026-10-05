/**
 * お知らせの Discord 通知オーケストレーション。
 *
 * 通知はベストエフォートとし、ここで発生した失敗でお知らせ本体の
 * 公開・更新処理を失敗させない。結果は通知ステータスとして記録し、
 * 管理画面から再送できるようにする。
 *
 * サーバー専用（API ルートと cron からのみ呼ぶ）。
 */

import {
  editAnnouncementMessage,
  findRecentBotMessage,
  sendAnnouncementMessage,
} from '@/lib/discord/announcement-notify'
import {
  announcementIdMarker,
  buildAnnouncementMessage,
} from '@/lib/discord/announcement-message'

import {
  claimAnnouncementForDiscordEdit,
  claimAnnouncementForDiscordSend,
  getManagedAnnouncement,
  listAnnouncementsPendingDiscord,
  listStuckDiscordSending,
  markDiscordFailed,
  markDiscordRateLimited,
  markDiscordSent,
  noteDiscordError,
  DISCORD_CRON_BATCH_SIZE,
} from './service'
import type { AnnouncementStatus, DiscordNotificationStatus, ManagedAnnouncement } from './types'

/**
 * - `sent`   : 送信・編集に成功した
 * - `failed` : Discord 側で失敗した（お知らせ自体の処理は継続する）
 * - `skipped`: 対象外、または他の処理が先に処理権を取った
 */
export type DiscordNotifyOutcome = 'sent' | 'failed' | 'skipped'

export type DiscordNotifyResult = {
  outcome: DiscordNotifyOutcome
  /** レート制限に当たった。まとめて処理する側はこの回を打ち切る */
  rateLimited: boolean
}

const skipped: DiscordNotifyResult = { outcome: 'skipped', rateLimited: false }

/** Discord のチャンネルあたりの制限（概ね 5 件/5 秒）に触れないための間隔 */
const SEND_INTERVAL_MS = 1200

/**
 * cron の 1 回あたりの上限時間。
 * 呼び出し元（bot）のタイムアウトより短くし、応答が返らないまま
 * 次の実行が重なるのを防ぐ。残りは次回に回す。
 */
const CRON_DEADLINE_MS = 40_000

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}



function botToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN?.trim() || null
}

function portalUrl(): string | null {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || null
}

function messageFor(announcement: ManagedAnnouncement): string {
  return buildAnnouncementMessage({
    announcementId: announcement.id,
    title: announcement.title,
    content: announcement.content,
    category: announcement.category,
    publishAt: announcement.publishAt,
    mentionEveryone: announcement.discord.mentionEveryone,
    portalUrl: portalUrl(),
  }).content
}

/**
 * 保存後の通知ステータスを決める。
 *
 * 送信済み・送信中・送信失敗のものは触らない。失敗したものを `pending` に
 * 戻すと cron が自動で送り直してしまい、「自動リトライはしない（再送は手動）」
 * という方針に反するため。
 *
 * @returns 書き込むステータス。変更不要なら null
 */
export function resolveDiscordStatusAfterSave({
  status,
  channelId,
  current,
}: {
  status: AnnouncementStatus
  channelId: string | null
  current: DiscordNotificationStatus
}): DiscordNotificationStatus | null {
  if (current === 'sent' || current === 'sending' || current === 'failed') return null

  const next: DiscordNotificationStatus =
    channelId && status === 'published' ? 'pending' : 'not_sent'

  return next === current ? null : next
}

/** 公開時刻が到来しているか（到来していれば即時送信の対象） */
export function isDueForDiscord(publishAt: string, now: Date = new Date()): boolean {
  return new Date(publishAt).getTime() <= now.getTime()
}

/**
 * 新規送信。まだ Discord に投げていないものだけが対象。
 * 即時公開・cron・手動再送のいずれからも同じ経路を通る。
 */
export async function sendAnnouncementToDiscord(
  id: string
): Promise<DiscordNotifyResult> {
  const claimed = await claimAnnouncementForDiscordSend(id)
  if (!claimed || !claimed.discord.channelId) return skipped

  const token = botToken()
  if (!token) {
    await markDiscordFailed(id, { error: 'DISCORD_BOT_TOKEN が設定されていません' })
    return { outcome: 'failed', rateLimited: false }
  }

  const result = await sendAnnouncementMessage({
    botToken: token,
    channelId: claimed.discord.channelId,
    content: messageFor(claimed),
    mentionEveryone: claimed.discord.mentionEveryone,
    // 万一リクエストが重複しても Discord 側で重複排除が効くようにする
    nonce: claimed.id,
  })

  if (!result.ok) {
    if (result.rateLimited) {
      // 一時的な制限なので送信待ちに戻し、次回の cron で送り直す
      await markDiscordRateLimited(id, { error: result.detail })
      return { outcome: 'skipped', rateLimited: true }
    }
    await markDiscordFailed(id, { error: result.detail })
    return { outcome: 'failed', rateLimited: false }
  }

  const recorded = await markDiscordSent(id, { messageId: result.messageId })
  if (!recorded) {
    // 投稿はできているので、記録できなかったことをログに残す。
    // sending のまま残り、次回の cron が実際の投稿を探して引き継ぐ。
    console.error(
      `[announcements] Discord へ投稿したが記録できませんでした: id=${id} messageId=${result.messageId}`
    )
    return { outcome: 'sent', rateLimited: false }
  }

  // 送信している間にお知らせが更新されていたら、投稿を最新の内容に揃える。
  // claim 時に updated_at を更新しているので、変化していれば更新があったとわかる。
  const latest = await getManagedAnnouncement(id)
  if (latest && latest.updatedAt !== claimed.updatedAt) {
    await editAnnouncementOnDiscord(id)
  }

  return { outcome: 'sent', rateLimited: false }
}

/**
 * 送信済みメッセージの編集。新規メッセージは作らない。
 * Discord 側で削除されていた場合はメッセージ ID を外し、
 * 再送すると新規投稿としてやり直せる状態にする。
 */
export async function editAnnouncementOnDiscord(
  id: string
): Promise<DiscordNotifyResult> {
  const claimed = await claimAnnouncementForDiscordEdit(id)
  if (!claimed || !claimed.discord.channelId || !claimed.discord.messageId) return skipped

  const token = botToken()
  if (!token) {
    await markDiscordFailed(id, { error: 'DISCORD_BOT_TOKEN が設定されていません' })
    return { outcome: 'failed', rateLimited: false }
  }

  const result = await editAnnouncementMessage({
    botToken: token,
    channelId: claimed.discord.channelId,
    messageId: claimed.discord.messageId,
    content: messageFor(claimed),
    mentionEveryone: claimed.discord.mentionEveryone,
  })

  if (!result.ok) {
    await markDiscordFailed(id, {
      error: result.messageMissing
        ? `${result.detail}（Discord 上のメッセージが見つかりません。再送信すると新規投稿になります）`
        : result.detail,
      clearMessageId: result.messageMissing,
    })
    return { outcome: 'failed', rateLimited: result.rateLimited === true }
  }

  await markDiscordSent(id)
  return { outcome: 'sent', rateLimited: false }
}

/**
 * 記録に残っていないだけで Discord にはすでに投稿済み、という状態を拾う。
 *
 * 送信は成功したのに記録の書き込みに失敗した場合や、記録前にプロセスが
 * 落ちた場合に起こる。そのまま再送すると二重投稿になるため、チャンネルの
 * 直近メッセージから同じお知らせの投稿を探し、見つかったら引き継ぐ。
 * 探索にはメッセージ末尾のお知らせ ID を使うので、同じタイトルの
 * 別のお知らせを取り違えることはない。
 *
 * Discord に問い合わせできなかった場合は「投稿が無い」と断定できない。
 * 未送信として扱うと後の再送で二重投稿になるため、結果を区別して返す。
 */
type AdoptResult =
  /** 投稿が見つかり、送信済みとして引き継いだ */
  | 'adopted'
  /** 問い合わせはできたが、投稿は無かった（＝本当に未送信） */
  | 'not_found'
  /** 問い合わせ自体ができなかった（通信エラー・レート制限・設定不足） */
  | 'unknown'

async function adoptExistingMessage(
  announcement: ManagedAnnouncement
): Promise<{ result: AdoptResult; detail?: string }> {
  const token = botToken()
  const channelId = announcement.discord.channelId
  if (!token || !channelId) {
    return { result: 'unknown', detail: 'Bot トークンまたは通知先が設定されていません' }
  }

  const found = await findRecentBotMessage({
    botToken: token,
    channelId,
    contains: announcementIdMarker(announcement.id),
  })

  if (!found.ok) return { result: 'unknown', detail: found.detail }
  if (!found.messageId) return { result: 'not_found' }

  await markDiscordSent(announcement.id, { messageId: found.messageId })
  return { result: 'adopted' }
}

/**
 * 手動再送。未送信なら新規送信、送信済みなら編集としてやり直す。
 * 送信処理中のものは処理権が取れないため 'skipped' になる。
 */
export async function resendAnnouncementToDiscord(
  announcement: ManagedAnnouncement
): Promise<DiscordNotifyResult> {
  if (announcement.discord.messageId) {
    return editAnnouncementOnDiscord(announcement.id)
  }

  // 記録できなかっただけで投稿は済んでいることがある。
  // そのまま送ると二重投稿になるため、先に実際の投稿を探す。
  const adopted = await adoptExistingMessage(announcement)
  if (adopted.result === 'adopted') return { outcome: 'sent', rateLimited: false }

  // 投稿の有無を確認できないまま送ると二重投稿になりうるので、ここで止める
  if (adopted.result === 'unknown') {
    await markDiscordFailed(announcement.id, {
      error: `Discord に問い合わせできず、二重投稿を避けるため再送を中止しました: ${adopted.detail ?? ''}`.trim(),
    })
    return { outcome: 'failed', rateLimited: false }
  }

  return sendAnnouncementToDiscord(announcement.id)
}

export type DiscordCronSummary = {
  /** 送信処理中のまま止まっていて片付けた件数 */
  recovered: number
  processed: number
  sent: number
  failed: number
  skipped: number
  /** レート制限や時間切れで次回に回した件数 */
  deferred: number
}

/**
 * 送信処理中のまま止まったものを片付ける。
 *
 * 実際に投稿されていればその投稿を引き継いで送信済みにし、
 * 見つからなければ失敗として再送できる状態に戻す。
 * Discord に問い合わせできなかったものは、そのまま次回の実行に持ち越す。
 * @returns 片付けた件数
 */
async function recoverStuckAnnouncements(deadlineAt: number): Promise<number> {
  const stuck = await listStuckDiscordSending()
  let recovered = 0

  for (const [index, announcement] of stuck.entries()) {
    if (Date.now() > deadlineAt) break
    // 投稿の有無を確認する問い合わせにもレート制限があるため間隔を空ける
    if (index > 0) await wait(SEND_INTERVAL_MS)

    // 編集の途中で止まったものは投稿自体が残っているので、失敗に戻すだけでよい
    if (announcement.discord.messageId) {
      await markDiscordFailed(announcement.id, {
        error: 'timeout: 送信処理が完了しませんでした',
      })
      recovered += 1
      continue
    }

    const adopted = await adoptExistingMessage(announcement)
    if (adopted.result === 'adopted') {
      recovered += 1
      continue
    }

    // 投稿の有無を確認できなかった場合は未送信と断定できない。
    // 失敗にすると再送で二重投稿になりうるので、送信処理中のまま次回に回す。
    if (adopted.result === 'unknown') {
      await noteDiscordError(
        announcement.id,
        `投稿の有無を確認できなかったため、次回の実行に持ち越します: ${adopted.detail ?? ''}`.trim()
      )
      continue
    }

    await markDiscordFailed(announcement.id, {
      error: 'timeout: 送信処理が完了しませんでした（投稿は見つからなかったため未送信として扱います）',
    })
    recovered += 1
  }

  return recovered
}

/**
 * 公開時刻に到達した予約投稿を送信する（cron から呼ぶ）。
 *
 * レート制限を避けるため、件数を絞って間隔を空けながら逐次送信する。
 * 制限に当たった場合と、1 回あたりの上限時間を超えた場合は打ち切り、
 * 残りは次回の実行に回す。
 */
export async function processPendingDiscordNotifications(
  limit: number = DISCORD_CRON_BATCH_SIZE
): Promise<DiscordCronSummary> {
  const startedAt = Date.now()
  // 復旧に時間を取られて送信が止まらないよう、上限時間の半分までに抑える
  const recovered = await recoverStuckAnnouncements(startedAt + CRON_DEADLINE_MS / 2)
  const pending = await listAnnouncementsPendingDiscord(limit)

  const summary: DiscordCronSummary = {
    recovered,
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    deferred: 0,
  }

  for (const [index, announcement] of pending.entries()) {
    if (Date.now() - startedAt > CRON_DEADLINE_MS) {
      summary.deferred = pending.length - index
      break
    }
    // 1 件目は待たずに送る
    if (index > 0) await wait(SEND_INTERVAL_MS)

    const result = await sendAnnouncementToDiscord(announcement.id)
    summary.processed += 1
    if (result.outcome === 'sent') summary.sent += 1
    else if (result.outcome === 'failed') summary.failed += 1
    else summary.skipped += 1

    if (result.rateLimited) {
      // 続けて投げても失敗するだけなので、この 1 件も含めて次回に回す
      summary.deferred = pending.length - index
      break
    }
  }

  return summary
}
