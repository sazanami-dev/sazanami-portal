import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canUploadFiles, canManageUploadTemplates } from '@/lib/members/permissions'
import { createAdminClient } from '@/lib/supabase/server'
import { getTemplateById } from '@/lib/drive/templates'
import { createUploadLog } from '@/lib/drive/upload-logs'
import {
  getDriveClient,
  resolveTemplatePath,
  resolveFileName,
  type UploaderInfo,
} from '@/lib/drive/client'

export const runtime = 'nodejs'

// アップロード可能な最大サイズ（バイト）。0 / 未設定なら無制限。
const MAX_BYTES = Number(process.env.DRIVE_UPLOAD_MAX_BYTES ?? 0)

export async function POST(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !ctx.userId || !canUploadFiles(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { templateId, value, month, fileName, mimeType, fileSize } = body as {
    templateId?: string
    value?: string
    month?: string
    fileName?: string
    mimeType?: string
    fileSize?: number
  }

  if (!templateId || !fileName?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (MAX_BYTES > 0 && typeof fileSize === 'number' && fileSize > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 })
  }

  const template = await getTemplateById(templateId)
  if (!template || !template.isActive) {
    return NextResponse.json({ error: 'template_not_found' }, { status: 404 })
  }
  // manager 専用テンプレートは manager 以上のみアップロード可能
  if (template.managerOnly && !canManageUploadTemplates(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // アップロード者情報（ファイル名トークン展開に使用）
  const admin = createAdminClient()
  const { data: userRow } = await admin
    .from('users')
    .select('name, name_kana, student_id, class_name, attendance_number, email, role, expected_graduation_year')
    .eq('id', ctx.userId)
    .maybeSingle()

  const uploader: UploaderInfo = {
    name: userRow?.name,
    nameKana: userRow?.name_kana,
    studentId: userRow?.student_id,
    className: userRow?.class_name,
    attendanceNumber: userRow?.attendance_number,
    email: userRow?.email,
    role: userRow?.role,
    expectedGraduationYear: userRow?.expected_graduation_year,
  }

  const params = { value: value || month || undefined }
  const finalFileName = resolveFileName(template.filenameFormat, {
    originalName: fileName,
    params,
    uploader,
  })

  // 保存先フォルダを確定（無い階層は自動作成）。アップロードは公式アカウント名義。
  let drive, auth
  try {
    ;({ drive, auth } = getDriveClient())
  } catch {
    return NextResponse.json({ error: 'server_config_missing' }, { status: 500 })
  }

  let folderId: string | null
  let displayPath: string
  try {
    const resolved = await resolveTemplatePath(drive, template, params, { create: true })
    folderId = resolved.folderId
    displayPath = resolved.displayPath
  } catch (e: unknown) {
    console.error('[drive/upload/session] resolve path failed:', (e as Error)?.message)
    return NextResponse.json({ error: 'folder_resolve_failed' }, { status: 500 })
  }
  if (!folderId) {
    return NextResponse.json({ error: 'folder_resolve_failed' }, { status: 500 })
  }

  // pending ログ作成
  const logId = await createUploadLog({
    templateId: template.id,
    userId: ctx.userId,
    fileName: finalFileName,
    originalName: fileName,
    folderId,
    folderPath: displayPath,
    mimeType: mimeType ?? null,
    sizeBytes: typeof fileSize === 'number' ? fileSize : null,
  })

  // 公式アカウントのアクセストークンで resumable セッションを開始
  let accessToken: string | null | undefined
  try {
    const tokenRes = await auth.getAccessToken()
    accessToken = tokenRes.token
  } catch (e: unknown) {
    console.error('[drive/upload/session] getAccessToken failed:', (e as Error)?.message)
  }
  if (!accessToken) {
    return NextResponse.json({ error: 'auth_failed' }, { status: 500 })
  }

  // ブラウザが直接 PUT するため、セッション開始時に Origin を渡しておく。
  // これにより Google が後続の PUT 応答に CORS ヘッダー（Access-Control-Allow-Origin）を付与する。
  const origin = request.headers.get('origin') ?? new URL(request.url).origin

  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        Origin: origin,
        ...(mimeType ? { 'X-Upload-Content-Type': mimeType } : {}),
        ...(typeof fileSize === 'number' ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
      },
      body: JSON.stringify({ name: finalFileName, parents: [folderId] }),
    }
  )

  if (!initRes.ok) {
    const text = await initRes.text().catch(() => '')
    console.error('[drive/upload/session] resumable init failed:', initRes.status, text)
    return NextResponse.json({ error: 'session_init_failed' }, { status: 500 })
  }

  const sessionUrl = initRes.headers.get('location')
  if (!sessionUrl) {
    return NextResponse.json({ error: 'session_init_failed' }, { status: 500 })
  }

  return NextResponse.json({ sessionUrl, folderPath: displayPath, finalFileName, logId })
}
