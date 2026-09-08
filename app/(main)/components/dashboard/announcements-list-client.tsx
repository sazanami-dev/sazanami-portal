'use client'

import React, { useState } from 'react'

import { AnnouncementModal } from '@/app/(main)/announcements/components/announcement-modal'
import {
  CategoryBadge,
  ImportantBadge,
} from '@/app/(main)/announcements/components/announcement-badges'
import { formatAnnouncementDateTime } from '@/lib/announcements/format'
import type { Announcement } from '@/lib/announcements/types'

/**
 * ダッシュボードのお知らせ一覧。
 * 3 件分の高さで表示し、続きはスクロールで読めるようにする。
 */
export function DashboardAnnouncementsList({ items }: { items: Announcement[] }) {
  const [selected, setSelected] = useState<Announcement | null>(null)

  return (
    <>
      <ul className="max-h-80 space-y-4 overflow-y-auto pr-1">
        {items.map((announcement) => (
          <li key={announcement.id}>
            <button
              type="button"
              className={`group w-full rounded-lg border p-4 text-left transition-all hover:scale-[1.01] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                announcement.isPinned
                  ? 'border-l-4 border-l-amber-500 dark:border-l-amber-400'
                  : ''
              }`}
              onClick={() => setSelected(announcement)}
            >
              <div className="flex flex-wrap items-center gap-2">
                {announcement.isImportant && <ImportantBadge />}
                <CategoryBadge category={announcement.category} />
              </div>
              <h3 className="mt-2 font-semibold group-hover:text-primary">
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
