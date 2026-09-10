import { PinIcon } from 'lucide-react'

import {
  ANNOUNCEMENT_CATEGORY_BADGE_CLASSES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from '@/lib/announcements/types'

const BASE_CLASS = 'rounded px-2 py-0.5 text-xs font-medium'

export function CategoryBadge({ category }: { category: AnnouncementCategory }) {
  return (
    <span className={`${BASE_CLASS} ${ANNOUNCEMENT_CATEGORY_BADGE_CLASSES[category]}`}>
      {ANNOUNCEMENT_CATEGORY_LABELS[category]}
    </span>
  )
}

/** ピン留めバッジ（アイコンのみ） */
export function PinnedBadge() {
  return (
    <span
      className="inline-flex items-center justify-center rounded bg-[#0F3FDD]/10 p-1 text-[#0F3FDD] dark:bg-[#0F3FDD]/20 dark:text-blue-300"
      title="ピン留め"
      aria-label="ピン留め"
    >
      <PinIcon className="size-3.5 fill-current rotate-45" />
    </span>
  )
}

/** 「重要」タグ。カテゴリ・ピン留めとは独立した属性 */
export function ImportantBadge() {
  return (
    <span
      className={`${BASE_CLASS} font-semibold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`}
    >
      重要
    </span>
  )
}

/** 管理者一覧でのみ使う状態バッジ（予約投稿・下書き・アーカイブ） */
export function StateBadge({ label }: { label: string }) {
  return (
    <span className={`${BASE_CLASS} border bg-background text-muted-foreground`}>
      {label}
    </span>
  )
}
