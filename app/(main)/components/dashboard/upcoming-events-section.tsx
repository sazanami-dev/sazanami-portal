import React from 'react'
import Link from 'next/link'

export function UpcomingEventsSection() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 text-card-foreground shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">今後の活動</h2>
        <Link href="/calendar" className="text-sm font-medium text-primary hover:underline">
          カレンダーで見る
        </Link>
      </div>
      <div className="space-y-4">
        {/* Placeholder list */}
        <div className="relative pl-6 before:absolute before:bottom-0 before:left-[11px] before:top-0 before:w-0.5 before:bg-border last:before:hidden">
          <div className="absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-background bg-primary"></div>
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">明日開催</span>
            </div>
            <h3 className="mt-2 font-semibold">Event Title 1</h3>
            <p className="mt-1 text-sm text-muted-foreground">日時: 2026/08/31 (月) 19:00 - 21:00</p>
            <p className="text-sm text-muted-foreground">場所: Discord 会議室</p>
          </div>
        </div>
        <div className="relative pl-6 before:absolute before:bottom-0 before:left-[11px] before:top-0 before:w-0.5 before:bg-border last:before:hidden">
          <div className="absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-background bg-muted-foreground"></div>
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-semibold">Event Title 2</h3>
            <p className="mt-1 text-sm text-muted-foreground">日時: 2026/09/14 (月) 19:00 - 21:00</p>
            <p className="text-sm text-muted-foreground">場所: オフライン会場</p>
          </div>
        </div>
      </div>
    </div>
  )
}
