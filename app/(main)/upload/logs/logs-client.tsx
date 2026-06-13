'use client'

import type { UploadLog } from '@/lib/drive/upload-logs'

type Props = {
  logs: UploadLog[]
}

function formatBytes(n: number | null): string {
  if (n == null) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** http(s) のみ許可する（javascript: 等のスキームによる XSS を防ぐ多層防御） */
function safeHttpUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
}

export function LogsClient({ logs }: Props) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">アップロード履歴がありません。</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">日時</th>
            <th className="px-3 py-2 font-medium">テンプレート</th>
            <th className="px-3 py-2 font-medium">アップロード者</th>
            <th className="px-3 py-2 font-medium">ファイル名</th>
            <th className="px-3 py-2 font-medium">保存先</th>
            <th className="px-3 py-2 font-medium">サイズ</th>
            <th className="px-3 py-2 font-medium">状態</th>
            <th className="px-3 py-2 font-medium">リンク</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0">
              <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDate(log.createdAt)}</td>
              <td className="px-3 py-2">{log.templateName ?? '-'}</td>
              <td className="px-3 py-2">{log.uploaderName ?? '-'}</td>
              <td className="px-3 py-2 font-mono text-xs">{log.fileName}</td>
              <td className="px-3 py-2 text-xs">{log.folderPath ?? '-'}</td>
              <td className="whitespace-nowrap px-3 py-2 text-xs">{formatBytes(log.sizeBytes)}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[log.status] ?? 'bg-muted'}`}
                >
                  {log.status}
                </span>
              </td>
              <td className="px-3 py-2">
                {safeHttpUrl(log.webViewLink) ? (
                  <a
                    href={safeHttpUrl(log.webViewLink)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    開く
                  </a>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
