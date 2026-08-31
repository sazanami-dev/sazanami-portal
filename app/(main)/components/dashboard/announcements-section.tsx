import React from 'react'
import Link from 'next/link'

export function AnnouncementsSection() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 text-card-foreground shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">お知らせ</h2>
        <Link href="/announcements" className="text-sm font-medium text-primary hover:underline">
          すべて見る
        </Link>
      </div>
      <div className="space-y-4">
        {/* Placeholder list */}
        <div className="group cursor-pointer rounded-lg border p-4 transition-all hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center gap-2">
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900 dark:text-red-300">
              重要
            </span>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              広報
            </span>
          </div>
          <h3 className="mt-2 font-semibold group-hover:text-primary">Announcement Title 1</h3>
          <p className="mt-1 text-xs text-muted-foreground">2026/08/30 10:00</p>
        </div>
        <div className="group cursor-pointer rounded-lg border p-4 transition-all hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center gap-2">
             <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              内部イベント
            </span>
          </div>
          <h3 className="mt-2 font-semibold group-hover:text-primary">Announcement Title 2</h3>
          <p className="mt-1 text-xs text-muted-foreground">2026/08/29 15:30</p>
        </div>
      </div>
    </div>
  )
}
