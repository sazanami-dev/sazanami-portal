import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canManageLink } from '@/lib/links/permissions'
import { getLinkById, getLinkByNamespaceSlug, updateLink, deleteLink } from '@/lib/links/service'
import { validateSlug, validateTargetUrl } from '@/lib/links/slug'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const link = await getLinkById(id)
  if (!link) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!canManageLink(ctx.userId, ctx.role, { createdBy: link.createdBy, namespace: link.namespace })) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  return NextResponse.json({ link })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const link = await getLinkById(id)
  if (!link) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!canManageLink(ctx.userId, ctx.role, { createdBy: link.createdBy, namespace: link.namespace })) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { title, targetUrl, password, inCollection, slug } = body as {
    title?: string | null
    targetUrl?: string
    password?: string | null
    inCollection?: boolean
    slug?: string
  }

  if (slug !== undefined && !validateSlug(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  if (targetUrl !== undefined && !validateTargetUrl(targetUrl)) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }
  if (slug !== undefined) {
    const existing = await getLinkByNamespaceSlug(link.namespace, slug)
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'duplicate_slug' }, { status: 409 })
    }
  }

  const ok = await updateLink(id, { title, targetUrl, password, inCollection, slug })
  if (!ok) {
    return NextResponse.json({ error: 'update_failed' }, { status: 409 })
  }

  const updated = await getLinkById(id)
  return NextResponse.json({ link: updated })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const link = await getLinkById(id)
  if (!link) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!canManageLink(ctx.userId, ctx.role, { createdBy: link.createdBy, namespace: link.namespace })) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const ok = await deleteLink(id)
  if (!ok) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
