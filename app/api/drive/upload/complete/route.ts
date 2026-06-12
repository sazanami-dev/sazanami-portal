import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canUploadFiles } from '@/lib/members/permissions'
import { completeUploadLog, failUploadLog } from '@/lib/drive/upload-logs'

// ブラウザ→Google 直送のため、サーバーは完了/失敗通知でログを確定する。
export async function POST(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !canUploadFiles(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { logId, status, driveFileId, webViewLink, sizeBytes, error } = body as {
    logId?: string
    status?: 'completed' | 'failed'
    driveFileId?: string
    webViewLink?: string
    sizeBytes?: number
    error?: string
  }

  if (!logId || (status !== 'completed' && status !== 'failed')) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (status === 'completed') {
    await completeUploadLog(logId, {
      driveFileId: driveFileId ?? null,
      webViewLink: webViewLink ?? null,
      sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
    })
  } else {
    await failUploadLog(logId, error || 'upload_failed')
  }

  return NextResponse.json({ ok: true })
}
