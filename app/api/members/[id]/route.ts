import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  canDeleteUsers,
  canEditUsers,
  canManagePendingMembers,
} from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const { id: targetId } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (!canEditUsers(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const {
    class_name,
    attendance_number,
    name,
    name_kana,
    student_id,
    expected_graduation_year,
    status,
  } = body as {
    class_name?: string | null
    attendance_number?: number | null
    name?: string
    name_kana?: string
    student_id?: string | null
    expected_graduation_year?: number | null
    status?: 'pending' | 'active' | 'renewing'
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (class_name !== undefined) patch.class_name = class_name
  if (attendance_number !== undefined) patch.attendance_number = attendance_number
  if (name !== undefined) patch.name = name
  if (name_kana !== undefined) patch.name_kana = name_kana
  if (student_id !== undefined) patch.student_id = student_id
  if (expected_graduation_year !== undefined) {
    patch.expected_graduation_year = expected_graduation_year
  }
  if (status !== undefined) patch.status = status

  const meaningfulKeys = Object.keys(patch).filter((k) => k !== 'updated_at')
  if (meaningfulKeys.length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('users').update(patch).eq('id', targetId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: targetId } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: targetRow, error: targetErr } = await admin
    .from('users')
    .select('status')
    .eq('id', targetId)
    .maybeSingle()

  if (targetErr || !targetRow) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const canDelete =
    canDeleteUsers(ctx.role) ||
    (canManagePendingMembers(ctx.role) && targetRow.status === 'pending')

  if (!canDelete) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (targetId === ctx.userId) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 })
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(targetId)
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
