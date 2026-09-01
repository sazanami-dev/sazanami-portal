import { unstable_cache } from 'next/cache'

import { errorMessage } from '@/lib/errors'
import { getCalendarClient, getDefaultCalendarId } from './client'

/** ダッシュボードに表示する件数 */
export const UPCOMING_EVENTS_LIMIT = 3

/** キャッシュ再検証間隔（秒）。要件の「5〜10分」の下限を採用 */
const REVALIDATE_SECONDS = 300

/** 予定を追加・削除した側からキャッシュを破棄するためのタグ */
export const UPCOMING_EVENTS_TAG = 'upcoming-events'

export type UpcomingEvent = {
  id: string
  title: string
  /** 終日イベントは 'YYYY-MM-DD'、時刻ありは ISO 文字列 */
  start: string
  end: string | null
  allDay: boolean
  location: string | null
  description: string | null
  htmlLink: string | null
}

export type UpcomingEventsResult =
  | { ok: true; events: UpcomingEvent[] }
  | { ok: false; error: string }

/**
 * `/api/calendar/add` は summary を `タイトル@場所` の形で登録し、
 * location フィールドにも同じ値を入れる。表示では重複するので落とす。
 */
function stripLocationSuffix(summary: string, location: string | null): string {
  if (!location) return summary
  const suffix = `@${location}`
  if (!summary.endsWith(suffix)) return summary
  // 場所だけの summary だった場合に空文字にしない
  return summary.slice(0, -suffix.length).trim() || summary
}

type CalendarEventItem = {
  id?: string | null
  summary?: string | null
  location?: string | null
  description?: string | null
  htmlLink?: string | null
  start?: { date?: string | null; dateTime?: string | null } | null
  end?: { date?: string | null; dateTime?: string | null } | null
}

function toUpcomingEvent(item: CalendarEventItem, index: number): UpcomingEvent | null {
  const start = item.start?.dateTime ?? item.start?.date
  // 開始日時が無い予定は時系列に置けないため除外する
  if (!start) return null

  const location = item.location?.trim() || null
  const summary = item.summary?.trim() || '（無題の予定）'

  return {
    // events.list は通常 id を返すが、型上は null 許容のため保険で採番する
    id: item.id ?? `upcoming-${index}`,
    title: stripLocationSuffix(summary, location),
    start,
    end: item.end?.dateTime ?? item.end?.date ?? null,
    allDay: !item.start?.dateTime,
    location,
    description: item.description?.trim() || null,
    htmlLink: item.htmlLink ?? null,
  }
}

/**
 * 現在時刻以降に開始する予定を、開始が近い順に取得する。
 *
 * 失敗時は throw する。unstable_cache は例外をキャッシュしないため、
 * 一時的なAPI障害の結果が再検証間隔のあいだ居座らずに済む。
 */
const fetchUpcomingEvents = unstable_cache(
  async (limit: number): Promise<UpcomingEvent[]> => {
    const calendar = getCalendarClient()
    const res = await calendar.events.list({
      calendarId: getDefaultCalendarId(),
      timeMin: new Date().toISOString(),
      // 繰り返し予定を各回に展開する。orderBy: 'startTime' の前提条件でもある
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: limit,
      fields: 'items(id,summary,location,description,htmlLink,start,end)',
    })

    return (res.data.items ?? [])
      .map(toUpcomingEvent)
      .filter((event): event is UpcomingEvent => event !== null)
  },
  ['upcoming-events'],
  { revalidate: REVALIDATE_SECONDS, tags: [UPCOMING_EVENTS_TAG] }
)

/**
 * ダッシュボード表示用の入口。
 *
 * ここでは throw せず結果オブジェクトを返し、カレンダーが落ちていても
 * 他のカードの描画を巻き込まないようにする。
 */
export async function getUpcomingEvents(
  limit: number = UPCOMING_EVENTS_LIMIT
): Promise<UpcomingEventsResult> {
  try {
    return { ok: true, events: await fetchUpcomingEvents(limit) }
  } catch (error) {
    console.error('[upcoming-events] 取得に失敗しました:', error)
    return { ok: false, error: errorMessage(error) }
  }
}
