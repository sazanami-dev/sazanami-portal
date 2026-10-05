import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canManageUploadTemplates, canUploadFiles } from '@/lib/members/permissions'
import { createTemplate, listTemplates, validateSegments } from '@/lib/drive/templates'

export async function GET() {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !canUploadFiles(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // 管理権限がある人は全件、それ以外（一般アップロード画面）はアクティブかつ manager専用以外のみ
  const canManage = canManageUploadTemplates(ctx.role)
  const templates = await listTemplates({
    activeOnly: !canManage,
    includeManagerOnly: canManage,
  })
  return NextResponse.json({ templates, canManage })
}

export async function POST(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !ctx.userId || !canManageUploadTemplates(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { name, description, baseFolderId, segments, filenameFormat, isActive, managerOnly } = body as {
    name?: string
    description?: string | null
    baseFolderId?: string
    segments?: unknown
    filenameFormat?: string | null
    isActive?: boolean
    managerOnly?: boolean
  }

  if (!name?.trim() || !baseFolderId?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const validSegments = validateSegments(segments)
  if (!validSegments) {
    return NextResponse.json({ error: 'invalid_segments' }, { status: 400 })
  }

  const template = await createTemplate({
    name: name.trim(),
    description: description ?? null,
    baseFolderId: baseFolderId.trim(),
    segments: validSegments,
    filenameFormat: filenameFormat?.trim() || null,
    isActive: isActive ?? true,
    managerOnly: managerOnly ?? false,
    createdBy: ctx.userId,
  })

  if (!template) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }
  return NextResponse.json({ template }, { status: 201 })
}
