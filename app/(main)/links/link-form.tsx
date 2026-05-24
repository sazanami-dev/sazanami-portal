'use client'

import { useState } from 'react'
import type { ShortLink } from '@/lib/links/service'

type Props = {
  initial?: ShortLink
  canCreateOfficial: boolean
  studentId: string | null
  officialNamespace: string
  onSuccess: (link: ShortLink) => void
  onCancel: () => void
}

export default function LinkForm({
  initial,
  canCreateOfficial,
  studentId,
  officialNamespace,
  onSuccess,
  onCancel,
}: Props) {
  const defaultNamespace =
    initial?.namespace ??
    (canCreateOfficial ? officialNamespace : studentId ?? '')

  const [namespace, setNamespace] = useState(defaultNamespace)
  const [useCustomSlug, setUseCustomSlug] = useState(!!initial?.slug)
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugLength, setSlugLength] = useState(7)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [targetUrl, setTargetUrl] = useState(initial?.targetUrl ?? '')
  const [password, setPassword] = useState('')
  const [inCollection, setInCollection] = useState(initial?.inCollection ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!initial

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body: Record<string, unknown> = { namespace, targetUrl, inCollection, title: title || null }
    if (useCustomSlug && slug) body.slug = slug
    else if (!isEditing) body.slugLength = slugLength
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
      setError(data.error ?? '作成に失敗しました')
      setLoading(false)
      return
    }

    onSuccess(data.link ?? { ...initial, ...body })
  }

  const namespaceOptions = [
    ...(canCreateOfficial ? [{ value: officialNamespace, label: '公式リンク (/s/...)' }] : []),
    ...(studentId ? [{ value: studentId, label: `ユーザーリンク (/${studentId}/...)` }] : []),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEditing && namespaceOptions.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {namespaceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">スラグ</label>
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                checked={!useCustomSlug}
                onChange={() => setUseCustomSlug(false)}
              />
              ランダム生成
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                checked={useCustomSlug}
                onChange={() => setUseCustomSlug(true)}
              />
              カスタム指定
            </label>
          </div>
          {useCustomSlug ? (
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="例: my-link (英数字・ハイフンのみ)"
              pattern="[a-z0-9-]{1,100}"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={10}
                value={slugLength}
                onChange={(e) => setSlugLength(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-16">{slugLength} 文字</span>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">名前（任意）</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="リンクの表示名"
          maxLength={255}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">転送先 URL</label>
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          パスワード（任意）
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isEditing ? '変更する場合のみ入力' : '未設定の場合は空のまま'}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {namespace === officialNamespace && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="inCollection"
            checked={inCollection}
            onChange={(e) => setInCollection(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="inCollection" className="text-sm text-gray-700 cursor-pointer">
            リンク集に載せる
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? '処理中...' : isEditing ? '保存' : '作成'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
