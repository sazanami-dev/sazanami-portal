'use client'

import React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatAnnouncementDateTime } from '@/lib/announcements/format'
import type { Announcement } from '@/lib/announcements/types'

import {
  CategoryBadge,
  ImportantBadge,
  PinnedBadge,
} from './announcement-badges'
import { AnnouncementMarkdown } from './announcement-markdown'

/** お知らせの全文表示モーダル。ダッシュボードと一覧ページで共用する */
export function AnnouncementModal({
  announcement,
  onClose,
}: {
  /** null のときは閉じた状態 */
  announcement: Announcement | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!announcement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl">
        {announcement && (
          <>
            <DialogHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {announcement.isPinned && <PinnedBadge />}
                {announcement.isImportant && <ImportantBadge />}
                <CategoryBadge category={announcement.category} />
              </div>
              <DialogTitle className="pr-8 text-xl font-bold leading-snug sm:text-2xl">
                {announcement.title}
              </DialogTitle>
              {/* DialogDescription にすることで、読み上げ時の説明も兼ねる */}
              <DialogDescription className="text-sm">
                公開日: {formatAnnouncementDateTime(announcement.publishAt)}
              </DialogDescription>
            </DialogHeader>
            <AnnouncementMarkdown
              content={announcement.content}
              className="border-t pt-6"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
