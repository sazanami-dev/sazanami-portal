'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { MemberFullRow } from '@/lib/members/service'

const DELETE_CONFIRM_PHRASE = 'DELETE'

type Props = {
  rows: MemberFullRow[]
}

export function ApprovalsClient({ rows }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'email' | 'class'>('class')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [confirmApprove, setConfirmApprove] = useState<MemberFullRow | null>(null)
  const [deleteFlow, setDeleteFlow] = useState<{
    row: MemberFullRow
    step: 1 | 2
    phraseInput: string
  } | null>(null)

  const approveMember = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/members/${id}/approve`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error ?? '承認に失敗しました')
        return
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const openDeleteFlow = (row: MemberFullRow) => {
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
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? rows.filter((r) =>
          [r.email, r.class_name ?? '', r.name, r.student_id ?? '']
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : rows
    return [...filtered].sort((a, b) => {
      let comp = 0
      if (sortKey === 'email') {
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
  }, [rows, searchQuery, sortKey, sortOrder])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          className="min-w-[240px] rounded border px-3 py-1.5 text-sm"
          placeholder="名前・メール・クラス・学籍番号で検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!!confirmApprove || !!deleteFlow}
        />
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as 'email' | 'class')}
          disabled={!!confirmApprove || !!deleteFlow}
        >
          <option value="email">メール順</option>
          <option value="class">クラス順（同クラスは出席番号順）</option>
        </select>
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          disabled={!!confirmApprove || !!deleteFlow}
        >
          <option value="asc">昇順</option>
          <option value="desc">降順</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">承認待ちのユーザーはいません。</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-background">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-2 text-left">メール</th>
                <th className="px-2 py-2 text-left">クラス</th>
                <th className="px-2 py-2 text-left">名前</th>
                <th className="px-2 py-2 text-left">学籍番号</th>
                <th className="px-2 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="max-w-[220px] truncate px-2 py-2 text-xs">{r.email}</td>
                  <td className="px-2 py-2">{r.class_name ?? '—'}</td>
                  <td className="px-2 py-2">{r.name}</td>
                  <td className="px-2 py-2 text-xs">{r.student_id ?? '—'}</td>
                  <td className="space-x-2 px-2 py-2">
                    <button
                      type="button"
                      className="rounded bg-black px-2 py-1 text-xs text-white hover:bg-black/90 disabled:opacity-50"
                      disabled={busy === r.id || !!confirmApprove || !!deleteFlow}
                      onClick={() => setConfirmApprove(r)}
                    >
                      承認する
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      disabled={busy === r.id || !!confirmApprove || !!deleteFlow}
                      onClick={() => openDeleteFlow(r)}
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

      {confirmApprove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-approve-title"
          >
            <h3 id="confirm-approve-title" className="text-lg font-semibold">
              承認しますか？
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              状態が active になり、ロールは member になります。
            </p>
            <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
              {confirmApprove.email}
            </p>
            <p className="mt-1 text-sm">{confirmApprove.name}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                disabled={!!busy}
                onClick={() => setConfirmApprove(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-black/90 disabled:opacity-50"
                disabled={!!busy}
                onClick={async () => {
                  const id = confirmApprove.id
                  setConfirmApprove(null)
                  await approveMember(id)
                }}
              >
                承認する
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
    </div>
  )
}
