import React from 'react'
import Link from 'next/link'

import { canViewAnnouncements } from '@/lib/announcements/permissions'
import { getDashboardAnnouncements } from '@/lib/announcements/service'
import { requireViewerRole } from '@/lib/members/route-helpers'

import { DashboardAnnouncementsList } from './announcements-list-client'

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 text-card-foreground shadow">
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
  // 一覧ページ・API と同じ条件で guest には出さない。
  // （承認済みかどうかの線引きは運用次第で、guest にも見せる判断はあり得る）
  const { role } = await requireViewerRole()
  if (!role || !canViewAnnouncements(role)) return null

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
