import {
  isAnnouncementCategory,
  type AnnouncementCategory,
  type AnnouncementStatus,
} from './types'

export const TITLE_MAX_LENGTH = 255
/** 本文はテキスト型だが、極端に大きい入力は受け付けない */
export const CONTENT_MAX_LENGTH = 20000

export type ValidationError =
  | 'invalid_title'
  | 'invalid_content'
  | 'invalid_category'
  | 'invalid_status'
  | 'invalid_publish_at'

export type Validated<T> = { ok: true; value: T } | { ok: false; error: ValidationError }

export function validateTitle(value: unknown): Validated<string> {
  if (typeof value !== 'string') return { ok: false, error: 'invalid_title' }
  const title = value.trim()
  if (!title || title.length > TITLE_MAX_LENGTH) {
    return { ok: false, error: 'invalid_title' }
  }
  return { ok: true, value: title }
}

export function validateContent(value: unknown): Validated<string> {
  if (typeof value !== 'string') return { ok: false, error: 'invalid_content' }
  const content = value.trim()
  if (!content || content.length > CONTENT_MAX_LENGTH) {
    return { ok: false, error: 'invalid_content' }
  }
  return { ok: true, value: content }
}

export function validateCategory(value: unknown): Validated<AnnouncementCategory> {
  if (!isAnnouncementCategory(value)) return { ok: false, error: 'invalid_category' }
  return { ok: true, value }
}

/**
 * 公開日時（予約投稿）。ISO 文字列として解釈できることのみ検証する。
 * 過去日時は「即時公開」と同じ扱いになるため許容する。
 */
export function validatePublishAt(value: unknown): Validated<string> {
  if (typeof value !== 'string') return { ok: false, error: 'invalid_publish_at' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { ok: false, error: 'invalid_publish_at' }
  return { ok: true, value: date.toISOString() }
}

/** 新規作成で指定できるステータスは下書きか公開のみ（アーカイブは編集画面から） */
export function validateCreateStatus(
  value: unknown
): Validated<Extract<AnnouncementStatus, 'draft' | 'published'>> {
  if (value === 'draft' || value === 'published') return { ok: true, value }
  return { ok: false, error: 'invalid_status' }
}

export function validateUpdateStatus(value: unknown): Validated<AnnouncementStatus> {
  if (value === 'draft' || value === 'published' || value === 'archived') {
    return { ok: true, value }
  }
  return { ok: false, error: 'invalid_status' }
}

export function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}
