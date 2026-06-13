import { createAdminClient } from '@/lib/supabase/server'

export type UploadLog = {
  id: string
  templateId: string | null
  templateName: string | null
  userId: string | null
  uploaderName: string | null
  fileName: string
  originalName: string | null
  driveFileId: string | null
  webViewLink: string | null
  folderId: string | null
  folderPath: string | null
  mimeType: string | null
  sizeBytes: number | null
  status: string
  error: string | null
  createdAt: string
  completedAt: string | null
}

type CreateUploadLogInput = {
  templateId: string | null
  userId: string | null
  fileName: string
  originalName: string | null
  folderId: string | null
  folderPath: string | null
  mimeType: string | null
  sizeBytes: number | null
}

/** pending ログ行を作成し id を返す */
export async function createUploadLog(input: CreateUploadLogInput): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('upload_logs')
    .insert({
      template_id: input.templateId,
      user_id: input.userId,
      file_name: input.fileName,
      original_name: input.originalName,
      folder_id: input.folderId,
      folder_path: input.folderPath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error || !data) return null
  return data.id
}

/** Google Drive のファイルIDは英数字・ハイフン・アンダースコアのみ。書式外は拒否する。 */
function isValidDriveFileId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,256}$/.test(id)
}

/**
 * pending ログを完了に確定する。
 * セキュリティ: 呼び出しユーザー本人かつ pending の行のみ対象（オーナーシップ検証）。
 * web_view_link はクライアント入力を信用せず driveFileId からサーバ側で組み立てる。
 */
export async function completeUploadLog(
  id: string,
  userId: string,
  result: { driveFileId?: string | null; sizeBytes?: number | null }
): Promise<boolean> {
  const admin = createAdminClient()
  const driveFileId =
    result.driveFileId && isValidDriveFileId(result.driveFileId) ? result.driveFileId : null
  const webViewLink = driveFileId
    ? `https://drive.google.com/file/d/${driveFileId}/view`
    : null

  const { data, error } = await admin
    .from('upload_logs')
    .update({
      status: 'completed',
      drive_file_id: driveFileId,
      web_view_link: webViewLink,
      ...(result.sizeBytes != null ? { size_bytes: result.sizeBytes } : {}),
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id')
  return !error && !!data && data.length > 0
}

export async function failUploadLog(
  id: string,
  userId: string,
  message: string
): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('upload_logs')
    .update({
      status: 'failed',
      error: message.slice(0, 1000),
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id')
  return !error && !!data && data.length > 0
}

type ListLogsOptions = {
  limit?: number
  templateId?: string
  userId?: string
}

export async function listUploadLogs(options?: ListLogsOptions): Promise<UploadLog[]> {
  const admin = createAdminClient()
  let query = admin
    .from('upload_logs')
    .select(
      'id, template_id, user_id, file_name, original_name, drive_file_id, web_view_link, folder_id, folder_path, mime_type, size_bytes, status, error, created_at, completed_at, upload_templates(name), users(name)'
    )
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 200)

  if (options?.templateId) query = query.eq('template_id', options.templateId)
  if (options?.userId) query = query.eq('user_id', options.userId)

  const { data, error } = await query
  if (error || !data) return []

  return (data as unknown[]).map((r) => {
    const row = r as Record<string, unknown> & {
      upload_templates?: { name: string } | null
      users?: { name: string } | null
    }
    return {
      id: row.id as string,
      templateId: (row.template_id as string | null) ?? null,
      templateName: row.upload_templates?.name ?? null,
      userId: (row.user_id as string | null) ?? null,
      uploaderName: row.users?.name ?? null,
      fileName: row.file_name as string,
      originalName: (row.original_name as string | null) ?? null,
      driveFileId: (row.drive_file_id as string | null) ?? null,
      webViewLink: (row.web_view_link as string | null) ?? null,
      folderId: (row.folder_id as string | null) ?? null,
      folderPath: (row.folder_path as string | null) ?? null,
      mimeType: (row.mime_type as string | null) ?? null,
      sizeBytes: (row.size_bytes as number | null) ?? null,
      status: row.status as string,
      error: (row.error as string | null) ?? null,
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string | null) ?? null,
    }
  })
}
