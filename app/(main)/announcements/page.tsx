import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'

import { requireViewerRole } from '@/lib/members/route-helpers'
import {
  canManageAnnouncements,
  canViewAnnouncements,
} from '@/lib/announcements/permissions'

import { AnnouncementList } from './components/announcement-list'

export default async function AnnouncementsPage() {
  const { role, error } = await requireViewerRole()
  if (error === 'unauthenticated') redirect('/signin')
  if (!role) redirect('/error')
  if (!canViewAnnouncements(role)) redirect('/')

  return (
    <div className="px-4 md:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          ダッシュボードへ戻る
        </Link>
        <AnnouncementList canManage={canManageAnnouncements(role)} />
      </div>
    </div>
  )
}
