import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canRunAnnualRollover } from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'

const TARGET_ROLES = ['member', 'manager'] as const

export async function POST() {
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

  const admin = createAdminClient()
  const currentYear = new Date().getFullYear()

  const { error: updateErr } = await admin
    .from('users')
    .update({ status: 'renewing', updated_at: new Date().toISOString() })
    .eq('status', 'active')
    .in('role', [...TARGET_ROLES])

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  const { data: graduateRows, error: graduateErr } = await admin
    .from('users')
    .select(
      'id, email, name, class_name, attendance_number, student_id, expected_graduation_year, status, role'
    )
    .in('role', [...TARGET_ROLES])
    .in('status', ['active', 'renewing'])
    .not('expected_graduation_year', 'is', null)
    .lte('expected_graduation_year', currentYear)
    .order('class_name', { ascending: true })
    .order('attendance_number', { ascending: true, nullsFirst: false })

  if (graduateErr) {
    return NextResponse.json({ error: graduateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    currentYear,
    graduates: (graduateRows ?? []).map((r) => ({
      id: String(r.id),
      email: String(r.email),
      name: String(r.name),
      class_name: r.class_name != null ? String(r.class_name) : null,
      attendance_number:
        r.attendance_number != null ? Number(r.attendance_number) : null,
      student_id: r.student_id != null ? String(r.student_id) : null,
      expected_graduation_year:
        r.expected_graduation_year != null
          ? Number(r.expected_graduation_year)
          : null,
      status: String(r.status),
      role: String(r.role),
    })),
  })
}
