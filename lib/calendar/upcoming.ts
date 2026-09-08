import { unstable_cache } from 'next/cache'

import { errorMessage } from '@/lib/errors'
import { getCalendarClient, getDefaultCalendarId } from './client'

/** ダッシュボードに表示する件数 */
export const UPCOMING_EVENTS_LIMIT = 3

/** キャッシュ再検証間隔（秒）。要件の「5〜10分」の下限を採用 */
const REVALIDATE_SECONDS = 300

/**
 * API から取得する件数。表示件数ちょうどだと、除外された分だけ
 * 表示が減ってしまうため、余分に取ってから絞り込む。
 */
const FETCH_MARGIN = 10

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
  /** Google カレンダーの event colorId（'1'〜'11'）。未設定なら null */
  colorId: string | null
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
  colorId?: string | null
  htmlLink?: string | null
  status?: string | null
  visibility?: string | null
  start?: { date?: string | null; dateTime?: string | null } | null
  end?: { date?: string | null; dateTime?: string | null } | null
}

/** 終日イベントの日付は 'YYYY-MM-DD' 固定。表示側がこの形を前提にしている */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 表示に使える日時かを判定する。
 *
 * 表示側の Intl.DateTimeFormat は不正な日付で RangeError を投げる。
 * それはレンダリング中に起きるため getUpcomingEvents の try/catch では
 * 捕捉できず、ダッシュボード全体が 500 になる。ここで弾いておく。
 */
function isRenderableDate(value: string, allDay: boolean): boolean {
  if (allDay && !DATE_ONLY_RE.test(value)) return false
  return !Number.isNaN(new Date(value).getTime())
}

/**
 * 非公開扱いにする visibility。
 * confidential は Google 上 private と同等として予約されている。
 */
const HIDDEN_VISIBILITY = new Set(['private', 'confidential'])

function toUpcomingEvent(item: CalendarEventItem, index: number): UpcomingEvent | null {
  // showDeleted の既定は false で singleEvents: true のため通常は返らないが、
  // 削除済みの回を表示してしまうと影響が大きいので明示的に弾く。
  if (item.status === 'cancelled') return null

  // /calendar の埋め込みは公開カレンダーとして匿名で読まれるため非公開予定の
  // 詳細を伏せる。こちらはオーナーのトークンで読むので同じ扱いに揃える。
  if (item.visibility && HIDDEN_VISIBILITY.has(item.visibility)) return null

  const start = item.start?.dateTime ?? item.start?.date
  // 開始日時が無い予定は時系列に置けないため除外する
  if (!start) return null

  const allDay = !item.start?.dateTime
  if (!isRenderableDate(start, allDay)) return null

  // 終了日時は表示の補助でしかないため、壊れていても予定ごと落とさず無視する
  const rawEnd = item.end?.dateTime ?? item.end?.date ?? null
  const end = rawEnd && isRenderableDate(rawEnd, allDay) ? rawEnd : null

  const location = item.location?.trim() || null
  const summary = item.summary?.trim() || '（無題の予定）'

  return {
    // events.list は通常 id を返すが、型上は null 許容のため保険で採番する
    id: item.id ?? `upcoming-${index}`,
    title: stripLocationSuffix(summary, location),
    start,
    end,
    allDay,
    location,
    colorId: item.colorId ?? null,
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
  // calendarId は使うだけでなくキャッシュキーにも効かせる。
  // 引数はキーの一部になるため、参照先カレンダーを変えれば別エントリになる。
  async (calendarId: string, limit: number): Promise<UpcomingEvent[]> => {
    const calendar = getCalendarClient()
    const res = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      // 繰り返し予定を各回に展開する。orderBy: 'startTime' の前提条件でもある
      singleEvents: true,
      orderBy: 'startTime',
      // 除外分を見越して多めに取り、絞り込んでから limit 件に切る
      maxResults: Math.max(limit * 2, FETCH_MARGIN),
      fields: 'items(id,summary,location,colorId,htmlLink,start,end,status,visibility)',
    })

    return (res.data.items ?? [])
      .map(toUpcomingEvent)
      .filter((event): event is UpcomingEvent => event !== null)
      .slice(0, limit)
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
    const events = await fetchUpcomingEvents(getDefaultCalendarId(), limit)
    return { ok: true, events }
  } catch (error) {
    console.error('[upcoming-events] 取得に失敗しました:', error)
    return { ok: false, error: errorMessage(error) }
  }
}
