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
  sendAnnouncementMessage,
} from '@/lib/discord/announcement-notify'
import { buildAnnouncementMessage } from '@/lib/discord/announcement-message'

import {
  claimAnnouncementForDiscordEdit,
  claimAnnouncementForDiscordSend,
  listAnnouncementsPendingDiscord,
  markDiscordFailed,
  markDiscordSent,
  recoverStuckDiscordSending,
  DISCORD_CRON_BATCH_SIZE,
} from './service'
import type { AnnouncementStatus, DiscordNotificationStatus, ManagedAnnouncement } from './types'

/**
 * - `sent`   : 送信・編集に成功した
 * - `failed` : Discord 側で失敗した（お知らせ自体の処理は継続する）
 * - `skipped`: 対象外、または他の処理が先に処理権を取った
 */
export type DiscordNotifyOutcome = 'sent' | 'failed' | 'skipped'

function botToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN?.trim() || null
}

function portalUrl(): string | null {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || null
}

function messageFor(announcement: ManagedAnnouncement): string {
  return buildAnnouncementMessage({
    title: announcement.title,
    content: announcement.content,
    category: announcement.category,
    isImportant: announcement.isImportant,
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
): Promise<DiscordNotifyOutcome> {
  const claimed = await claimAnnouncementForDiscordSend(id)
  if (!claimed || !claimed.discord.channelId) return 'skipped'

  const token = botToken()
  if (!token) {
    await markDiscordFailed(id, { error: 'DISCORD_BOT_TOKEN が設定されていません' })
    return 'failed'
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
    await markDiscordFailed(id, { error: result.detail })
    return 'failed'
  }

  await markDiscordSent(id, { messageId: result.messageId })
  return 'sent'
}

/**
 * 送信済みメッセージの編集。新規メッセージは作らない。
 * Discord 側で削除されていた場合はメッセージ ID を外し、
 * 再送すると新規投稿としてやり直せる状態にする。
 */
export async function editAnnouncementOnDiscord(
  id: string
): Promise<DiscordNotifyOutcome> {
  const claimed = await claimAnnouncementForDiscordEdit(id)
  if (!claimed || !claimed.discord.channelId || !claimed.discord.messageId) return 'skipped'

  const token = botToken()
  if (!token) {
    await markDiscordFailed(id, { error: 'DISCORD_BOT_TOKEN が設定されていません' })
    return 'failed'
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
    return 'failed'
  }

  await markDiscordSent(id)
  return 'sent'
}

/**
 * 手動再送。未送信なら新規送信、送信済みなら編集としてやり直す。
 * 送信処理中のものは処理権が取れないため 'skipped' になる。
 */
export function resendAnnouncementToDiscord(
  announcement: ManagedAnnouncement
): Promise<DiscordNotifyOutcome> {
  return announcement.discord.messageId
    ? editAnnouncementOnDiscord(announcement.id)
    : sendAnnouncementToDiscord(announcement.id)
}

export type DiscordCronSummary = {
  /** 送信処理中のまま止まっていて失敗に戻した件数 */
  recovered: number
  processed: number
  sent: number
  failed: number
  skipped: number
}

/**
 * 公開時刻に到達した予約投稿を送信する（cron から呼ぶ）。
 * レート制限を避けるため、件数を絞って逐次送信する。
 */
export async function processPendingDiscordNotifications(
  limit: number = DISCORD_CRON_BATCH_SIZE
): Promise<DiscordCronSummary> {
  const recovered = await recoverStuckDiscordSending()
  const pending = await listAnnouncementsPendingDiscord(limit)

  const summary: DiscordCronSummary = {
    recovered,
    processed: pending.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  }

  for (const announcement of pending) {
    const outcome = await sendAnnouncementToDiscord(announcement.id)
    if (outcome === 'sent') summary.sent += 1
    else if (outcome === 'failed') summary.failed += 1
    else summary.skipped += 1
  }

  return summary
}
