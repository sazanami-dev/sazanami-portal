/**
 * お知らせを Discord へ送信・編集する薄いクライアント。
 *
 * 呼び出し側（お知らせの公開処理）を失敗させないため、例外は投げず
 * lib/discord/invite.ts と同じ Result 型で返す。
 */

/** エラー内容は DB に保存するため、長すぎるレスポンスは切り詰める */
const ERROR_DETAIL_MAX_LENGTH = 1000

/** Discord API の応答を待つ上限 */
const REQUEST_TIMEOUT_MS = 10_000

const API_BASE = 'https://discord.com/api/v10'

const USER_AGENT = 'DiscordBot (https://sazanami-portal.vercel.app, 1.0)'

export type DiscordSendSuccess = { ok: true; messageId: string }
export type DiscordSendFailure = {
  ok: false
  detail: string
  /** 対象メッセージが Discord 上に存在しない（手動削除された等） */
  messageMissing?: boolean
}
export type DiscordSendResult = DiscordSendSuccess | DiscordSendFailure

export type DiscordEditResult = { ok: true } | DiscordSendFailure

type MessagePayload = {
  botToken: string
  channelId: string
  content: string
  mentionEveryone: boolean
}

/**
 * 本文中に書かれた @everyone / @here / <@id> が意図せず発火しないよう、
 * メンションの可否は必ず allowed_mentions で明示する。
 */
function allowedMentions(mentionEveryone: boolean) {
  return { parse: mentionEveryone ? ['everyone'] : [] }
}

function headers(botToken: string) {
  return {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  }
}

function truncateDetail(detail: string): string {
  return detail.length > ERROR_DETAIL_MAX_LENGTH
    ? `${detail.slice(0, ERROR_DETAIL_MAX_LENGTH)}…`
    : detail
}

/**
 * 失敗レスポンスを Result に変換する。
 * 429 の retry_after もそのまま detail に残すと原因が追いやすい。
 */
async function failureFromResponse(res: Response): Promise<DiscordSendFailure> {
  const text = await res.text().catch(() => '')
  const detail = truncateDetail(`${res.status} ${text}`.trim())

  // 10008 = Unknown Message。Discord 側で手動削除されたケースだけを
  // 「メッセージ消失」と扱う。404 でもチャンネル不明(10003)は設定ミスなので含めない。
  const code = (() => {
    try {
      return (JSON.parse(text) as { code?: unknown }).code
    } catch {
      return undefined
    }
  })()

  return code === 10008 ? { ok: false, detail, messageMissing: true } : { ok: false, detail }
}

function failureFromError(error: unknown): DiscordSendFailure {
  const message = error instanceof Error ? error.message : String(error)
  return { ok: false, detail: truncateDetail(`request failed: ${message}`) }
}

/**
 * 新規送信。`nonce` にお知らせの ID を渡すことで、
 * 万一リクエストが重複しても Discord 側でも重複排除が効く。
 */
export async function sendAnnouncementMessage({
  botToken,
  channelId,
  content,
  mentionEveryone,
  nonce,
}: MessagePayload & { nonce?: string }): Promise<DiscordSendResult> {
  try {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: headers(botToken),
      body: JSON.stringify({
        content,
        allowed_mentions: allowedMentions(mentionEveryone),
        ...(nonce ? { nonce } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!res.ok) return await failureFromResponse(res)

    const json = (await res.json().catch(() => null)) as { id?: unknown } | null
    if (!json || typeof json.id !== 'string') {
      return { ok: false, detail: 'message id missing in response' }
    }
    return { ok: true, messageId: json.id }
  } catch (error) {
    return failureFromError(error)
  }
}

/**
 * 送信済みメッセージの編集。
 * Discord の仕様上、編集ではメンションの再通知は発生しない。
 */
export async function editAnnouncementMessage({
  botToken,
  channelId,
  messageId,
  content,
  mentionEveryone,
}: MessagePayload & { messageId: string }): Promise<DiscordEditResult> {
  try {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: headers(botToken),
      body: JSON.stringify({
        content,
        allowed_mentions: allowedMentions(mentionEveryone),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!res.ok) return await failureFromResponse(res)
    return { ok: true }
  } catch (error) {
    return failureFromError(error)
  }
}
