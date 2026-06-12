import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canManageUploadTemplates } from '@/lib/members/permissions'
import { deleteTemplate, updateTemplate, validateSegments } from '@/lib/drive/templates'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !canManageUploadTemplates(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { name, description, baseFolderId, segments, filenameFormat, isActive } = body as {
    name?: string
    description?: string | null
    baseFolderId?: string
    segments?: unknown
    filenameFormat?: string | null
    isActive?: boolean
  }

  const patch: Parameters<typeof updateTemplate>[1] = {}
  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    patch.name = name.trim()
  }
  if (description !== undefined) patch.description = description ?? null
  if (baseFolderId !== undefined) {
    if (!baseFolderId.trim()) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    patch.baseFolderId = baseFolderId.trim()
  }
  if (segments !== undefined) {
    const valid = validateSegments(segments)
    if (!valid) return NextResponse.json({ error: 'invalid_segments' }, { status: 400 })
    patch.segments = valid
  }
  if (filenameFormat !== undefined) patch.filenameFormat = filenameFormat?.trim() || null
  if (isActive !== undefined) patch.isActive = isActive

  const ok = await updateTemplate(id, patch)
  if (!ok) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !canManageUploadTemplates(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const ok = await deleteTemplate(id)
  if (!ok) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
