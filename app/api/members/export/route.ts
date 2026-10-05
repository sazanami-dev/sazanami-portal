import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { hasItSixDigitPrefix } from '@/lib/members/email'
import { canExportCsv } from '@/lib/members/permissions'
import { membersToExportCsv, type MemberExportCsvRow } from '@/lib/members/service'
import { requireViewerRole } from '@/lib/members/route-helpers'

export async function GET() {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (!canExportCsv(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  /** CSV: active かつ member 以上（guest は含めない） */
  const rolesMemberAndAbove = ['member', 'manager', 'admin', 'developer'] as const

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('users')
    .select('email, student_id, class_name, attendance_number, name')
    .eq('status', 'active')
    .in('role', [...rolesMemberAndAbove])

  if (error || !rows) {
    return NextResponse.json({ error: error?.message ?? 'fetch_failed' }, { status: 500 })
  }

  const exportRows: MemberExportCsvRow[] = rows
    .filter((r) => hasItSixDigitPrefix(String(r.email ?? '')))
    .map((r) => ({
      student_id: r.student_id != null ? String(r.student_id) : null,
      class_name: r.class_name != null ? String(r.class_name) : null,
      attendance_number:
        r.attendance_number != null ? Number(r.attendance_number) : null,
      name: String(r.name),
    }))

  const csv = membersToExportCsv(exportRows)
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10)
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const filename = `members-${datePart}-${timePart}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
