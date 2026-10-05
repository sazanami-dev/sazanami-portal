'use client'

import React, { useState } from 'react'

import { AnnouncementModal } from '@/app/(main)/announcements/components/announcement-modal'
import {
  CategoryBadge,
  ImportantBadge,
  PinnedBadge,
} from '@/app/(main)/announcements/components/announcement-badges'
import { formatAnnouncementDateTime } from '@/lib/announcements/format'
import {
  ANNOUNCEMENT_CATEGORY_BORDER_CLASSES,
  type Announcement,
} from '@/lib/announcements/types'

/**
 * ダッシュボードのお知らせ一覧。
 * 表示するのは取得済みの 3 件のみで、続きは一覧ページで読んでもらう。
 */
export function DashboardAnnouncementsList({ items }: { items: Announcement[] }) {
  const [selected, setSelected] = useState<Announcement | null>(null)

  return (
    <>
      <ul className="space-y-4">
        {items.map((announcement) => (
          <li key={announcement.id}>
            <button
              type="button"
              className={`group w-full rounded-lg border border-l-4 p-4 text-left transition-all hover:scale-[1.01] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                ANNOUNCEMENT_CATEGORY_BORDER_CLASSES[announcement.category]
              }`}
              onClick={() => setSelected(announcement)}
            >
              <div className="flex flex-wrap items-center gap-2">
                {announcement.isPinned && <PinnedBadge />}
                {announcement.isImportant && <ImportantBadge />}
                <CategoryBadge category={announcement.category} />
              </div>
              <h3 className="mt-2 line-clamp-2 font-semibold group-hover:text-primary">
                {announcement.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatAnnouncementDateTime(announcement.publishAt)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <AnnouncementModal announcement={selected} onClose={() => setSelected(null)} />
    </>
  )
}
