import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isItSchoolEmail } from '@/lib/members/email'
import { canAssignRole, canChangeRoles, type AppRole } from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id: targetId } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const newRole = (body as { role?: string })?.role as AppRole | undefined
  if (!newRole) {
    return NextResponse.json({ error: 'role_required' }, { status: 400 })
  }

  const validRoles: AppRole[] = [
    'admin',
    'developer',
    'manager',
    'member',
    'guest',
  ]
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: target, error: te } = await admin
    .from('users')
    .select('id, role, email')
    .eq('id', targetId)
    .maybeSingle()

  if (te || !target) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const targetEmail = String(target.email)
  const currentRole = target.role as AppRole

  // manager: member → manager または manager → member（いずれも対象は it メール、自分自身は不可）
  if (ctx.role === 'manager') {
    if (newRole === 'manager') {
      if (currentRole !== 'member') {
        return NextResponse.json({ error: 'target_must_be_member' }, { status: 400 })
      }
      if (!isItSchoolEmail(targetEmail)) {
        return NextResponse.json({ error: 'target_must_be_it_email' }, { status: 400 })
      }
    } else if (newRole === 'member') {
      if (currentRole !== 'manager') {
        return NextResponse.json({ error: 'target_must_be_manager' }, { status: 400 })
      }
      if (targetId === ctx.userId) {
        return NextResponse.json({ error: 'cannot_demote_self' }, { status: 400 })
      }
      if (!isItSchoolEmail(targetEmail)) {
        return NextResponse.json({ error: 'target_must_be_it_email' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'manager_can_only_promote_or_demote' }, { status: 403 })
    }
  } else if (canChangeRoles(ctx.role)) {
    if (!canAssignRole(ctx.role, newRole)) {
      return NextResponse.json({ error: 'cannot_assign_role' }, { status: 403 })
    }
    if (targetId === ctx.userId) {
      return NextResponse.json({ error: 'cannot_change_own_role' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await admin
    .from('users')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
