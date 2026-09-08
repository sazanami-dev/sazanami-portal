/**
 * お知らせ機能で共有する型とラベル定義。
 * クライアントコンポーネントからも読み込むため、サーバー専用の依存は持たせない。
 */

export type AnnouncementStatus = 'draft' | 'published' | 'archived'

export type AnnouncementCategory =
  | 'info'
  | 'internal_event'
  | 'external_event'
  | 'system'

export const ANNOUNCEMENT_STATUSES: readonly AnnouncementStatus[] = [
  'draft',
  'published',
  'archived',
] as const

export const ANNOUNCEMENT_CATEGORIES: readonly AnnouncementCategory[] = [
  'info',
  'internal_event',
  'external_event',
  'system',
] as const

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  info: '広報',
  internal_event: '内部イベント',
  external_event: '外部イベント',
  system: 'システム',
}

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: '下書き',
  published: '公開',
  archived: 'アーカイブ',
}

/** カテゴリバッジの配色。一覧・ダッシュボード・詳細で共通に使う */
export const ANNOUNCEMENT_CATEGORY_BADGE_CLASSES: Record<AnnouncementCategory, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  internal_event: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  external_event: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  system: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

export type Announcement = {
  id: string
  title: string
  /** Markdown 形式の本文 */
  content: string
  status: AnnouncementStatus
  category: AnnouncementCategory
  /** 「重要」タグ。カテゴリ・isPinned とは独立した属性 */
  isImportant: boolean
  /** 最上部固定フラグ。isImportant とは独立して管理者が設定する */
  isPinned: boolean
  /** 公開日時（予約投稿）。ISO 文字列 */
  publishAt: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export function isAnnouncementCategory(value: unknown): value is AnnouncementCategory {
  return (
    typeof value === 'string' &&
    (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(value)
  )
}

export function isAnnouncementStatus(value: unknown): value is AnnouncementStatus {
  return (
    typeof value === 'string' &&
    (ANNOUNCEMENT_STATUSES as readonly string[]).includes(value)
  )
}

/** 予約投稿（公開ステータスだが publishAt が未来）かどうか */
export function isScheduled(announcement: Announcement, now: Date = new Date()): boolean {
  return (
    announcement.status === 'published' &&
    new Date(announcement.publishAt).getTime() > now.getTime()
  )
}

/** 一般ユーザーの画面に表示してよいお知らせか */
export function isVisibleToMembers(
  announcement: Announcement,
  now: Date = new Date()
): boolean {
  return announcement.status === 'published' && !isScheduled(announcement, now)
}
