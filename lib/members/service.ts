import { createAdminClient } from '@/lib/supabase/server'
import { isItSchoolEmail } from '@/lib/members/email'
import type { AppRole } from '@/lib/members/permissions'

export type MemberSummaryRow = {
  id: string
  class_name: string | null
  name: string
}

export type IdentityInfo = {
  username: string
  isServerJoined: boolean
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
  tos_agreed: boolean
  tech_train_agreed: boolean
  discord: IdentityInfo | null
  github: IdentityInfo | null
  created_at: string
  updated_at: string
}

function mapFullRow(r: Record<string, unknown>): Omit<MemberFullRow, 'tos_agreed' | 'tech_train_agreed' | 'discord' | 'github'> {
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
  | { ok: true; viewerRole: AppRole; members: MemberSummaryRow[] | MemberFullRow[]; memberCount: number }
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

  const memberCount = rows.filter((r) => r.role !== 'admin').length

  if (viewerRole === 'member') {
    const filtered = sorted.filter((r) => isItSchoolEmail(String(r.email)))
    const summaries: MemberSummaryRow[] = filtered.map((r) => ({
      id: String(r.id),
      class_name: r.class_name != null ? String(r.class_name) : null,
      name: String(r.name),
    }))
    return { ok: true, viewerRole, members: summaries, memberCount }
  }

  const userIds = sorted.map((r) => String(r.id))
  const { data: agreementRows, error: agreementErr } = await admin
    .from('user_agreements')
    .select('user_id, agreement_type')
    .in('user_id', userIds)

  if (agreementErr) {
    return { ok: false, error: agreementErr.message ?? 'agreement_fetch_failed' }
  }

  const agreementMap = new Map<string, { tos: boolean; tech: boolean }>()
  for (const row of agreementRows ?? []) {
    const r = row as { user_id: string; agreement_type: string }
    const prev = agreementMap.get(r.user_id) ?? { tos: false, tech: false }
    if (r.agreement_type === 'terms_of_service') prev.tos = true
    if (r.agreement_type === 'tech_train') prev.tech = true
    agreementMap.set(r.user_id, prev)
  }

  const { data: identityRows } = await admin
    .from('user_identities')
    .select('user_id, provider, username, is_server_joined')
    .in('user_id', userIds)

  const identityMap = new Map<string, { discord: IdentityInfo | null; github: IdentityInfo | null }>()
  for (const row of identityRows ?? []) {
    const r = row as { user_id: string; provider: string; username: string; is_server_joined: boolean }
    const prev = identityMap.get(r.user_id) ?? { discord: null, github: null }
    const info: IdentityInfo = { username: r.username, isServerJoined: r.is_server_joined }
    if (r.provider === 'discord') prev.discord = info
    if (r.provider === 'github') prev.github = info
    identityMap.set(r.user_id, prev)
  }

  const full: MemberFullRow[] = sorted.map((r) => {
    const base = mapFullRow(r as Record<string, unknown>)
    const a = agreementMap.get(base.id) ?? { tos: false, tech: false }
    const identity = identityMap.get(base.id) ?? { discord: null, github: null }
    return { ...base, tos_agreed: a.tos, tech_train_agreed: a.tech, ...identity }
  })
  return { ok: true, viewerRole, members: full, memberCount }
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
