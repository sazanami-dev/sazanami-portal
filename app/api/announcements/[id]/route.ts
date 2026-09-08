import { NextResponse } from 'next/server'

import { requireViewerRole } from '@/lib/members/route-helpers'
import {
  canManageAnnouncements,
  canViewAnnouncements,
} from '@/lib/announcements/permissions'
import {
  deleteDraftAnnouncement,
  getAnnouncement,
  revalidateAnnouncements,
  updateAnnouncement,
  type UpdateAnnouncementInput,
} from '@/lib/announcements/service'
import {
  optionalBoolean,
  validateCategory,
  validateContent,
  validatePublishAt,
  validateTitle,
  validateUpdateStatus,
} from '@/lib/announcements/validation'

type RouteContext = { params: Promise<{ id: string }> }

/** 1 件取得。一般ユーザーは公開済み・公開日時到来済みのもののみ */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!canViewAnnouncements(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const announcement = await getAnnouncement(id, {
    viewerCanManage: canManageAnnouncements(ctx.role),
  })
  if (!announcement) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({ announcement })
}

/** 更新（本文編集・カテゴリ変更・ピン留め・アーカイブ/解除・予約日時変更）。manager 以上のみ */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!canManageAnnouncements(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const existing = await getAnnouncement(id, { viewerCanManage: true })
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { title, content, status, category, isImportant, isPinned, publishAt } =
    body as Record<string, unknown>

  const patch: UpdateAnnouncementInput = {}

  if (title !== undefined) {
    const result = validateTitle(title)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    patch.title = result.value
  }
  if (content !== undefined) {
    const result = validateContent(content)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    patch.content = result.value
  }
  if (status !== undefined) {
    const result = validateUpdateStatus(status)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    patch.status = result.value
  }
  if (category !== undefined) {
    const result = validateCategory(category)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    patch.category = result.value
  }
  if (publishAt !== undefined) {
    const result = validatePublishAt(publishAt)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    patch.publishAt = result.value
  }

  const important = optionalBoolean(isImportant)
  if (important !== undefined) patch.isImportant = important
  const pinned = optionalBoolean(isPinned)
  if (pinned !== undefined) patch.isPinned = pinned

  const announcement = await updateAnnouncement(id, patch)
  if (!announcement) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  revalidateAnnouncements()
  return NextResponse.json({ announcement })
}

/** 論理削除。設計どおり下書きのみ削除できる。manager 以上のみ */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!canManageAnnouncements(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const existing = await getAnnouncement(id, { viewerCanManage: true })
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (existing.status !== 'draft') {
    // 公開済み・アーカイブ済みは削除せず、アーカイブ運用にする
    return NextResponse.json({ error: 'not_deletable' }, { status: 409 })
  }

  const deleted = await deleteDraftAnnouncement(id)
  if (!deleted) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  revalidateAnnouncements()
  return NextResponse.json({ ok: true })
}
