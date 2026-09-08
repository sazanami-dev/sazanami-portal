import React from 'react'
import Link from 'next/link'

import { getDashboardAnnouncements } from '@/lib/announcements/service'

import { DashboardAnnouncementsList } from './announcements-list-client'

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 text-card-foreground shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">お知らせ</h2>
        <Link
          href="/announcements"
          className="text-sm font-medium text-primary hover:underline"
        >
          すべて見る
        </Link>
      </div>
      {children}
    </div>
  )
}

export async function AnnouncementsSection() {
  // 公開済み・公開日時到来済みのものを、ピン留め優先 → 公開日時の降順で取得する
  const announcements = await getDashboardAnnouncements()

  if (announcements.length === 0) {
    return (
      <SectionShell>
        <p className="text-sm text-muted-foreground">現在、お知らせはありません</p>
      </SectionShell>
    )
  }

  return (
    <SectionShell>
      <DashboardAnnouncementsList items={announcements} />
    </SectionShell>
  )
}
