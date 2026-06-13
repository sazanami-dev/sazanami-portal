'use client'

import { useState } from 'react'
import type { UploadTemplate } from '@/lib/drive/templates'
import type { TemplateSegment, DynamicToken } from '@/lib/drive/segments'
import { DEFAULT_DYNAMIC_FORMAT } from '@/lib/drive/segments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  initialTemplates: UploadTemplate[]
  defaultBaseFolderId: string
}

type FormState = {
  id: string | null
  name: string
  description: string
  baseFolderId: string
  segments: TemplateSegment[]
  filenameFormat: string
  isActive: boolean
  managerOnly: boolean
}

const FILENAME_TOKENS = [
  '{original}', '{ext}', '{year}', '{month}', '{date}', '{time}', '{datetime}',
  '{name}', '{name_kana}', '{student_id}', '{class_name}',
  '{attendance_number}', '{email}', '{role}', '{graduation_year}',
]

function emptyForm(baseFolderId: string): FormState {
  return {
    id: null,
    name: '',
    description: '',
    baseFolderId,
    segments: [],
    filenameFormat: '',
    isActive: true,
    managerOnly: false,
  }
}

function segmentLabel(seg: TemplateSegment): string {
  if (seg.type === 'static') return `固定: ${seg.value}`
  return `可変フォルダ: ${seg.format ?? DEFAULT_DYNAMIC_FORMAT[seg.token]}`
}

export function TemplatesClient({ initialTemplates, defaultBaseFolderId }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function startCreate() {
    setError(null)
    setForm(emptyForm(defaultBaseFolderId))
  }

  function startEdit(t: UploadTemplate) {
    setError(null)
    setForm({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      baseFolderId: t.baseFolderId,
      segments: t.segments,
      filenameFormat: t.filenameFormat ?? '',
      isActive: t.isActive,
      managerOnly: t.managerOnly,
    })
  }

  function updateSegment(idx: number, patch: Partial<TemplateSegment>) {
    if (!form) return
    const segments = form.segments.map((s, i) =>
      i === idx ? ({ ...s, ...patch } as TemplateSegment) : s
    )
    setForm({ ...form, segments })
  }

  function moveSegment(idx: number, dir: -1 | 1) {
    if (!form) return
    const target = idx + dir
    if (target < 0 || target >= form.segments.length) return
    const segments = [...form.segments]
    ;[segments[idx], segments[target]] = [segments[target], segments[idx]]
    setForm({ ...form, segments })
  }

  function removeSegment(idx: number) {
    if (!form) return
    setForm({ ...form, segments: form.segments.filter((_, i) => i !== idx) })
  }

  function addStatic() {
    if (!form) return
    setForm({ ...form, segments: [...form.segments, { type: 'static', value: '' }] })
  }

  function addDynamic(token: DynamicToken) {
    if (!form) return
    setForm({
      ...form,
      segments: [
        ...form.segments,
        { type: 'dynamic', token, format: DEFAULT_DYNAMIC_FORMAT[token], default: 'current' },
      ],
    })
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name,
        description: form.description || null,
        baseFolderId: form.baseFolderId,
        segments: form.segments,
        filenameFormat: form.filenameFormat || null,
        isActive: form.isActive,
        managerOnly: form.managerOnly,
      }
      const url = form.id ? `/api/drive/templates/${form.id}` : '/api/drive/templates'
      const method = form.id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          data.error === 'invalid_segments'
            ? 'フォルダ構成（固定名は必須）を確認してください'
            : data.error === 'missing_fields'
              ? '名前とベースフォルダIDは必須です'
              : '保存に失敗しました'
        )
        return
      }
      // 再取得
      const listRes = await fetch('/api/drive/templates')
      const listData = await listRes.json().catch(() => ({ templates: [] }))
      setTemplates(listData.templates ?? [])
      setForm(null)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このテンプレートを削除しますか？')) return
    const res = await fetch(`/api/drive/templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      if (form?.id === id) setForm(null)
    }
  }

  return (
    <div className="space-y-6">
      {!form && (
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
        >
          + テンプレートを追加
        </button>
      )}

      <Dialog open={!!form} onOpenChange={(o) => { if (!o && !saving) setForm(null) }}>
        {form && (
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? 'テンプレート編集' : '新規テンプレート'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">名前</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例: 定例会"
              className="rounded border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">説明（任意）</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">ベースフォルダID（Drive）</span>
            <input
              type="text"
              value={form.baseFolderId}
              onChange={(e) => setForm({ ...form, baseFolderId: e.target.value })}
              className="rounded border px-3 py-2 font-mono"
            />
          </label>

          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium">フォルダ構成（ベース直下から）</span>
            {form.segments.length === 0 && (
              <p className="text-xs text-muted-foreground">
                セグメント未設定＝ベースフォルダ直下にアップロードします。
              </p>
            )}
            {form.segments.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded border p-2">
                <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                {seg.type === 'static' ? (
                  <input
                    type="text"
                    value={seg.value}
                    onChange={(e) => updateSegment(idx, { value: e.target.value })}
                    placeholder="固定フォルダ名（例: 定例）"
                    className="flex-1 rounded border px-2 py-1"
                  />
                ) : (
                  <input
                    type="text"
                    value={seg.format ?? ''}
                    onChange={(e) => updateSegment(idx, { format: e.target.value })}
                    placeholder={`フォーマット（例: ${DEFAULT_DYNAMIC_FORMAT[seg.token]}）`}
                    className="flex-1 rounded border px-2 py-1 font-mono"
                  />
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {segmentLabel(seg)}
                </span>
                <button type="button" onClick={() => moveSegment(idx, -1)} className="px-1 text-xs hover:bg-muted rounded">↑</button>
                <button type="button" onClick={() => moveSegment(idx, 1)} className="px-1 text-xs hover:bg-muted rounded">↓</button>
                <button type="button" onClick={() => removeSegment(idx)} className="px-1 text-xs text-red-600 hover:bg-muted rounded">×</button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addStatic} className="rounded border px-3 py-1.5 text-xs hover:bg-muted">
                + 固定フォルダ
              </button>
              <button type="button" onClick={() => addDynamic('month')} className="rounded border px-3 py-1.5 text-xs hover:bg-muted">
                + 可変フォルダ
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              フォーマットで使えるトークン: YYYY（年）/ MM（月）/ DD（日）/ HH（時）
            </p>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">ファイル名フォーマット（任意）</span>
            <input
              type="text"
              value={form.filenameFormat}
              onChange={(e) => setForm({ ...form, filenameFormat: e.target.value })}
              placeholder="例: 定例会_{month}_{student_id}_{name}_{original}"
              className="rounded border px-3 py-2 font-mono"
            />
            <span className="text-xs text-muted-foreground">
              空欄=元のファイル名のまま。利用可能トークン: {FILENAME_TOKENS.join(' ')}
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <span>有効（アップロード画面に表示）</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.managerOnly}
              onChange={(e) => setForm({ ...form, managerOnly: e.target.checked })}
            />
            <span>運営専用</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
            >
              キャンセル
            </button>
          </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <div className="space-y-3">
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground">テンプレートがありません。</p>
        )}
        {templates.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-4 rounded-xl border bg-background p-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                {!t.isActive && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">無効</span>
                )}
                {t.managerOnly && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">運営専用</span>
                )}
              </div>
              {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              <p className="text-xs text-muted-foreground">
                構成: {t.segments.length === 0 ? '（直下）' : t.segments.map(segmentLabel).join(' / ')}
              </p>
              {t.filenameFormat && (
                <p className="text-xs text-muted-foreground font-mono">ファイル名: {t.filenameFormat}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(t)} className="rounded border px-3 py-1.5 text-xs hover:bg-muted">
                編集
              </button>
              <button type="button" onClick={() => handleDelete(t.id)} className="rounded border px-3 py-1.5 text-xs text-red-600 hover:bg-muted">
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
