import React from 'react'
import { AnnouncementList } from '@/app/(main)/announcements/components/announcement-list'

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            お知らせ
          </h1>
          {/* TODO: Role check for manager+ to show '新規作成' button */}
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            新規作成
          </button>
        </div>
        
        <AnnouncementList />
      </div>
    </div>
  )
}
