import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { createAdminClient } from '@/lib/supabase/server'
import {
  canCreateOfficialLink,
  canCreateUserLink,
  OFFICIAL_LINK_NAMESPACE,
} from '@/lib/links/permissions'
import { createLink, listLinks } from '@/lib/links/service'
import { validateSlug, validateTargetUrl } from '@/lib/links/slug'

export async function GET() {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const isAdmin = ctx.role === 'admin' || ctx.role === 'developer'
  const links = await listLinks({ createdBy: ctx.userId, adminView: isAdmin })
  return NextResponse.json({ links })
}

export async function POST(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (!canCreateUserLink(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { namespace, slug, slugLength, title, targetUrl, password, inCollection } = body as {
    namespace?: string
    slug?: string
    slugLength?: number
    title?: string
    targetUrl?: string
    password?: string
    inCollection?: boolean
  }

  if (!namespace || !targetUrl) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // 公式リンク作成権限チェック
  if (namespace === OFFICIAL_LINK_NAMESPACE) {
    if (!canCreateOfficialLink(ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  } else {
    // ユーザーリンク: namespace は自分の studentId のみ許可
    const admin = createAdminClient()
    const { data: userRow } = await admin
      .from('users')
      .select('student_id')
      .eq('id', ctx.userId)
      .maybeSingle()

    if (!userRow?.student_id || userRow.student_id !== namespace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  if (slug && !validateSlug(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }
  if (targetUrl && !validateTargetUrl(targetUrl)) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }
  const link = await createLink({
    namespace,
    slug,
    slugLength,
    title,
    targetUrl,
    password,
    inCollection,
    createdBy: ctx.userId,
  })

  if (link === 'duplicate') {
    return NextResponse.json({ error: 'duplicate_slug' }, { status: 409 })
  }
  if (!link) {
    return NextResponse.json({ error: 'create_failed' }, { status: 409 })
  }

  return NextResponse.json({ link }, { status: 201 })
}
