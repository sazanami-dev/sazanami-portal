import { google, drive_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

// ==============================
// 型
// ==============================

export type StaticSegment = { type: 'static'; value: string }
export type DynamicSegment = {
  type: 'dynamic'
  token: 'month' // 将来 year/date/text を追加可能
  format?: string // 例: 'YYYY年MM月'
  default?: 'current'
}
export type TemplateSegment = StaticSegment | DynamicSegment

export type ResolveParams = {
  // 'YYYY-MM' 形式。未指定なら今月。
  month?: string
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

// ==============================
// OAuth / Drive クライアント
// ==============================

export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('server_config_missing')
  }
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  return oAuth2Client
}

export function getDriveClient(): {
  drive: drive_v3.Drive
  auth: OAuth2Client
} {
  const auth = getOAuthClient()
  const drive = google.drive({ version: 'v3', auth })
  return { drive, auth }
}

// ==============================
// フォルダ解決
// ==============================

/** parent 直下から name のフォルダを探し、無ければ作成して folderId を返す */
export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
): Promise<string> {
  const escaped = name.replace(/'/g, "\\'")
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${escaped}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 1,
  })
  const existing = res.data.files?.[0]
  if (existing?.id) return existing.id

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  })
  if (!created.data.id) throw new Error('folder_create_failed')
  return created.data.id
}

// ==============================
// セグメント / 日付フォーマット
// ==============================

/** 'YYYY-MM' をパース。不正/未指定なら今月。 */
function parseMonth(month?: string): { year: number; month: number } {
  if (month) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(month)
    if (m) {
      const y = Number(m[1])
      const mo = Number(m[2])
      if (mo >= 1 && mo <= 12) return { year: y, month: mo }
    }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 'YYYY年MM月' のようなフォーマット文字列に年月を当てはめる */
function formatMonth(format: string | undefined, ym: { year: number; month: number }): string {
  const f = format && format.trim() ? format : 'YYYY年MM月'
  return f
    .replace(/YYYY/g, String(ym.year))
    .replace(/MM/g, pad2(ym.month))
    .replace(/M/g, String(ym.month))
}

/** Drive 名に使えない文字（パス区切り）を置換する */
function sanitizeName(name: string): string {
  return name.replace(/[\\/]/g, '_').trim()
}

/** セグメント列 → フォルダ名文字列配列 */
export function resolveSegmentNames(
  segments: TemplateSegment[],
  params: ResolveParams
): string[] {
  const ym = parseMonth(params.month)
  return segments.map((seg) => {
    if (seg.type === 'static') return sanitizeName(seg.value)
    switch (seg.token) {
      case 'month':
        return sanitizeName(formatMonth(seg.format, ym))
      default:
        throw new Error(`unknown_segment_token`)
    }
  })
}

export type Template = {
  baseFolderId: string
  segments: TemplateSegment[]
  filenameFormat: string | null
}

/**
 * テンプレートのフォルダパスを解決する。
 * create=true: 階層を辿りつつ無ければ作成し folderId を返す。
 * create=false: 表示用にパス文字列のみ組み立てる（実フォルダは作成しない）。
 */
export async function resolveTemplatePath(
  drive: drive_v3.Drive,
  template: Template,
  params: ResolveParams,
  options: { create: boolean }
): Promise<{ folderId: string | null; displayPath: string }> {
  const names = resolveSegmentNames(template.segments, params)
  const displayPath = names.join(' / ')

  if (!options.create) {
    return { folderId: null, displayPath }
  }

  let parentId = template.baseFolderId
  for (const name of names) {
    parentId = await findOrCreateFolder(drive, parentId, name)
  }
  return { folderId: parentId, displayPath }
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

  const ym = parseMonth(params.month)
  const now = new Date()
  const dateStr = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`
  const datetimeStr = `${dateStr}${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`

  const tokens: Record<string, string> = {
    original: base,
    ext,
    month: `${ym.year}${pad2(ym.month)}`,
    date: dateStr,
    datetime: datetimeStr,
    name: uploader?.name ?? '',
    name_kana: uploader?.nameKana ?? '',
    student_id: uploader?.studentId ?? '',
    class_name: uploader?.className ?? '',
    attendance_number:
      uploader?.attendanceNumber != null ? String(uploader.attendanceNumber) : '',
    email: uploader?.email ?? '',
    role: uploader?.role ?? '',
    graduation_year:
      uploader?.expectedGraduationYear != null
        ? String(uploader.expectedGraduationYear)
        : '',
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
