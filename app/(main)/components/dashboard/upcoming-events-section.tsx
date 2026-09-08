import React from 'react'
import Link from 'next/link'
import { getUpcomingEvents, type UpcomingEvent } from '@/lib/calendar'

function formatEventDate(startStr: string, endStr: string, isAllDay: boolean) {
  const startDate = new Date(startStr);
  const y = startDate.getFullYear();
  const m = String(startDate.getMonth() + 1).padStart(2, '0');
  const d = String(startDate.getDate()).padStart(2, '0');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const w = days[startDate.getDay()];

  const dateStr = `${y}/${m}/${d} (${w})`;

  if (isAllDay) {
    return `日時: ${dateStr}`;
  }

  const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });

  const endDate = endStr ? new Date(endStr) : null;
  const startT = timeFormatter.format(startDate);
  const endT = endDate ? timeFormatter.format(endDate) : '';

  return `日時: ${dateStr} ${startT}${endT ? ` - ${endT}` : ''}`;
}

function getEventBadge(startStr: string) {
  // JSTでの現在時刻
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
  now.setHours(0, 0, 0, 0);

  const startDate = new Date(new Date(startStr).toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
  startDate.setHours(0, 0, 0, 0);

  const diffTime = startDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: '本日開催', color: 'bg-destructive/10 text-destructive border-destructive/20' };
  if (diffDays === 1) return { label: '明日開催', color: 'bg-primary/10 text-primary border-primary/20' };
  if (diffDays >= 2 && diffDays <= 7) return { label: '近日開催', color: 'bg-muted text-muted-foreground border-border' };
  
  return null;
}

export async function UpcomingEventsSection() {
  let events: UpcomingEvent[] = [];
  let error: string | null = null;

  try {
    events = await getUpcomingEvents();
  } catch (err) {
    console.error("Failed to fetch upcoming events:", err);
    error = "現在、カレンダー情報を取得できません。";
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 text-card-foreground shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">今後の活動</h2>
        <Link href="/calendar" className="text-sm font-medium text-primary hover:underline">
          カレンダーで見る
        </Link>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          直近の予定はありません。
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => {
            const badge = getEventBadge(event.start);
            return (
              <div key={event.id} className="relative pl-6 before:absolute before:bottom-0 before:left-[11px] before:top-0 before:w-0.5 before:bg-border last:before:hidden">
                <div className={`absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-background ${index === 0 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                <div className="rounded-lg border bg-muted/50 p-4">
                  {badge && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  )}
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatEventDate(event.start, event.end, event.isAllDay)}
                  </p>
                  {event.location && (
                    <p className="text-sm text-muted-foreground">場所: {event.location}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
