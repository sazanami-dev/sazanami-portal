import type { UpcomingEvent } from './upcoming'

// カレンダーの運用タイムゾーン。終日イベントの 'YYYY-MM-DD' もこの暦日として扱う。
const TIME_ZONE = 'Asia/Tokyo'

// en-CA は 'YYYY-MM-DD' 形式になるため、暦日キーの生成に使う
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dateLabelFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
})

const timeLabelFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** JST での暦日 'YYYY-MM-DD' を返す */
function toDateKey(date: Date): string {
  return dateKeyFormatter.format(date)
}

/** 'YYYY-MM-DD' を JST 0時の Date にする */
function fromDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+09:00`)
}

/**
 * イベント開始の暦日キー。
 * 終日イベントの start は既に JST の暦日なので変換しない。
 */
function startDateKey(event: UpcomingEvent): string {
  return event.allDay ? event.start.slice(0, 10) : toDateKey(new Date(event.start))
}

/** 暦日キー同士の日数差（b - a）。両方 JST 0時なので DST の考慮は不要 */
function diffInDays(a: string, b: string): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/**
 * 「2026/09/14 (月) 19:00 - 21:00」のような表示文字列を組み立てる。
 * 終日イベントは時刻を出さず、複数日にまたがる場合のみ終了日を添える。
 */
export function formatEventDateTime(event: UpcomingEvent): string {
  const startKey = startDateKey(event)
  const dateLabel = dateLabelFormatter.format(fromDateKey(startKey))

  if (event.allDay) {
    // 終日イベントの end.date は翌日を指す排他的な値なので、1日ぶんは単日扱い
    const endKey = event.end?.slice(0, 10)
    if (endKey && diffInDays(startKey, endKey) > 1) {
      const lastKey = toDateKey(new Date(fromDateKey(endKey).getTime() - 86_400_000))
      return `${dateLabel} 〜 ${dateLabelFormatter.format(fromDateKey(lastKey))}`
    }
    return dateLabel
  }

  const startTime = timeLabelFormatter.format(new Date(event.start))
  if (!event.end) return `${dateLabel} ${startTime}`

  const end = new Date(event.end)
  const endTime = timeLabelFormatter.format(end)
  // 日をまたぐ場合は終了側にも日付を出す
  if (toDateKey(end) !== startKey) {
    return `${dateLabel} ${startTime} 〜 ${dateLabelFormatter.format(end)} ${endTime}`
  }
  return `${dateLabel} ${startTime} - ${endTime}`
}

/**
 * Google カレンダーの event colorId と実際の色の対応。
 *
 * calendar.colors.get() が返す値を写したもの。この11色は Google 側で
 * 固定されているため、描画のたびにAPIを叩かず定数として持つ。
 * app/api/calendar/add/route.ts が許可している colorId の範囲と一致する。
 */
const EVENT_COLORS: Record<string, string> = {
  '1': '#a4bdfc',
  '2': '#7ae7bf',
  '3': '#dbadff',
  '4': '#ff887c',
  '5': '#fbd75b',
  '6': '#ffb878',
  '7': '#46d6db',
  '8': '#e1e1e1',
  '9': '#5484ed',
  '10': '#51b749',
  '11': '#dc2127',
}

/**
 * colorId に対応する色を返す。
 * 未設定・未知の値なら null（呼び出し側のテーマ既定色にまかせる）。
 */
export function eventColorHex(colorId: string | null): string | null {
  if (!colorId) return null
  return EVENT_COLORS[colorId] ?? null
}
