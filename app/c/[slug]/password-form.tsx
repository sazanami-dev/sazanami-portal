'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { linkId: string }

export default function PasswordForm({ linkId }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/links/${linkId}/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? '0')
        const minutes = Math.ceil(retryAfter / 60)
        setError(
          minutes > 0
            ? `試行回数が上限に達しました。約${minutes}分後にもう一度お試しください`
            : '試行回数が上限に達しました。しばらくしてからお試しください'
        )
      } else {
        setError('パスワードが正しくありません')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-2 text-gray-800">パスワード保護リンク</h1>
        <p className="text-sm text-gray-500 mb-6">このリンクにアクセスするにはパスワードが必要です。</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white py-2 rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? '確認中...' : 'アクセスする'}
          </button>
        </form>
      </div>
    </div>
  )
}
