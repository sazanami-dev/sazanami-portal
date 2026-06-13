import { google, drive_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { resolveSegmentNames, type ResolveParams, type Template } from './segments'

// 純粋なセグメント/フォーマット処理は segments.ts に分離（クライアントからも import 可能）。
// サーバ側コードの利便性のためここから再エクスポートする。
export * from './segments'

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
// フォルダ解決（Drive API）
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
