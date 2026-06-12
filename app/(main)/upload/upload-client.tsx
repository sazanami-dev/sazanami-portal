'use client'

import { useEffect, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

type TemplateOption = {
  id: string
  name: string
  description: string | null
  hasMonth: boolean
}

type Props = {
  templates: TemplateOption[]
}

type FileStatus = 'queued' | 'uploading' | 'completed' | 'failed'

type FileItem = {
  uid: string
  file: File
  status: FileStatus
  progress: number
  finalName: string | null
  link: string | null
  error: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  file_too_large: 'ファイルサイズが上限を超えています',
  template_not_found: 'テンプレートが見つかりません',
  folder_resolve_failed: 'アップロード先フォルダの作成に失敗しました',
  session_init_failed: 'アップロードセッションの開始に失敗しました',
  auth_failed: 'Google 認証に失敗しました',
  server_config_missing: 'サーバー設定が不足しています',
  forbidden: 'アップロード権限がありません',
}

const CHUNK_SIZE = 8 * 1024 * 1024 // 8MB（256KB の倍数）

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function makeUid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** resumable セッションURL へファイルをチャンク送信する */
async function uploadInChunks(
  sessionUrl: string,
  file: File,
  onProgress: (sent: number) => void
): Promise<{ id?: string }> {
  const total = file.size
  let offset = 0

  // サイズ0のファイルにも対応
  if (total === 0) {
    const res = await fetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes */0` },
    })
    if (!res.ok) throw new Error(`upload_failed_${res.status}`)
    return res.json().catch(() => ({}))
  }

  while (offset < total) {
    const end = Math.min(offset + CHUNK_SIZE, total)
    const chunk = file.slice(offset, end)
    const res = await fetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${offset}-${end - 1}/${total}` },
      body: chunk,
    })

    if (res.status === 308) {
      // 継続: Google が受信済みバイトを Range で返す
      onProgress(end)
      offset = end
      continue
    }
    if (res.ok) {
      onProgress(total)
      return res.json().catch(() => ({}))
    }
    throw new Error(`upload_failed_${res.status}`)
  }
  return {}
}

const STATUS_LABEL: Record<FileStatus, string> = {
  queued: '待機中',
  uploading: 'アップロード中',
  completed: '完了',
  failed: '失敗',
}

const STATUS_STYLE: Record<FileStatus, string> = {
  queued: 'text-muted-foreground',
  uploading: 'text-blue-600',
  completed: 'text-green-700',
  failed: 'text-red-600',
}

export function UploadClient({ templates }: Props) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [month, setMonth] = useState(currentMonth())
  const [items, setItems] = useState<FileItem[]>([])
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = templates.find((t) => t.id === templateId)

  // 選択テンプレ/月が変わったらアップロード先パスのプレビューを取得
  useEffect(() => {
    if (!templateId) {
      setPreviewPath(null)
      return
    }
    let cancelled = false
    const q = selected?.hasMonth ? `?month=${month}` : ''
    fetch(`/api/drive/templates/${templateId}/resolve${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setPreviewPath(d?.displayPath ?? null)
      })
      .catch(() => {
        if (!cancelled) setPreviewPath(null)
      })
    return () => {
      cancelled = true
    }
  }, [templateId, month, selected?.hasMonth])

  function updateItem(uid: string, patch: Partial<FileItem>) {
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...patch } : it)))
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const newItems: FileItem[] = Array.from(fileList).map((file) => ({
      uid: makeUid(),
      file,
      status: 'queued',
      progress: 0,
      finalName: null,
      link: null,
      error: null,
    }))
    setItems((prev) => [...prev, ...newItems])
  }

  function removeItem(uid: string) {
    setItems((prev) => prev.filter((it) => it.uid !== uid))
  }

  function clearFinished() {
    setItems((prev) => prev.filter((it) => it.status !== 'completed'))
  }

  /** 1ファイルをアップロードする */
  async function uploadOne(item: FileItem) {
    const { file, uid } = item
    updateItem(uid, { status: 'uploading', progress: 0, error: null })

    let logId: string | null = null
    try {
      const sessionRes = await fetch('/api/drive/upload/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          month: selected?.hasMonth ? month : undefined,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }),
      })
      const sessionData = await sessionRes.json().catch(() => ({}))
      if (!sessionRes.ok) {
        updateItem(uid, {
          status: 'failed',
          error: ERROR_MESSAGES[sessionData.error] ?? 'アップロードの準備に失敗しました',
        })
        return
      }

      const { sessionUrl, finalFileName, logId: lid } = sessionData as {
        sessionUrl: string
        finalFileName: string
        logId: string | null
      }
      logId = lid
      updateItem(uid, { finalName: finalFileName })

      const result = await uploadInChunks(sessionUrl, file, (sent) =>
        updateItem(uid, { progress: Math.round((sent / Math.max(file.size, 1)) * 100) })
      )

      const driveFileId = result?.id
      const link = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null

      if (logId) {
        // webViewLink はサーバ側で driveFileId から生成するため送信しない
        await fetch('/api/drive/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logId,
            status: 'completed',
            driveFileId,
            sizeBytes: file.size,
          }),
        }).catch(() => {})
      }

      updateItem(uid, { status: 'completed', progress: 100, link })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown'
      updateItem(uid, { status: 'failed', error: 'アップロードに失敗しました' })
      if (logId) {
        await fetch('/api/drive/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId, status: 'failed', error: message }),
        }).catch(() => {})
      }
    }
  }

  async function handleUploadAll() {
    if (!templateId || uploading) return
    setUploading(true)
    try {
      // 待機中・失敗のものを順次アップロード（最新の items を参照）
      const targets = items.filter((it) => it.status === 'queued' || it.status === 'failed')
      for (const item of targets) {
        await uploadOne(item)
      }
    } finally {
      setUploading(false)
    }
  }

  if (templates.length === 0) {
    return (
      <p className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
        利用可能なアップロードテンプレートがありません。管理者にお問い合わせください。
      </p>
    )
  }

  const pendingCount = items.filter((it) => it.status === 'queued' || it.status === 'failed').length
  const hasCompleted = items.some((it) => it.status === 'completed')

  return (
    <div className="space-y-5 rounded-xl border bg-background p-6 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">テンプレート</span>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="rounded border px-3 py-2"
          disabled={uploading}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {selected?.description && (
          <span className="text-xs text-muted-foreground">{selected.description}</span>
        )}
      </label>

      {selected?.hasMonth && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">対象月</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded border px-3 py-2"
            disabled={uploading}
          />
        </label>
      )}

      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        <span className="text-muted-foreground">アップロード先: </span>
        <span className="font-mono font-medium">
          {previewPath ? previewPath : '（フォルダ直下）'}
        </span>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium">ファイル</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = '' // 同じファイルを連続追加できるようリセット
          }}
          className="hidden"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!uploading) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (!uploading) addFiles(e.dataTransfer.files)
          }}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:opacity-50 ${
            dragOver
              ? 'border-black bg-muted/60'
              : 'border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/60 hover:bg-muted/40'
          }`}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <span className="font-medium">
            クリックして選択 / ここにドラッグ＆ドロップ
          </span>
          <span className="text-xs text-muted-foreground">
            複数ファイルを選択できます。続けて追加も可能です。
          </span>
        </button>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.uid} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(it.file.size)}
                    {it.finalName && it.finalName !== it.file.name && (
                      <> → <span className="font-mono">{it.finalName}</span></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className={`text-xs font-medium ${STATUS_STYLE[it.status]}`}>
                    {STATUS_LABEL[it.status]}
                  </span>
                  {it.status === 'completed' && it.link && (
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-700 underline"
                    >
                      開く
                    </a>
                  )}
                  {(it.status === 'queued' || it.status === 'failed') && !uploading && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.uid)}
                      className="rounded px-1 text-xs text-red-600 hover:bg-muted"
                      aria-label="削除"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              {it.status === 'uploading' && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-black transition-all" style={{ width: `${it.progress}%` }} />
                </div>
              )}
              {it.status === 'failed' && it.error && (
                <p className="mt-1 text-xs text-red-600">{it.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleUploadAll}
          disabled={uploading || pendingCount === 0 || !templateId}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
        >
          {uploading
            ? 'アップロード中...'
            : pendingCount > 0
              ? `アップロード（${pendingCount}件）`
              : 'アップロード'}
        </button>
        {hasCompleted && !uploading && (
          <button
            type="button"
            onClick={clearFinished}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            完了分をクリア
          </button>
        )}
      </div>
    </div>
  )
}
