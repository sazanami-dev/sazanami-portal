import { createAdminClient } from '@/lib/supabase/server'
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementStatus,
} from './types'

/** 一覧ページの 1 ページあたりの件数 */
export const ANNOUNCEMENTS_PAGE_SIZE = 10

/** ダッシュボードのお知らせ欄に読み込む件数（3 件表示 + スクロールで続きを見せる） */
export const DASHBOARD_ANNOUNCEMENTS_LIMIT = 10

/** 更新時にダッシュボードのキャッシュを破棄するためのタグ */
export const ANNOUNCEMENTS_TAG = 'announcements'

const SELECT_COLUMNS =
  'id, title, content, status, category, is_important, is_pinned, publish_at, created_by, created_at, updated_at'

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

export type AnnouncementListResult = {
  items: Announcement[]
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

async function listAnnouncements(options: ListOptions): Promise<AnnouncementListResult> {
  const page = Math.max(1, Math.floor(options.page ?? 1))
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? ANNOUNCEMENTS_PAGE_SIZE))
  const from = (page - 1) * pageSize

  const admin = createAdminClient()
  let query = admin
    .from('announcements')
    .select(SELECT_COLUMNS, { count: 'exact' })
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
    return { items: [], total: 0, page, pageSize }
  }

  return {
    items: (data as AnnouncementRow[]).map(rowToAnnouncement),
    total: count ?? 0,
    page,
    pageSize,
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
): Promise<AnnouncementListResult> {
  const statuses: AnnouncementStatus[] = params.includeArchived
    ? ['published', 'archived']
    : ['published']
  return listAnnouncements({ ...params, statuses, includeScheduled: true })
}

/** 下書き一覧（管理者のみ） */
export function listDraftAnnouncements(
  params: AnnouncementListParams = {}
): Promise<AnnouncementListResult> {
  return listAnnouncements({ ...params, statuses: ['draft'], includeScheduled: true })
}

/** ダッシュボードに表示するお知らせ。一般ユーザー向けの条件で先頭 N 件 */
export async function getDashboardAnnouncements(): Promise<Announcement[]> {
  const result = await listPublishedAnnouncements({
    page: 1,
    pageSize: DASHBOARD_ANNOUNCEMENTS_LIMIT,
  })
  return result.items
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

export type CreateAnnouncementInput = {
  title: string
  content: string
  status: Extract<AnnouncementStatus, 'draft' | 'published'>
  category: AnnouncementCategory
  isImportant?: boolean
  isPinned?: boolean
  /** 未指定なら即時公開（現在時刻） */
  publishAt?: string
  createdBy: string
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<Announcement | null> {
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
      created_by: input.createdBy,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return null
  return rowToAnnouncement(data as AnnouncementRow)
}

export type UpdateAnnouncementInput = {
  title?: string
  content?: string
  status?: AnnouncementStatus
  category?: AnnouncementCategory
  isImportant?: boolean
  isPinned?: boolean
  publishAt?: string
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<Announcement | null> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.content !== undefined) patch.content = input.content
  if (input.status !== undefined) patch.status = input.status
  if (input.category !== undefined) patch.category = input.category
  if (input.isImportant !== undefined) patch.is_important = input.isImportant
  if (input.isPinned !== undefined) patch.is_pinned = input.isPinned
  if (input.publishAt !== undefined) patch.publish_at = input.publishAt

  if (Object.keys(patch).length === 0) {
    return getAnnouncement(id, { viewerCanManage: true })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .maybeSingle()

  if (error || !data) return null
  return rowToAnnouncement(data as AnnouncementRow)
}

/**
 * 論理削除。設計上、削除できるのは下書きのみとしているため、
 * 対象のステータスが draft の場合だけ削除する。
 */
export async function deleteDraftAnnouncement(id: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  return !error && !!data
}
