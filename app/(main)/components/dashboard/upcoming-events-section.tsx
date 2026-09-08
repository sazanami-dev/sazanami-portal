import React from 'react'
import Link from 'next/link'

import { eventColorHex, formatEventDateTime } from '@/lib/calendar/format'
import { getUpcomingEvents, type UpcomingEvent } from '@/lib/calendar/upcoming'

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 text-card-foreground shadow">
      <h2 className="mb-4 text-xl font-bold">今後の活動</h2>
      {children}
    </div>
  )
}

function EventItem({
  event,
  isNext,
}: {
  event: UpcomingEvent
  /** 最も近い予定。文字サイズとドットの配色で強調する */
  isNext: boolean
}) {
  // カレンダー側で色を設定していればそれを使い、未設定ならテーマの既定色にする
  const dotColor = eventColorHex(event.colorId)

  return (
    <li className="relative pl-6 before:absolute before:bottom-0 before:left-[11px] before:top-0 before:w-0.5 before:bg-border last:before:hidden">
      <div
        className={`absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-background ${
          dotColor ? '' : isNext ? 'bg-primary' : 'bg-muted-foreground'
        }`}
        style={dotColor ? { backgroundColor: dotColor } : undefined}
      />
      {/* カード全体をカレンダーページへのリンクにする */}
      <Link
        href="/calendar"
        className="block rounded-lg border bg-muted/50 p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <h3 className={`font-semibold ${isNext ? 'text-lg' : ''}`}>{event.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          日時: {formatEventDateTime(event)}
        </p>
        {event.location && (
          <p className="text-sm text-muted-foreground">場所: {event.location}</p>
        )}
      </Link>
    </li>
  )
}

export async function UpcomingEventsSection() {
  const result = await getUpcomingEvents()

  if (!result.ok) {
    return (
      <SectionShell>
        <p className="text-sm text-muted-foreground">
          現在、カレンダー情報を取得できません
        </p>
      </SectionShell>
    )
  }

  if (result.events.length === 0) {
    return (
      <SectionShell>
        <p className="text-sm text-muted-foreground">
          現在、予定されている活動はありません
        </p>
      </SectionShell>
    )
  }

  return (
    <SectionShell>
      <ul className="space-y-4">
        {result.events.map((event, index) => (
          <EventItem key={event.id} event={event} isNext={index === 0} />
        ))}
      </ul>
    </SectionShell>
  )
}
