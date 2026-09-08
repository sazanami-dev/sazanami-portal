'use client'

import React from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatAnnouncementDateTime } from '@/lib/announcements/format'
import type { Announcement } from '@/lib/announcements/types'

import { CategoryBadge, ImportantBadge } from './announcement-badges'
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
      <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto sm:max-w-2xl">
        {announcement && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                {announcement.isImportant && <ImportantBadge />}
                <CategoryBadge category={announcement.category} />
              </div>
              <DialogTitle className="pr-8 text-lg leading-snug">
                {announcement.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                公開日: {formatAnnouncementDateTime(announcement.publishAt)}
              </p>
            </DialogHeader>
            <AnnouncementMarkdown
              content={announcement.content}
              className="border-t pt-4"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
