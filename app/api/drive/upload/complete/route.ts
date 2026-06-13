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
  if (!ctx.role || !ctx.userId || !canUploadFiles(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // webViewLink はクライアントから受け取らず、driveFileId からサーバ側で生成する（XSS対策）
  const { logId, status, driveFileId, sizeBytes, error } = body as {
    logId?: string
    status?: 'completed' | 'failed'
    driveFileId?: string
    sizeBytes?: number
    error?: string
  }

  if (!logId || (status !== 'completed' && status !== 'failed')) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // 本人かつ pending のログのみ確定できる（オーナーシップ検証）
  if (status === 'completed') {
    await completeUploadLog(logId, ctx.userId, {
      driveFileId: driveFileId ?? null,
      sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
    })
  } else {
    await failUploadLog(logId, ctx.userId, error || 'upload_failed')
  }

  return NextResponse.json({ ok: true })
}
