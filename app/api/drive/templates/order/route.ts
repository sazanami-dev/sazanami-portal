import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canManageUploadTemplates } from '@/lib/members/permissions'
import { reorderTemplates } from '@/lib/drive/templates'

export async function PUT(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !canManageUploadTemplates(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const ids = (body as { ids?: unknown } | null)?.ids
  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === 'string') ||
    new Set(ids).size !== ids.length
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const ok = await reorderTemplates(ids)
  if (!ok) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
