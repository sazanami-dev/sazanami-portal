import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canRunAnnualRollover } from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'

const TARGET_ROLES = ['member', 'manager'] as const

export async function POST(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!canRunAnnualRollover(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'invalid_ids' }, { status: 400 })
  }
  const normalizedIds = [...new Set(ids.map((v) => String(v)).filter(Boolean))]
  if (normalizedIds.length === 0) {
    return NextResponse.json({ error: 'invalid_ids' }, { status: 400 })
  }

  const admin = createAdminClient()
  const currentYear = new Date().getFullYear()

  const { data: rows, error: fetchErr } = await admin
    .from('users')
    .select('id, role, status, expected_graduation_year')
    .in('id', normalizedIds)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const deletableIds = (rows ?? [])
    .filter((r) => TARGET_ROLES.includes(String(r.role) as (typeof TARGET_ROLES)[number]))
    .filter((r) => ['active', 'renewing'].includes(String(r.status)))
    .filter(
      (r) =>
        r.expected_graduation_year != null &&
        Number(r.expected_graduation_year) <= currentYear
    )
    .map((r) => String(r.id))

  const failedIds: string[] = []
  for (const id of deletableIds) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) failedIds.push(id)
  }

  const deletedIds = deletableIds.filter((id) => !failedIds.includes(id))
  return NextResponse.json({
    ok: true,
    deletedIds,
    failedIds,
    skippedIds: normalizedIds.filter((id) => !deletableIds.includes(id)),
  })
}
