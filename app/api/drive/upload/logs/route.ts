import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canManageUploadTemplates } from '@/lib/members/permissions'
import { listUploadLogs } from '@/lib/drive/upload-logs'

export async function GET(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !canManageUploadTemplates(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const templateId = url.searchParams.get('templateId') ?? undefined
  const userId = url.searchParams.get('userId') ?? undefined

  const logs = await listUploadLogs({ templateId, userId })
  return NextResponse.json({ logs })
}
