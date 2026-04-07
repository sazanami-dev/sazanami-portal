import { createAdminClient } from '@/lib/supabase/server'
import { isItSchoolEmail } from '@/lib/members/email'
import type { AppRole } from '@/lib/members/permissions'

export type MemberSummaryRow = {
  id: string
  class_name: string | null
  name: string
}

export type MemberFullRow = {
  id: string
  role: string
  email: string
  student_id: string | null
  class_name: string | null
  attendance_number: number | null
  name: string
  name_kana: string
  expected_graduation_year: number | null
  status: string
  created_at: string
  updated_at: string
}

function mapFullRow(r: Record<string, unknown>): MemberFullRow {
  return {
    id: String(r.id),
    role: String(r.role),
    email: String(r.email),
    student_id: r.student_id != null ? String(r.student_id) : null,
    class_name: r.class_name != null ? String(r.class_name) : null,
    attendance_number:
      r.attendance_number != null ? Number(r.attendance_number) : null,
    name: String(r.name),
    name_kana: String(r.name_kana),
    expected_graduation_year:
      r.expected_graduation_year != null
        ? Number(r.expected_graduation_year)
        : null,
    status: String(r.status),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }
}

export async function getViewerRole(userId: string): Promise<AppRole | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data.role as AppRole
}

export async function fetchMembersForViewer(viewerId: string): Promise<
  | { ok: true; viewerRole: AppRole; members: MemberSummaryRow[] | MemberFullRow[] }
  | { ok: false; error: string }
> {
  const admin = createAdminClient()
  const { data: viewer, error: ve } = await admin
    .from('users')
    .select('role')
    .eq('id', viewerId)
    .maybeSingle()

  if (ve || !viewer) {
    return { ok: false, error: 'not_registered' }
  }

  const viewerRole = viewer.role as AppRole
  if (viewerRole === 'guest') {
    return { ok: false, error: 'forbidden' }
  }

  const { data: rows, error } = await admin.from('users').select(
    'id, role, email, student_id, class_name, attendance_number, name, name_kana, expected_graduation_year, status, created_at, updated_at'
  )

  if (error || !rows) {
    return { ok: false, error: error?.message ?? 'fetch_failed' }
  }

  const sorted = [...rows].sort((a, b) => {
    const ca = String(a.class_name ?? '')
    const cb = String(b.class_name ?? '')
    if (ca !== cb) return ca.localeCompare(cb, 'ja')
    return String(a.name).localeCompare(String(b.name), 'ja')
  })

  if (viewerRole === 'member') {
    const filtered = sorted.filter((r) => isItSchoolEmail(String(r.email)))
    const summaries: MemberSummaryRow[] = filtered.map((r) => ({
      id: String(r.id),
      class_name: r.class_name != null ? String(r.class_name) : null,
      name: String(r.name),
    }))
    return { ok: true, viewerRole, members: summaries }
  }

  const full: MemberFullRow[] = sorted.map((r) =>
    mapFullRow(r as Record<string, unknown>)
  )
  return { ok: true, viewerRole, members: full }
}

export type MemberExportCsvRow = {
  student_id: string | null
  class_name: string | null
  attendance_number: number | null
  name: string
}

/** メンバー CSV エクスポート用（列は固定） */
export function membersToExportCsv(rows: MemberExportCsvRow[]): string {
  const columns: { key: keyof MemberExportCsvRow; header: string }[] = [
    { key: 'student_id', header: '学籍番号' },
    { key: 'class_name', header: 'クラス' },
    { key: 'attendance_number', header: '出席番号' },
    { key: 'name', header: '名前' },
  ]
  const escape = (v: string | number | null) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    columns.map((c) => escape(c.header)).join(','),
    ...rows.map((r) =>
      columns.map((c) => escape(r[c.key])).join(','),
    ),
  ]
  return lines.join('\n')
}
