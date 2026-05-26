'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { isItSchoolEmail } from '@/lib/members/email'
import {
  canBulkGrantDrive,
  canChangeRoles,
  canDeleteUsers,
  canEditUsers,
  canExportCsv,
  canManagePendingMembers,
  canPromoteMemberToManager,
  canRunAnnualRollover,
  canViewFullProfiles,
  type AppRole,
} from '@/lib/members/permissions'
import type { MemberFullRow, MemberSummaryRow } from '@/lib/members/service'

const ALL_ROLES: AppRole[] = [
  'admin',
  'developer',
  'manager',
  'member',
  'guest',
]

/** admin は admin 付与不可（developer のみ）。既存 admin の表示用に admin を含める */
function selectableRoles(actor: AppRole, current: AppRole): AppRole[] {
  if (actor === 'developer') return ALL_ROLES
  const withoutAdmin = ALL_ROLES.filter((r) => r !== 'admin')
  if (current === 'admin') return [...withoutAdmin, 'admin']
  return withoutAdmin
}

type Props = {
  viewerRole: AppRole
  viewerId: string
  members: MemberSummaryRow[] | MemberFullRow[]
  driveGrantRole: string
}

const DELETE_CONFIRM_PHRASE = 'DELETE'
const ANNUAL_ROLLOVER_CONFIRM_PHRASE = 'ANNUAL'
const BULK_DELETE_CONFIRM_PHRASE = 'BULKDELETE'
type FullSortKey = 'email' | 'class'
type DeleteTarget = Pick<MemberFullRow, 'id' | 'email' | 'name'>
type AnnualGraduateRow = Pick<
  MemberFullRow,
  | 'id'
  | 'email'
  | 'name'
  | 'class_name'
  | 'attendance_number'
  | 'student_id'
  | 'expected_graduation_year'
  | 'status'
  | 'role'
>

export function MembersClient({ viewerRole, viewerId, members, driveGrantRole }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [fullSortKey, setFullSortKey] = useState<FullSortKey>('class')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editTarget, setEditTarget] = useState<MemberFullRow | null>(null)
  const [form, setForm] = useState<Partial<MemberFullRow>>({})
  const [graduates, setGraduates] = useState<AnnualGraduateRow[] | null>(null)
  const [graduateYear, setGraduateYear] = useState<number | null>(null)
  /** 削除: 1=確認 / 2=DELETE 入力 */
  const [deleteFlow, setDeleteFlow] = useState<{
    row: DeleteTarget
    step: 1 | 2
    phraseInput: string
  } | null>(null)
  /** 年度切替: 1=確認 / 2=最終入力 */
  const [annualFlow, setAnnualFlow] = useState<{
    step: 1 | 2
    phraseInput: string
  } | null>(null)
  /** 卒業対象の一括削除: 1=確認 / 2=最終入力 */
  const [bulkDeleteFlow, setBulkDeleteFlow] = useState<{
    step: 1 | 2
    phraseInput: string
  } | null>(null)
  /** Drive 一括権限付与 */
  const [driveGrantFlow, setDriveGrantFlow] = useState<{ step: 1 | 2 } | null>(null)
  const [driveGrantResult, setDriveGrantResult] = useState<{
    granted: number
    grantedEmails: string[]
    skipped: number
    skippedEmails: string[]
    failed: { email: string; error: string }[]
    total: number
  } | null>(null)
  /** Drive 一括権限剥奪 */
  const [driveRevokeFlow, setDriveRevokeFlow] = useState<boolean>(false)
  const [driveRevokeResult, setDriveRevokeResult] = useState<{
    revoked: number
    revokedEmails: string[]
    failed: { email: string }[]
    total: number
  } | null>(null)

  /** 承認・CSV・ロール変更などの単発確認 */
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { kind: 'export' }
    | { kind: 'promote'; row: MemberFullRow }
    | { kind: 'demote'; row: MemberFullRow }
    | { kind: 'role'; row: MemberFullRow; prev: AppRole; next: AppRole }
  >(null)

  const full = useMemo(
    () => (canViewFullProfiles(viewerRole) ? (members as MemberFullRow[]) : null),
    [members, viewerRole]
  )
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const summaryRows = useMemo(() => {
    if (viewerRole !== 'member') return []
    const rows = members as MemberSummaryRow[]
    const filtered = normalizedQuery
      ? rows.filter((r) =>
          [r.class_name ?? '', r.name]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : rows

    const sorted = [...filtered].sort((a, b) => {
      const classComp = String(a.class_name ?? '').localeCompare(
        String(b.class_name ?? ''),
        'ja'
      )
      if (classComp !== 0) {
        return sortOrder === 'asc' ? classComp : -classComp
      }
      const comp = String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ja')
      return sortOrder === 'asc' ? comp : -comp
    })
    return sorted
  }, [members, normalizedQuery, sortOrder, viewerRole])

  const visibleFullRows = useMemo(() => {
    if (!full) return []
    const filtered = normalizedQuery
      ? full.filter((r) =>
          [
            r.role,
            r.email,
            r.student_id ?? '',
            r.class_name ?? '',
            r.attendance_number ?? '',
            r.name,
            r.name_kana,
            r.expected_graduation_year ?? '',
            r.status,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : full

    const sorted = [...filtered].sort((a, b) => {
      let comp = 0
      if (fullSortKey === 'email') {
        comp = String(a.email ?? '').localeCompare(String(b.email ?? ''), 'ja')
      } else {
        const classComp = String(a.class_name ?? '').localeCompare(
          String(b.class_name ?? ''),
          'ja'
        )
        if (classComp !== 0) {
          comp = classComp
        } else {
          const an = a.attendance_number ?? Number.POSITIVE_INFINITY
          const bn = b.attendance_number ?? Number.POSITIVE_INFINITY
          comp = Number(an) - Number(bn)
          if (comp === 0) {
            comp = String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ja')
          }
        }
      }
      return sortOrder === 'asc' ? comp : -comp
    })
    return sorted
  }, [full, fullSortKey, normalizedQuery, sortOrder])

  const openEdit = (row: MemberFullRow) => {
    setEditTarget(row)
    setForm({ ...row })
  }

  const saveEdit = async () => {
    if (!editTarget) return
    setBusy(editTarget.id)
    try {
      const res = await fetch(`/api/members/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_name: form.class_name ?? null,
          attendance_number: form.attendance_number ?? null,
          name: form.name,
          name_kana: form.name_kana,
          student_id: form.student_id ?? null,
          expected_graduation_year: form.expected_graduation_year ?? null,
          status: form.status as MemberFullRow['status'],
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error ?? '更新に失敗しました')
        return
      }
      setEditTarget(null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const openDeleteFlow = (row: DeleteTarget) => {
    setDeleteFlow({ row, step: 1, phraseInput: '' })
  }

  const executeDelete = async () => {
    if (!deleteFlow || deleteFlow.step !== 2) return
    if (deleteFlow.phraseInput.trim() !== DELETE_CONFIRM_PHRASE) {
      alert(`「${DELETE_CONFIRM_PHRASE}」と正確に入力してください`)
      return
    }
    const id = deleteFlow.row.id
    setDeleteFlow(null)
    setBusy(id)
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error ?? '削除に失敗しました')
        return
      }
      setGraduates((prev) => prev?.filter((g) => g.id !== id) ?? null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const canShowDeleteForRow = (r: MemberFullRow) =>
    r.id !== viewerId &&
    (canDeleteUsers(viewerRole) ||
      (canManagePendingMembers(viewerRole) && r.status === 'pending'))

  const changeRole = async (id: string, role: AppRole) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/members/${id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error ?? 'ロール変更に失敗しました')
        return
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const promoteToManager = async (id: string) => {
    await changeRole(id, 'manager')
  }

  const demoteToMember = async (id: string) => {
    await changeRole(id, 'member')
  }

  const exportCsv = async () => {
    setBusy('export')
    try {
      const res = await fetch('/api/members/export')
      if (!res.ok) {
        alert('エクスポートに失敗しました')
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition')
      const m = cd?.match(/filename="([^"]+)"/)
      const filename = m?.[1] ?? 'members.csv'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(null)
    }
  }

  const runAnnualRollover = async () => {
    setBusy('annual-rollover')
    try {
      const res = await fetch('/api/members/annual-rollover', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error ?? '年度切替に失敗しました')
        return
      }
      const nextGraduates = Array.isArray(j?.graduates)
        ? (j.graduates as AnnualGraduateRow[])
        : []
      setGraduateYear(typeof j?.currentYear === 'number' ? j.currentYear : null)
      setGraduates(nextGraduates)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const executeAnnualRollover = async () => {
    if (!annualFlow || annualFlow.step !== 2) return
    if (annualFlow.phraseInput.trim() !== ANNUAL_ROLLOVER_CONFIRM_PHRASE) {
      alert(`「${ANNUAL_ROLLOVER_CONFIRM_PHRASE}」と正確に入力してください`)
      return
    }
    setAnnualFlow(null)
    await runAnnualRollover()
  }

  const executeBulkDeleteGraduates = async () => {
    if (!bulkDeleteFlow || bulkDeleteFlow.step !== 2) return
    if (bulkDeleteFlow.phraseInput.trim() !== BULK_DELETE_CONFIRM_PHRASE) {
      alert(`「${BULK_DELETE_CONFIRM_PHRASE}」と正確に入力してください`)
      return
    }
    const ids = graduates?.map((g) => g.id) ?? []
    if (ids.length === 0) {
      setBulkDeleteFlow(null)
      return
    }
    setBulkDeleteFlow(null)
    setBusy('bulk-delete-graduates')
    try {
      const res = await fetch('/api/members/graduates/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error ?? '一括削除に失敗しました')
        return
      }
      const deletedIds = Array.isArray(j?.deletedIds)
        ? (j.deletedIds as string[])
        : []
      setGraduates(
        (prev) => prev?.filter((g) => !deletedIds.includes(g.id)) ?? null
      )
      const failedCount = Array.isArray(j?.failedIds) ? j.failedIds.length : 0
      if (failedCount > 0) {
        alert(`${failedCount}件の削除に失敗しました。再実行してください。`)
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const executeBulkGrantDrive = async () => {
    setDriveGrantFlow(null)
    setBusy('drive-bulk-grant')
    setDriveGrantResult(null)
    try {
      const res = await fetch('/api/drive/bulk-grant', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error ?? 'Drive 一括権限付与に失敗しました')
        return
      }
      setDriveGrantResult({
        granted: j.granted ?? 0,
        grantedEmails: j.grantedEmails ?? [],
        skipped: j.skipped ?? 0,
        skippedEmails: j.skippedEmails ?? [],
        failed: j.failed ?? [],
        total: j.total ?? 0,
      })
    } finally {
      setBusy(null)
    }
  }

  const executeBulkRevokeDrive = async () => {
    setDriveRevokeFlow(false)
    setBusy('drive-bulk-revoke')
    setDriveRevokeResult(null)
    try {
      const res = await fetch('/api/drive/bulk-revoke', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error ?? 'Drive 権限剥奪に失敗しました')
        return
      }
      setDriveRevokeResult({
        revoked: j.revoked ?? 0,
        revokedEmails: j.revokedEmails ?? [],
        failed: j.failed ?? [],
        total: j.total ?? 0,
      })
    } finally {
      setBusy(null)
    }
  }

  const runConfirmedAction = async () => {
    if (!confirmAction) return
    const c = confirmAction
    setConfirmAction(null)
    switch (c.kind) {
      case 'export':
        await exportCsv()
        break
      case 'promote':
        await promoteToManager(c.row.id)
        break
      case 'demote':
        await demoteToMember(c.row.id)
        break
      case 'role':
        await changeRole(c.row.id, c.next)
        break
      default:
        break
    }
  }

  if (viewerRole === 'member') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="min-w-[220px] rounded border px-3 py-1.5 text-sm"
            placeholder="クラス・名前で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="rounded border px-2 py-1.5 text-sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          >
            <option value="asc">昇順</option>
            <option value="desc">降順</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">クラス</th>
                <th className="px-3 py-2 text-left">名前</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.class_name ?? '—'}</td>
                  <td className="px-3 py-2">{r.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          className="min-w-[240px] rounded border px-3 py-1.5 text-sm"
          placeholder="検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!!confirmAction || !!annualFlow || !!bulkDeleteFlow}
        />
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={fullSortKey}
          onChange={(e) => setFullSortKey(e.target.value as FullSortKey)}
          disabled={!!confirmAction || !!annualFlow || !!bulkDeleteFlow}
        >
          <option value="email">メール順</option>
          <option value="class">クラス順</option>
        </select>
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          disabled={!!confirmAction || !!annualFlow || !!bulkDeleteFlow}
        >
          <option value="asc">昇順</option>
          <option value="desc">降順</option>
        </select>
        {canExportCsv(viewerRole) && (
          <button
            type="button"
            className="rounded border bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            onClick={() => setConfirmAction({ kind: 'export' })}
            disabled={
              busy === 'export' || !!confirmAction || !!annualFlow || !!bulkDeleteFlow
            }
          >
            CSV エクスポート
          </button>
        )}
        {canRunAnnualRollover(viewerRole) && (
          <button
            type="button"
            className="rounded border bg-amber-50 px-3 py-1.5 text-sm hover:bg-amber-100 disabled:opacity-50"
            onClick={() => setAnnualFlow({ step: 1, phraseInput: '' })}
            disabled={
              busy === 'annual-rollover' ||
              !!confirmAction ||
              !!annualFlow ||
              !!bulkDeleteFlow
            }
          >
            年度切替（更新依頼）
          </button>
        )}
        {canBulkGrantDrive(viewerRole) && (
          <button
            type="button"
            className="rounded border bg-blue-50 px-3 py-1.5 text-sm hover:bg-blue-100 disabled:opacity-50"
            onClick={() => setDriveGrantFlow({ step: 1 })}
            disabled={
              busy === 'drive-bulk-grant' ||
              busy === 'drive-bulk-revoke' ||
              !!confirmAction ||
              !!annualFlow ||
              !!bulkDeleteFlow ||
              !!driveGrantFlow ||
              driveRevokeFlow
            }
          >
            {busy === 'drive-bulk-grant' ? '付与中…' : 'Drive 閲覧権限 一括付与'}
          </button>
        )}
        {canBulkGrantDrive(viewerRole) && (
          <button
            type="button"
            className="rounded border bg-red-50 px-3 py-1.5 text-sm hover:bg-red-100 disabled:opacity-50"
            onClick={() => setDriveRevokeFlow(true)}
            disabled={
              busy === 'drive-bulk-grant' ||
              busy === 'drive-bulk-revoke' ||
              !!confirmAction ||
              !!annualFlow ||
              !!bulkDeleteFlow ||
              !!driveGrantFlow ||
              driveRevokeFlow
            }
          >
            {busy === 'drive-bulk-revoke' ? '剥奪中…' : 'Drive 閲覧権限 一括剥奪'}
          </button>
        )}
      </div>

      {graduates && (
        <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold">
              卒業対象者リスト
              {graduateYear ? `（${graduateYear}年度まで）` : ''}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{graduates.length} 件</span>
              {graduates.length > 0 && (
                <button
                  type="button"
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  disabled={
                    busy === 'bulk-delete-graduates' ||
                    !!confirmAction ||
                    !!annualFlow ||
                    !!bulkDeleteFlow
                  }
                  onClick={() => setBulkDeleteFlow({ step: 1, phraseInput: '' })}
                >
                  卒業対象を一括削除
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            年度切替後、卒業年次のユーザーを削除できます。
          </p>
          {graduates.length === 0 ? (
            <p className="text-sm text-muted-foreground">卒業対象者はいません。</p>
          ) : (
            <div className="overflow-x-auto rounded border bg-background">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2 text-left">名前</th>
                    <th className="px-2 py-2 text-left">学籍番号</th>
                    <th className="px-2 py-2 text-left">メール</th>
                    <th className="px-2 py-2 text-left">クラス</th>
                    <th className="px-2 py-2 text-left">出席番号</th>
                    <th className="px-2 py-2 text-left">卒業年</th>
                    <th className="px-2 py-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {graduates.map((g) => (
                    <tr key={g.id} className="border-t">
                      <td className="px-2 py-2">{g.name}</td>
                      <td className="px-2 py-2 text-xs">{g.student_id ?? '—'}</td>
                      <td className="max-w-[220px] truncate px-2 py-2 text-xs">{g.email}</td>
                      <td className="px-2 py-2">{g.class_name ?? '—'}</td>
                      <td className="px-2 py-2">{g.attendance_number ?? '—'}</td>
                      
                      <td className="px-2 py-2">{g.expected_graduation_year ?? '—'}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                          disabled={
                            busy === g.id ||
                            !!confirmAction ||
                            !!annualFlow ||
                            !!bulkDeleteFlow
                          }
                          onClick={() => openDeleteFlow(g)}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-2 text-left">名前</th>
              <th className="px-2 py-2 text-left">カナ</th>
              <th className="px-2 py-2 text-left">学籍番号</th>
              <th className="px-2 py-2 text-left">メール</th>
              <th className="px-2 py-2 text-left">クラス</th>
              <th className="px-2 py-2 text-left">出席番号</th>
              <th className="px-2 py-2 text-left">ロール</th>
              <th className="px-2 py-2 text-left">卒業年</th>
              <th className="px-2 py-2 text-left">状態</th>
              <th className="px-2 py-2 text-left">会則</th>
              <th className="px-2 py-2 text-left">TechTrain</th>
              <th className="px-2 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {visibleFullRows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-2 py-2">{r.name}</td>
                <td className="px-2 py-2 text-xs">{r.name_kana}</td>
                <td className="px-2 py-2 text-xs">{r.student_id ?? '—'}</td>
                <td className="max-w-[140px] truncate px-2 py-2 text-xs">{r.email}</td>
                <td className="px-2 py-2">{r.class_name ?? '—'}</td>
                <td className="px-2 py-2">{r.attendance_number ?? '—'}</td>
                <td className="px-2 py-2 text-xs">{r.role}</td>
                <td className="px-2 py-2">{r.expected_graduation_year ?? '—'}</td>
                <td className="px-2 py-2">{r.status}</td>
                <td className="px-2 py-2 text-xs">
                  {r.tos_agreed ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                      同意済み
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700">
                      未同意
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-xs">
                  {r.tech_train_agreed ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                      同意済み
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700">
                      未同意
                    </span>
                  )}
                </td>
                <td className="space-y-1 px-2 py-2 align-top">
                  {canPromoteMemberToManager(viewerRole) &&
                    r.role === 'member' &&
                    isItSchoolEmail(r.email) && (
                      <button
                        type="button"
                        className="mr-1 rounded bg-muted px-2 py-0.5 text-xs hover:bg-muted/80 disabled:opacity-50"
                        disabled={
                          busy === r.id ||
                          !!confirmAction ||
                          !!annualFlow ||
                          !!bulkDeleteFlow
                        }
                        onClick={() =>
                          setConfirmAction({ kind: 'promote', row: r })
                        }
                      >
                        manager に昇格
                      </button>
                    )}
                  {canPromoteMemberToManager(viewerRole) &&
                    r.role === 'manager' &&
                    r.id !== viewerId &&
                    (viewerRole !== 'manager' || isItSchoolEmail(r.email)) && (
                      <button
                        type="button"
                        className="mr-1 rounded bg-muted px-2 py-0.5 text-xs hover:bg-muted/80 disabled:opacity-50"
                        disabled={
                          busy === r.id ||
                          !!confirmAction ||
                          !!annualFlow ||
                          !!bulkDeleteFlow
                        }
                        onClick={() =>
                          setConfirmAction({ kind: 'demote', row: r })
                        }
                      >
                        member に降格
                      </button>
                    )}
                  {canChangeRoles(viewerRole) && r.id !== viewerId && (
                    <select
                      className="max-w-[140px] rounded border px-1 py-0.5 text-xs"
                      value={
                        confirmAction?.kind === 'role' &&
                        confirmAction.row.id === r.id
                          ? confirmAction.prev
                          : r.role
                      }
                      onChange={(e) => {
                        const next = e.target.value as AppRole
                        const prev = r.role as AppRole
                        if (next === prev) return
                        setConfirmAction({ kind: 'role', row: r, prev, next })
                      }}
                      disabled={
                        busy === r.id ||
                        !!confirmAction ||
                        !!annualFlow ||
                        !!bulkDeleteFlow
                      }
                    >
                      {selectableRoles(viewerRole, r.role as AppRole).map(
                        (opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        )
                      )}
                    </select>
                  )}
                  {canEditUsers(viewerRole) && (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs hover:bg-muted/50"
                      disabled={
                        busy === r.id ||
                        !!confirmAction ||
                        !!annualFlow ||
                        !!bulkDeleteFlow
                      }
                      onClick={() => openEdit(r)}
                    >
                      編集
                    </button>
                  )}
                  {canShowDeleteForRow(r) && (
                    <button
                      type="button"
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      disabled={
                        busy === r.id ||
                        !!confirmAction ||
                        !!annualFlow ||
                        !!bulkDeleteFlow
                      }
                      onClick={() => openDeleteFlow(r)}
                    >
                      削除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-action-title"
          >
            {confirmAction.kind === 'export' && (
              <>
                <h3 id="confirm-action-title" className="text-lg font-semibold">
                  CSV をダウンロードしますか？
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  メンバー一覧が CSV 形式で保存されます。
                </p>
              </>
            )}
            {confirmAction.kind === 'promote' && (
              <>
                <h3 id="confirm-action-title" className="text-lg font-semibold">
                  manager に昇格しますか？
                </h3>
                <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                  {confirmAction.row.email}
                </p>
                <p className="mt-1 text-sm">{confirmAction.row.name}</p>
              </>
            )}
            {confirmAction.kind === 'demote' && (
              <>
                <h3 id="confirm-action-title" className="text-lg font-semibold">
                  member に降格しますか？
                </h3>
                <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                  {confirmAction.row.email}
                </p>
                <p className="mt-1 text-sm">{confirmAction.row.name}</p>
              </>
            )}
            {confirmAction.kind === 'role' && (
              <>
                <h3 id="confirm-action-title" className="text-lg font-semibold">
                  ロールを変更しますか？
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-mono">{confirmAction.prev}</span>
                  {' → '}
                  <span className="font-mono">{confirmAction.next}</span>
                </p>
                <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                  {confirmAction.row.email}
                </p>
                <p className="mt-1 text-sm">{confirmAction.row.name}</p>
              </>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                disabled={!!busy}
                onClick={() => setConfirmAction(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-black/90 disabled:opacity-50"
                disabled={!!busy}
                onClick={() => void runConfirmedAction()}
              >
                {confirmAction.kind === 'export'
                  ? 'ダウンロード'
                  : confirmAction.kind === 'promote'
                      ? '昇格する'
                      : confirmAction.kind === 'demote'
                        ? '降格する'
                        : '変更する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {annualFlow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="annual-dialog-title"
          >
            {annualFlow.step === 1 ? (
              <>
                <h3 id="annual-dialog-title" className="text-lg font-semibold text-amber-800">
                  年度切替を実行しますか？
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  active の member / manager を renewing に変更し、
                  卒業年次の対象者リストを表示します。
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm"
                    onClick={() => setAnnualFlow(null)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="rounded bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800"
                    onClick={() =>
                      setAnnualFlow((f) =>
                        f ? { ...f, step: 2, phraseInput: '' } : null
                      )
                    }
                  >
                    次へ（最終確認）
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 id="annual-dialog-title" className="text-lg font-semibold text-amber-800">
                  最終確認
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  年度切替を確定するには、下の欄に{' '}
                  <strong className="font-mono">
                    {ANNUAL_ROLLOVER_CONFIRM_PHRASE}
                  </strong>{' '}
                  と入力してください。
                </p>
                <input
                  className="mt-3 w-full rounded border px-3 py-2 font-mono text-sm"
                  placeholder={ANNUAL_ROLLOVER_CONFIRM_PHRASE}
                  value={annualFlow.phraseInput}
                  onChange={(e) =>
                    setAnnualFlow((f) =>
                      f ? { ...f, phraseInput: e.target.value } : null
                    )
                  }
                  autoComplete="off"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm"
                    onClick={() =>
                      setAnnualFlow((f) =>
                        f ? { ...f, step: 1, phraseInput: '' } : null
                      )
                    }
                  >
                    戻る
                  </button>
                  <button
                    type="button"
                    className="rounded bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
                    disabled={busy === 'annual-rollover'}
                    onClick={() => void executeAnnualRollover()}
                  >
                    年度切替を実行
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {bulkDeleteFlow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-dialog-title"
          >
            {bulkDeleteFlow.step === 1 ? (
              <>
                <h3
                  id="bulk-delete-dialog-title"
                  className="text-lg font-semibold text-red-800"
                >
                  卒業対象を一括削除しますか？
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  卒業対象者 {graduates?.length ?? 0} 件を削除します。Supabase Auth
                  のアカウントも削除されます。
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm"
                    onClick={() => setBulkDeleteFlow(null)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800"
                    onClick={() =>
                      setBulkDeleteFlow((f) =>
                        f ? { ...f, step: 2, phraseInput: '' } : null
                      )
                    }
                  >
                    次へ（最終確認）
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3
                  id="bulk-delete-dialog-title"
                  className="text-lg font-semibold text-red-800"
                >
                  最終確認
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  一括削除を確定するには、下の欄に{' '}
                  <strong className="font-mono">{BULK_DELETE_CONFIRM_PHRASE}</strong>{' '}
                  と入力してください。
                </p>
                <input
                  className="mt-3 w-full rounded border px-3 py-2 font-mono text-sm"
                  placeholder={BULK_DELETE_CONFIRM_PHRASE}
                  value={bulkDeleteFlow.phraseInput}
                  onChange={(e) =>
                    setBulkDeleteFlow((f) =>
                      f ? { ...f, phraseInput: e.target.value } : null
                    )
                  }
                  autoComplete="off"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm"
                    onClick={() =>
                      setBulkDeleteFlow((f) =>
                        f ? { ...f, step: 1, phraseInput: '' } : null
                      )
                    }
                  >
                    戻る
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800 disabled:opacity-50"
                    disabled={busy === 'bulk-delete-graduates'}
                    onClick={() => void executeBulkDeleteGraduates()}
                  >
                    一括削除を実行
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {driveGrantFlow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-grant-dialog-title"
          >
            <h3 id="drive-grant-dialog-title" className="text-lg font-semibold text-blue-800">
              Drive 閲覧権限を一括付与しますか？
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              ロールが <strong>{driveGrantRole}</strong> の active ユーザー全員に、
              Google Drive フォルダの閲覧権限を付与します。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setDriveGrantFlow(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white hover:bg-blue-800"
                onClick={() => void executeBulkGrantDrive()}
              >
                付与を実行
              </button>
            </div>
          </div>
        </div>
      )}

      {driveGrantResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-result-dialog-title"
          >
            <h3 id="drive-result-dialog-title" className="text-lg font-semibold">
              Drive 権限付与 — 完了
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>対象ユーザー数: <strong>{driveGrantResult.total}</strong></li>
              <li className="text-green-700">
                付与成功: <strong>{driveGrantResult.granted}</strong>
                {(driveGrantResult.grantedEmails ?? []).length > 0 && (
                  <ul className="mt-1 ml-4 list-disc text-xs font-normal text-green-700">
                    {(driveGrantResult.grantedEmails ?? []).map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
              </li>
              <li className="text-muted-foreground">
                既に付与済み（スキップ）: <strong>{driveGrantResult.skipped}</strong>
                {(driveGrantResult.skippedEmails ?? []).length > 0 && (
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    {(driveGrantResult.skippedEmails ?? []).map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
              </li>
              {(driveGrantResult.failed ?? []).length > 0 && (
                <li className="text-red-700">
                  失敗: <strong>{driveGrantResult.failed.length}</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    {driveGrantResult.failed.map((f) => <li key={f.email}>{f.email}</li>)}
                  </ul>
                </li>
              )}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setDriveGrantResult(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {driveRevokeFlow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-revoke-dialog-title"
          >
            <h3 id="drive-revoke-dialog-title" className="text-lg font-semibold text-red-800">
              Drive 閲覧権限を一括剥奪しますか？
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              ロールが <strong>member・manager・admin・developer</strong> 以外のユーザー、
              およびポータルに登録されていないユーザーの Google Drive フォルダへのアクセス権を削除します。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setDriveRevokeFlow(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800"
                onClick={() => void executeBulkRevokeDrive()}
              >
                剥奪を実行
              </button>
            </div>
          </div>
        </div>
      )}

      {driveRevokeResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-revoke-result-title"
          >
            <h3 id="drive-revoke-result-title" className="text-lg font-semibold">
              Drive 権限剥奪 — 完了
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>対象ユーザー数: <strong>{driveRevokeResult.total}</strong></li>
              <li className="text-green-700">
                剥奪成功: <strong>{driveRevokeResult.revoked}</strong>
                {(driveRevokeResult.revokedEmails ?? []).length > 0 && (
                  <ul className="mt-1 ml-4 list-disc text-xs font-normal text-green-700">
                    {(driveRevokeResult.revokedEmails ?? []).map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
              </li>
              {(driveRevokeResult.failed ?? []).length > 0 && (
                <li className="text-red-700">
                  失敗: <strong>{driveRevokeResult.failed.length}</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    {driveRevokeResult.failed.map((f) => <li key={f.email}>{f.email}</li>)}
                  </ul>
                </li>
              )}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setDriveRevokeResult(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteFlow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            {deleteFlow.step === 1 ? (
              <>
                <h3 id="delete-dialog-title" className="text-lg font-semibold text-red-800">
                  ユーザーを削除しますか？
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  この操作は取り消せません。Supabase Auth のアカウントも削除されます。
                </p>
                <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                  {deleteFlow.row.email}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm"
                    onClick={() => setDeleteFlow(null)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800"
                    onClick={() =>
                      setDeleteFlow((f) =>
                        f ? { ...f, step: 2, phraseInput: '' } : null
                      )
                    }
                  >
                    次へ（最終確認）
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 id="delete-dialog-title" className="text-lg font-semibold text-red-800">
                  最終確認
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  削除を確定するには、下の欄に{' '}
                  <strong className="font-mono">{DELETE_CONFIRM_PHRASE}</strong>{' '}
                  と入力してください。
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                  {deleteFlow.row.email}
                </p>
                <input
                  className="mt-3 w-full rounded border px-3 py-2 font-mono text-sm"
                  placeholder={DELETE_CONFIRM_PHRASE}
                  value={deleteFlow.phraseInput}
                  onChange={(e) =>
                    setDeleteFlow((f) =>
                      f ? { ...f, phraseInput: e.target.value } : null
                    )
                  }
                  autoComplete="off"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm"
                    onClick={() =>
                      setDeleteFlow((f) =>
                        f ? { ...f, step: 1, phraseInput: '' } : null
                      )
                    }
                  >
                    戻る
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800 disabled:opacity-50"
                    disabled={busy === deleteFlow.row.id}
                    onClick={() => void executeDelete()}
                  >
                    削除を実行
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {editTarget && canEditUsers(viewerRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">ユーザー登録情報の編集</h3>
            <div className="grid gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span>クラス</span>
                <input
                  className="rounded border px-2 py-1"
                  value={form.class_name ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, class_name: e.target.value || null }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>出席番号</span>
                <input
                  type="number"
                  className="rounded border px-2 py-1"
                  value={form.attendance_number ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      attendance_number: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>名前</span>
                <input
                  className="rounded border px-2 py-1"
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>カナ</span>
                <input
                  className="rounded border px-2 py-1"
                  value={form.name_kana ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name_kana: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>学籍番号</span>
                <input
                  className="rounded border px-2 py-1"
                  value={form.student_id ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, student_id: e.target.value || null }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>卒業年</span>
                <input
                  type="number"
                  className="rounded border px-2 py-1"
                  value={form.expected_graduation_year ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      expected_graduation_year: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>状態</span>
                <select
                  className="rounded border px-2 py-1"
                  value={form.status ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as 'pending' | 'active' | 'renewing',
                    }))
                  }
                >
                  <option value="pending">pending</option>
                  <option value="active">active</option>
                  <option value="renewing">renewing</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setEditTarget(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-black px-3 py-1.5 text-sm text-white"
                onClick={() => void saveEdit()}
                disabled={busy === editTarget.id}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
