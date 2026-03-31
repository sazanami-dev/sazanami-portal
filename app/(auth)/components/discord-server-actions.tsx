'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/(auth)/components/ui/button'

export function DiscordServerActions({ disabled }: { disabled?: boolean }) {
  const router = useRouter()
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [message, setMessage] = useState<string>('')

  const createInvite = async () => {
    setLoadingInvite(true)
    setMessage('')
    try {
      const res = await fetch('/api/discord/invite', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.inviteUrl) {
        setMessage('招待URLの発行に失敗しました')
        return
      }
      setInviteUrl(json.inviteUrl)
      // すぐ参加できるように新規タブで開く
      window.open(json.inviteUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setLoadingInvite(false)
    }
  }

  const verifyAndGrantRole = async () => {
    setLoadingVerify(true)
    setMessage('')
    try {
      const res = await fetch('/api/discord/verify', { method: 'POST' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage('参加確認またはロール付与に失敗しました')
        return
      }

      if (json.joined && json.roleGranted) {
          if (json.alreadyHadRole) {
            setMessage('Discord参加済み・ロール付与済みです')
          } else {
            setMessage('Discord参加を確認し、ロールを付与しました')
          }
          router.refresh()
          return
      } else if (json.joined === false) {
        setMessage('まだサーバー参加が確認できません。参加後に再度確認してください')
      } else {
        setMessage('確認結果を取得しました')
      }
    } finally {
      setLoadingVerify(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <Button onClick={createInvite} disabled={disabled || loadingInvite}>
          {loadingInvite ? '発行中…' : '招待URLを発行して参加'}
        </Button>
        <Button variant="outline" onClick={verifyAndGrantRole} disabled={disabled || loadingVerify}>
          {loadingVerify ? '確認中…' : '参加確認・ロール付与'}
        </Button>
      </div>

      {inviteUrl && (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline"
        >
          招待URLを開く
        </a>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}