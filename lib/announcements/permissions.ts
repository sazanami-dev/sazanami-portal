import type { AppRole } from '@/lib/members/permissions'

/**
 * お知らせの作成・編集・削除・ピン留めは manager 以上に限定する。
 * 一般ユーザー（member）は閲覧のみ。
 */
export function canManageAnnouncements(role: AppRole): boolean {
  return role === 'manager' || role === 'admin' || role === 'developer'
}

/** お知らせの閲覧: 登録済みユーザー（guest 以外） */
export function canViewAnnouncements(role: AppRole): boolean {
  return role !== 'guest'
}
