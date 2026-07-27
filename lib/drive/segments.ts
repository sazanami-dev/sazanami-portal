// googleapis に依存しない純粋なセグメント/フォーマット処理。
// クライアントコンポーネントからも安全に import できる。

// ==============================
// 型
// ==============================

/** 動的フォルダ/ファイル名で使える日時の粒度 */
export type DynamicToken = 'year' | 'month' | 'date' | 'datetime'

/** 粒度ごとの既定フォーマット */
export const DEFAULT_DYNAMIC_FORMAT: Record<DynamicToken, string> = {
  year: 'YYYY',
  month: 'YYYYMM',
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD_HH-mm',
}

// 細かい順（後ろほど細かい）
const GRANULARITY_ORDER: DynamicToken[] = ['year', 'month', 'date', 'datetime']

export type StaticSegment = { type: 'static'; value: string }
export type DynamicSegment = {
  type: 'dynamic'
  token: DynamicToken
  format?: string // 例: 'YYYYMM'、'YYYY-MM-DD_HH-mm' など
  default?: 'current'
}
export type TemplateSegment = StaticSegment | DynamicSegment

export type ResolveParams = {
  // ユーザーが選択した日時。'YYYY' / 'YYYY-MM' / 'YYYY-MM-DD' / 'YYYY-MM-DDTHH:mm' を許容。未指定なら現在。
  value?: string
}

export type UploaderInfo = {
  name?: string | null
  nameKana?: string | null
  studentId?: string | null
  className?: string | null
  attendanceNumber?: number | null
  email?: string | null
  role?: string | null
  expectedGraduationYear?: number | null
}

export type Template = {
  baseFolderId: string
  segments: TemplateSegment[]
  filenameFormat: string | null
}

/** フォーマット文字列に含まれるトークンから必要な入力粒度を判定する */
export function granularityFromFormat(format: string): DynamicToken {
  if (/HH|mm|ss|H|m|s/.test(format)) return 'datetime'
  if (/DD|D/.test(format)) return 'date'
  if (/MM|M/.test(format)) return 'month'
  return 'year'
}

/**
 * テンプレートの動的セグメントのうち、フォーマットから判定した最も細かい粒度を返す。
 * （アップロード画面の入力種別決定用。無ければ null）
 */
export function finestDynamicGranularity(segments: TemplateSegment[]): DynamicToken | null {
  let best = -1
  for (const seg of segments) {
    if (seg.type === 'dynamic') {
      const fmt = seg.format && seg.format.trim() ? seg.format : DEFAULT_DYNAMIC_FORMAT[seg.token]
      const idx = GRANULARITY_ORDER.indexOf(granularityFromFormat(fmt))
      if (idx > best) best = idx
    }
  }
  return best >= 0 ? GRANULARITY_ORDER[best] : null
}

// ==============================
// 日付フォーマット
// ==============================

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * ユーザー選択値（'YYYY' / 'YYYY-MM' / 'YYYY-MM-DD' / 'YYYY-MM-DDTHH:mm[:ss]'）を Date にパースする。
 * 不正/未指定なら現在時刻。粒度より細かい部分は 1日/0時で補完する。
 */
function parseDateValue(value?: string): Date {
  if (value) {
    const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?(?:[T ](\d{1,2}):(\d{1,2}))?(?::(\d{1,2}))?$/.exec(
      value.trim()
    )
    if (m) {
      const year = Number(m[1])
      const month = m[2] ? Number(m[2]) : 1
      const day = m[3] ? Number(m[3]) : 1
      const hour = m[4] ? Number(m[4]) : 0
      const min = m[5] ? Number(m[5]) : 0
      const sec = m[6] ? Number(m[6]) : 0
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day, hour, min, sec)
      }
    }
  }
  return new Date()
}

/**
 * 日時フォーマット文字列にトークンを当てはめる（YYYY/MM/M/DD/D/HH/H/mm/m/ss/s）。
 * 単一passの置換のため二重置換は起きない（長いトークンを先に並べる）。
 */
function formatDatePattern(format: string, d: Date): string {
  const values: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad2(d.getMonth() + 1),
    DD: pad2(d.getDate()),
    HH: pad2(d.getHours()),
    mm: pad2(d.getMinutes()),
    ss: pad2(d.getSeconds()),
    M: String(d.getMonth() + 1),
    D: String(d.getDate()),
    H: String(d.getHours()),
    m: String(d.getMinutes()),
    s: String(d.getSeconds()),
  }
  return format.replace(/YYYY|MM|DD|HH|mm|ss|M|D|H|m|s/g, (t) => values[t] ?? t)
}

/** Drive 名に使えない文字（パス区切り）を置換する */
export function sanitizeName(name: string): string {
  return name.replace(/[\\/]/g, '_').trim()
}

/** セグメント列 → フォルダ名文字列配列 */
export function resolveSegmentNames(
  segments: TemplateSegment[],
  params: ResolveParams
): string[] {
  const date = parseDateValue(params.value)
  return segments.map((seg) => {
    if (seg.type === 'static') return sanitizeName(seg.value)
    if (seg.type === 'dynamic') {
      const fmt = seg.format && seg.format.trim() ? seg.format : DEFAULT_DYNAMIC_FORMAT[seg.token]
      return sanitizeName(formatDatePattern(fmt, date))
    }
    throw new Error('unknown_segment_token')
  })
}

// ==============================
// ファイル名解決
// ==============================

/** 'a.tar.gz' → { base: 'a.tar', ext: 'gz' } / 拡張子なしは ext='' */
function splitExt(fileName: string): { base: string; ext: string } {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0) return { base: fileName, ext: '' }
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot + 1) }
}

/**
 * filename_format のトークンを置換し最終ファイル名を生成。
 * format が null/空なら originalName をそのまま返す。
 */
export function resolveFileName(
  format: string | null | undefined,
  args: {
    originalName: string
    params: ResolveParams
    uploader?: UploaderInfo
  }
): string {
  const { originalName, params, uploader } = args
  const { base, ext } = splitExt(originalName)

  if (!format || !format.trim()) {
    return sanitizeName(originalName)
  }

  // 選択値（フォルダの対象期間）。{year}/{month} はこれを使う。
  const selected = parseDateValue(params.value)
  // 実際のアップロード時刻。{date}/{time}/{datetime} はこれを使う。
  const now = new Date()
  const dateStr = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`
  const timeStr = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
  const datetimeStr = `${dateStr}${timeStr}`

  const tokens: Record<string, string> = {
    original: base,
    ext,
    year: String(selected.getFullYear()),
    month: `${selected.getFullYear()}${pad2(selected.getMonth() + 1)}`,
    date: dateStr,
    time: timeStr,
    datetime: datetimeStr,
    // 名前は半角/全角の空白を除去する（例: '山田 太郎' → '山田太郎'）
    name: (uploader?.name ?? '').replace(/[\s　]+/g, ''),
    name_kana: (uploader?.nameKana ?? '').replace(/[\s　]+/g, ''),
    student_id: uploader?.studentId ?? '',
    class_name: uploader?.className ?? '',
    // 出席番号は常にゼロ埋め2桁に統一する（例: 5 → '05'）
    attendance_number:
      uploader?.attendanceNumber != null
        ? pad2(uploader.attendanceNumber)
        : '',
    email: uploader?.email ?? '',
    role: uploader?.role ?? '',
    graduation_year:
      uploader?.expectedGraduationYear != null ? String(uploader.expectedGraduationYear) : '',
  }

  let result = format.replace(/\{([a-z_]+)\}/g, (match, key: string) => {
    return key in tokens ? tokens[key] : match
  })

  // 拡張子を保持（format に {ext} が含まれていない場合は末尾に付与）
  if (ext && !/\{ext\}/.test(format) && !result.endsWith(`.${ext}`)) {
    result = `${result}.${ext}`
  }

  return sanitizeName(result)
}
