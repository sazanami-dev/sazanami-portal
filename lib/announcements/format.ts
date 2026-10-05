// お知らせの日時表示。カレンダー側と同じく JST 固定で表示する。
const TIME_ZONE = 'Asia/Tokyo'

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  // hour12 を併記すると hourCycle が無視されるため指定しない
  hourCycle: 'h23',
})

/** 「2026/09/14 19:00」形式にする */
export function formatAnnouncementDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // ja-JP は 'YYYY/MM/DD HH:mm' を返すが、環境によって区切りが揺れるため整える
  return dateTimeFormatter.format(date).replace(/\s+/g, ' ').trim()
}

/**
 * Markdown 本文から一覧用のプレビュー文字列を作る。
 * 記法がそのまま出ると読みづらいので、代表的な記号だけ落とす。
 */
export function toPlainTextPreview(markdown: string, maxLength = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

/**
 * ISO 文字列を `<input type="datetime-local">` の値に変換する。
 * 入力欄は閲覧者の端末のタイムゾーンで扱う。
 */
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

/** `<input type="datetime-local">` の値を ISO 文字列に変換する */
export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
