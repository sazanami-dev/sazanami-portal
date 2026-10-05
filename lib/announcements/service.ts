import { revalidateTag, unstable_cache } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/server'
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementStatus,
  DiscordNotificationStatus,
  ManagedAnnouncement,
} from './types'

/** 一覧ページの 1 ページあたりの件数 */
export const ANNOUNCEMENTS_PAGE_SIZE = 10

/** ダッシュボードに表示する件数 */
export const DASHBOARD_ANNOUNCEMENTS_LIMIT = 3

/**
 * 取得する件数。表示件数ちょうどだと、取得後に除外が入ったときに
 * 表示が減ってしまうため、余分に取ってから絞り込む。
 */
const FETCH_MARGIN = 10

/** 更新時にダッシュボードのキャッシュを破棄するためのタグ */
export const ANNOUNCEMENTS_TAG = 'announcements'

const SELECT_COLUMNS =
  'id, title, content, status, category, is_important, is_pinned, publish_at, created_by, created_at, updated_at'

/** Discord 通知の情報は管理者向けの取得でのみ含める */
const DISCORD_COLUMNS =
  'discord_channel_id, discord_mention_everyone, discord_message_id, discord_notification_status, discord_notified_at, discord_notification_error'

const SELECT_COLUMNS_WITH_DISCORD = `${SELECT_COLUMNS}, ${DISCORD_COLUMNS}`

type AnnouncementRow = {
  id: string
  title: string
  content: string
  status: AnnouncementStatus
  category: AnnouncementCategory
  is_important: boolean
  is_pinned: boolean
  publish_at: string
  created_by: string | null
  created_at: string
  updated_at: string
}

type DiscordRow = {
  discord_channel_id: string | null
  discord_mention_everyone: boolean
  discord_message_id: string | null
  discord_notification_status: DiscordNotificationStatus
  discord_notified_at: string | null
  discord_notification_error: string | null
}

type ManagedAnnouncementRow = AnnouncementRow & DiscordRow

function rowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    category: row.category,
    isImportant: row.is_important,
    isPinned: row.is_pinned,
    publishAt: row.publish_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToManagedAnnouncement(row: ManagedAnnouncementRow): ManagedAnnouncement {
  return {
    ...rowToAnnouncement(row),
    discord: {
      channelId: row.discord_channel_id,
      mentionEveryone: row.discord_mention_everyone,
      messageId: row.discord_message_id,
      status: row.discord_notification_status,
      notifiedAt: row.discord_notified_at,
      error: row.discord_notification_error,
    },
  }
}

/**
 * PostgREST の `or` フィルタはカンマ・括弧で式を区切るため、
 * 検索語に含まれると構文が壊れる。ワイルドカードと併せて取り除く。
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%\\*]/g, ' ').trim()
}

export type AnnouncementListParams = {
  page?: number
  pageSize?: number
  search?: string
  category?: AnnouncementCategory
}

export type AnnouncementListResult<T extends Announcement = Announcement> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type ListOptions = AnnouncementListParams & {
  /** 対象とするステータス */
  statuses: AnnouncementStatus[]
  /**
   * 予約投稿（publish_at が未来）を含めるか。
   * 一般ユーザー向けの一覧では false にする。
   */
  includeScheduled: boolean
}

async function queryAnnouncementRows(
  options: ListOptions,
  columns: string
): Promise<{ rows: unknown[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, Math.floor(options.page ?? 1))
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? ANNOUNCEMENTS_PAGE_SIZE))
  const from = (page - 1) * pageSize

  const admin = createAdminClient()
  let query = admin
    .from('announcements')
    .select(columns, { count: 'exact' })
    .is('deleted_at', null)
    .in('status', options.statuses)

  if (!options.includeScheduled) {
    query = query.lte('publish_at', new Date().toISOString())
  }
  if (options.category) {
    query = query.eq('category', options.category)
  }

  const search = options.search ? sanitizeSearchTerm(options.search) : ''
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    // ピン留めを最上部に固定 → それ以降は公開日時の降順
    .order('is_pinned', { ascending: false })
    .order('publish_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error || !data) {
    return { rows: [], total: 0, page, pageSize }
  }

  return { rows: data as unknown[], total: count ?? 0, page, pageSize }
}

async function listAnnouncements(options: ListOptions): Promise<AnnouncementListResult> {
  const { rows, ...rest } = await queryAnnouncementRows(options, SELECT_COLUMNS)
  return { items: (rows as AnnouncementRow[]).map(rowToAnnouncement), ...rest }
}

/** 管理者向けの取得。Discord 通知の情報を含める */
async function listManaged(
  options: ListOptions
): Promise<AnnouncementListResult<ManagedAnnouncement>> {
  const { rows, ...rest } = await queryAnnouncementRows(options, SELECT_COLUMNS_WITH_DISCORD)
  return {
    items: (rows as ManagedAnnouncementRow[]).map(rowToManagedAnnouncement),
    ...rest,
  }
}

/** 一般ユーザー向けの一覧。公開済みかつ公開日時が到来したもののみ */
export function listPublishedAnnouncements(
  params: AnnouncementListParams = {}
): Promise<AnnouncementListResult> {
  return listAnnouncements({
    ...params,
    statuses: ['published'],
    includeScheduled: false,
  })
}

export type AdminListParams = AnnouncementListParams & {
  /** アーカイブ済みも表示するか（一覧画面のチェックボックス） */
  includeArchived?: boolean
}

/** 管理者向けの一覧。予約投稿も含み、任意でアーカイブ済みも含める */
export function listManagedAnnouncements(
  params: AdminListParams = {}
): Promise<AnnouncementListResult<ManagedAnnouncement>> {
  const statuses: AnnouncementStatus[] = params.includeArchived
    ? ['published', 'archived']
    : ['published']
  return listManaged({ ...params, statuses, includeScheduled: true })
}

/** 下書き一覧（管理者のみ） */
export function listDraftAnnouncements(
  params: AnnouncementListParams = {}
): Promise<AnnouncementListResult<ManagedAnnouncement>> {
  return listManaged({ ...params, statuses: ['draft'], includeScheduled: true })
}

/**
 * ダッシュボードに表示するお知らせ。一般ユーザー向けの条件で先頭 N 件。
 * 予約投稿が公開時刻に到達したら自動で現れるよう、時間ベースの再検証も併用する。
 */
export const getDashboardAnnouncements = unstable_cache(
  async (): Promise<Announcement[]> => {
    const result = await listPublishedAnnouncements({
      page: 1,
      pageSize: Math.max(DASHBOARD_ANNOUNCEMENTS_LIMIT * 2, FETCH_MARGIN),
    })
    return result.items.slice(0, DASHBOARD_ANNOUNCEMENTS_LIMIT)
  },
  ['dashboard-announcements'],
  { tags: [ANNOUNCEMENTS_TAG], revalidate: 60 }
)

/** お知らせを更新したときにダッシュボードのキャッシュを破棄する */
export function revalidateAnnouncements(): void {
  revalidateTag(ANNOUNCEMENTS_TAG, { expire: 0 })
}

/**
 * 1 件取得。`viewerCanManage` が false の場合は
 * 一般ユーザーに見せてよいもの（公開済み・公開日時到来済み）だけを返す。
 */
export async function getAnnouncement(
  id: string,
  { viewerCanManage }: { viewerCanManage: boolean }
): Promise<Announcement | null> {
  const admin = createAdminClient()
  let query = admin
    .from('announcements')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)

  if (!viewerCanManage) {
    query = query.eq('status', 'published').lte('publish_at', new Date().toISOString())
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return rowToAnnouncement(data as AnnouncementRow)
}

/** 管理者向けの 1 件取得。Discord 通知の情報を含める */
export async function getManagedAnnouncement(
  id: string
): Promise<ManagedAnnouncement | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .select(SELECT_COLUMNS_WITH_DISCORD)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return rowToManagedAnnouncement(data as ManagedAnnouncementRow)
}

export type CreateAnnouncementInput = {
  title: string
  content: string
  status: Extract<AnnouncementStatus, 'draft' | 'published'>
  category: AnnouncementCategory
  isImportant?: boolean
  isPinned?: boolean
  /** 未指定なら即時公開（現在時刻） */
  publishAt?: string
  /** 通知先チャンネル ID。null / 未指定 = 通知しない */
  discordChannelId?: string | null
  discordMentionEveryone?: boolean
  /** 作成直後の通知状態。予約投稿なら 'pending' を入れて cron に拾わせる */
  discordNotificationStatus?: DiscordNotificationStatus
  createdBy: string
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<ManagedAnnouncement | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .insert({
      title: input.title,
      content: input.content,
      status: input.status,
      category: input.category,
      is_important: input.isImportant ?? false,
      is_pinned: input.isPinned ?? false,
      publish_at: input.publishAt ?? new Date().toISOString(),
      discord_channel_id: input.discordChannelId ?? null,
      discord_mention_everyone: input.discordMentionEveryone ?? false,
      discord_notification_status: input.discordNotificationStatus ?? 'not_sent',
      created_by: input.createdBy,
    })
    .select(SELECT_COLUMNS_WITH_DISCORD)
    .single()

  if (error || !data) return null
  return rowToManagedAnnouncement(data as ManagedAnnouncementRow)
}

export type UpdateAnnouncementInput = {
  title?: string
  content?: string
  status?: AnnouncementStatus
  category?: AnnouncementCategory
  isImportant?: boolean
  isPinned?: boolean
  publishAt?: string
  /** null にすると「通知しない」に戻す */
  discordChannelId?: string | null
  discordMentionEveryone?: boolean
  discordNotificationStatus?: DiscordNotificationStatus
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<ManagedAnnouncement | null> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.content !== undefined) patch.content = input.content
  if (input.status !== undefined) patch.status = input.status
  if (input.category !== undefined) patch.category = input.category
  if (input.isImportant !== undefined) patch.is_important = input.isImportant
  if (input.isPinned !== undefined) patch.is_pinned = input.isPinned
  if (input.publishAt !== undefined) patch.publish_at = input.publishAt
  if (input.discordChannelId !== undefined) patch.discord_channel_id = input.discordChannelId
  if (input.discordMentionEveryone !== undefined) {
    patch.discord_mention_everyone = input.discordMentionEveryone
  }
  if (input.discordNotificationStatus !== undefined) {
    patch.discord_notification_status = input.discordNotificationStatus
  }

  if (Object.keys(patch).length === 0) {
    return getManagedAnnouncement(id)
  }

  // PostgREST 経由の更新では schema.ts の $onUpdate が効かず、
  // DB 側にトリガーも無いので、更新日時は明示的に入れる
  patch.updated_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS_WITH_DISCORD)
    .maybeSingle()

  if (error || !data) return null
  return rowToManagedAnnouncement(data as ManagedAnnouncementRow)
}

/**
 * 論理削除。設計上、削除できるのは下書きのみとしているため、
 * 対象のステータスが draft の場合だけ削除する。
 */
export async function deleteDraftAnnouncement(id: string): Promise<boolean> {
  const now = new Date().toISOString()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  return !error && !!data
}

// ==============================
// Discord 通知の状態遷移
//
// cron の重複起動や再送ボタンの連打で二重送信しないよう、送信前に
// 条件付き更新で「処理中(sending)」を立てて処理権を取る。更新が 0 件なら
// 他の処理が先に取っているので何もしない。
// 処理権を取るときは updated_at も更新する。sending のまま止まったものを
// 時間で拾い直すのに使うため（内容変更ではないが、ここでは時刻が必要）。
// ==============================

/** 送信処理中のまま放置されたとみなすまでの時間 */
export const DISCORD_SENDING_TIMEOUT_MS = 10 * 60 * 1000

/** cron の 1 回あたりの処理件数。レート制限を避けるため少なめにする */
export const DISCORD_CRON_BATCH_SIZE = 10

/**
 * 新規送信の処理権を取る。まだ Discord に投げていないものだけが対象。
 * @returns 取得できたお知らせ。取れなければ null
 */
export async function claimAnnouncementForDiscordSend(
  id: string
): Promise<ManagedAnnouncement | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .update({
      discord_notification_status: 'sending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .in('discord_notification_status', ['pending', 'failed'])
    .is('discord_message_id', null)
    .not('discord_channel_id', 'is', null)
    .select(SELECT_COLUMNS_WITH_DISCORD)
    .maybeSingle()

  if (error || !data) return null
  return rowToManagedAnnouncement(data as ManagedAnnouncementRow)
}

/** 送信済みメッセージを編集するための処理権を取る */
export async function claimAnnouncementForDiscordEdit(
  id: string
): Promise<ManagedAnnouncement | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .update({
      discord_notification_status: 'sending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .in('discord_notification_status', ['sent', 'failed'])
    .not('discord_message_id', 'is', null)
    .select(SELECT_COLUMNS_WITH_DISCORD)
    .maybeSingle()

  if (error || !data) return null
  return rowToManagedAnnouncement(data as ManagedAnnouncementRow)
}

/**
 * 通知状態の書き込み。
 *
 * ここでの書き込みに失敗すると「Discord には投稿したのに記録が残らない」
 * 状態になり、後の再送で二重投稿を招く。数回だけ再試行する。
 * @returns 書き込めたか
 */
async function writeDiscordState(
  id: string,
  patch: Record<string, unknown>,
  attempts = 3
): Promise<boolean> {
  const admin = createAdminClient()
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { error } = await admin.from('announcements').update(patch).eq('id', id)
    if (!error) return true
    console.error(
      `[announcements] Discord 通知状態の書き込みに失敗 (${attempt}/${attempts}):`,
      error.message
    )
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
  }
  return false
}

/** 送信・編集の成功を記録する。messageId は新規送信時のみ渡す */
export async function markDiscordSent(
  id: string,
  { messageId }: { messageId?: string } = {}
): Promise<boolean> {
  return writeDiscordState(id, {
    discord_notification_status: 'sent',
    discord_notified_at: new Date().toISOString(),
    discord_notification_error: null,
    ...(messageId ? { discord_message_id: messageId } : {}),
  })
}

/**
 * 通知状態は変えずに、理由だけを書き残す。
 * 「送信処理中のまま様子を見る」ときに、止まっている理由を管理画面へ出すために使う。
 */
export async function noteDiscordError(id: string, error: string): Promise<boolean> {
  return writeDiscordState(id, { discord_notification_error: error })
}

/**
 * レート制限に当たったことを記録する。
 *
 * 一時的な制限なので失敗として置くと手動再送が必要になってしまう。
 * 送信待ちに戻し、次回の cron で送り直せるようにする。
 */
export async function markDiscordRateLimited(
  id: string,
  { error }: { error: string }
): Promise<boolean> {
  return writeDiscordState(id, {
    discord_notification_status: 'pending',
    discord_notification_error: error,
  })
}

/**
 * 送信・編集の失敗を記録する。
 * Discord 側でメッセージが消えている場合は messageId を外し、
 * 次の再送で新規投稿としてやり直せるようにする。
 */
export async function markDiscordFailed(
  id: string,
  { error, clearMessageId }: { error: string; clearMessageId?: boolean }
): Promise<boolean> {
  return writeDiscordState(id, {
    discord_notification_status: 'failed',
    discord_notification_error: error,
    ...(clearMessageId ? { discord_message_id: null } : {}),
  })
}

/** 公開時刻に到達した送信待ちのお知らせ（cron 用） */
export async function listAnnouncementsPendingDiscord(
  limit: number = DISCORD_CRON_BATCH_SIZE
): Promise<ManagedAnnouncement[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .select(SELECT_COLUMNS_WITH_DISCORD)
    .is('deleted_at', null)
    .eq('status', 'published')
    .eq('discord_notification_status', 'pending')
    .not('discord_channel_id', 'is', null)
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: true })
    .limit(limit)

  if (error || !data) return []
  return (data as ManagedAnnouncementRow[]).map(rowToManagedAnnouncement)
}

/**
 * 送信処理中のまま止まったお知らせ（cron の先頭で拾い直す対象）。
 * プロセスが落ちた場合などに sending のまま残り続けるのを防ぐ。
 */
export async function listStuckDiscordSending(): Promise<ManagedAnnouncement[]> {
  const threshold = new Date(Date.now() - DISCORD_SENDING_TIMEOUT_MS).toISOString()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .select(SELECT_COLUMNS_WITH_DISCORD)
    .is('deleted_at', null)
    .eq('discord_notification_status', 'sending')
    .lte('updated_at', threshold)
    .limit(DISCORD_CRON_BATCH_SIZE)

  if (error || !data) return []
  return (data as ManagedAnnouncementRow[]).map(rowToManagedAnnouncement)
}
