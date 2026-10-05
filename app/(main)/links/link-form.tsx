'use client'

import { useState } from 'react'
import type { ShortLink } from '@/lib/links/service'

type Props = {
  initial?: ShortLink
  canCreateOfficial: boolean
  officialNamespace: string
  canCreateCareer: boolean
  careerNamespace: string
  studentId: string | null
  onSuccess: (link: ShortLink) => void
  onCancel: () => void
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_slug: 'スラグは英数字・ハイフンのみ使用できます',
  duplicate_slug: 'このスラグはすでに使用されています。再生成してください',
  invalid_url: '転送先 URL の形式が正しくありません',
  create_failed: '作成に失敗しました。しばらくしてから再試行してください',
  update_failed: '更新に失敗しました。しばらくしてから再試行してください',
}

function randomSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const arr = new Uint8Array(3)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => chars[b % chars.length]).join('')
}

export default function LinkForm({
  initial,
  canCreateOfficial,
  officialNamespace,
  canCreateCareer,
  careerNamespace,
  studentId,
  onSuccess,
  onCancel,
}: Props) {
  const defaultNamespace =
    initial?.namespace ??
    (studentId ?? (canCreateOfficial ? officialNamespace : canCreateCareer ? careerNamespace : ''))

  const [namespace, setNamespace] = useState(defaultNamespace)
  const [slug, setSlug] = useState(initial?.slug ?? randomSlug())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [targetUrl, setTargetUrl] = useState(initial?.targetUrl ?? '')
  const [password, setPassword] = useState('')
  const [inCollection, setInCollection] = useState(initial?.inCollection ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!initial

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        namespace,
        slug,
        targetUrl,
        inCollection,
        title: title || null,
      }
      if (password) body.password = password

      const url = isEditing ? `/api/links/${initial.id}` : '/api/links'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const code = data.error as string | undefined
        setError((code && ERROR_MESSAGES[code]) ?? '予期しないエラーが発生しました')
        return
      }

      setLoading(false)
      onSuccess(data.link)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const namespaceOptions = [
    ...(studentId ? [{ value: studentId, label: `ユーザーリンク (/${studentId}/...)` }] : []),
    ...(canCreateOfficial ? [{ value: officialNamespace, label: '公式リンク (/s/...)' }] : []),
    ...(canCreateCareer ? [{ value: careerNamespace, label: '就活リンク (/c/...)' }] : []),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      {!isEditing && namespaceOptions.length > 1 && (
        <label className="flex flex-col gap-1">
          <span>種別</span>
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="rounded border px-3 py-1.5"
          >
            {namespaceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-1">
        <span>スラグ</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="例: abc（英数字・ハイフン）"
            pattern="[a-z0-9-]{1,100}"
            required
            className="rounded border px-3 py-1.5 flex-1 font-mono"
          />
          <button
            type="button"
            onClick={() => setSlug(randomSlug())}
            className="rounded border px-3 py-1.5 hover:bg-muted whitespace-nowrap"
          >
            再生成
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span>名前（任意）</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="リンクの表示名"
          maxLength={255}
          className="rounded border px-3 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>転送先 URL</span>
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="rounded border px-3 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>パスワード（任意）</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isEditing ? '変更する場合のみ入力' : '未設定の場合は空のまま'}
          className="rounded border px-3 py-1.5"
        />
      </label>

      {(namespace === officialNamespace || namespace === careerNamespace) && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inCollection}
            onChange={(e) => setInCollection(e.target.checked)}
            className="rounded"
          />
          <span>リンク集に載せる</span>
        </label>
      )}

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-1.5 text-white hover:bg-black/90 disabled:opacity-50"
        >
          {loading ? '処理中...' : isEditing ? '保存' : '作成'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-3 py-1.5 hover:bg-muted"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
