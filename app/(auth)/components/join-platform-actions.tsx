'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/(auth)/components/ui/button'

export function JoinPlatformActions({
  disabled,
  needsDiscord,
  needsGitHub,
}: {
  disabled?: boolean
  needsDiscord: boolean
  needsGitHub: boolean
}) {
  const router = useRouter()
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [messages, setMessages] = useState<string[]>([])

  const inviteAll = async () => {
    setLoadingInvite(true)
    setMessages([])
    const msgs: string[] = []

    try {
      if (needsDiscord) {
        const res = await fetch('/api/discord/invite', { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.inviteUrl) {
          msgs.push('Discord 招待URLの発行に失敗しました')
        } else {
          msgs.push('Discord 参加画面を開きます')
          window.open(json.inviteUrl as string, '_blank', 'noopener,noreferrer')
        }
      }

      if (needsGitHub) {
        const res = await fetch('/api/github/invite', { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          msgs.push('GitHub Org 招待の送信に失敗しました')
        } else if (json.state === 'active') {
          msgs.push('既に GitHub Org メンバーです')
        } else {
          msgs.push('GitHub Org 招待を送信しました')
        }
      }
    } finally {
      setMessages(msgs)
      setLoadingInvite(false)
    }
  }

  const verifyAll = async () => {
    setLoadingVerify(true)
    setMessages([])
    const msgs: string[] = []
    let allOk = true

    try {
      if (needsDiscord) {
        const res = await fetch('/api/discord/verify', { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          msgs.push('Discord 参加確認またはロール付与に失敗しました')
          allOk = false
        } else if (!(json.joined && json.roleGranted)) {
          msgs.push('Discord 参加がまだ確認できません。参加後に再度お試しください')
          allOk = false
        } else {
          msgs.push('Discord の参加確認が完了しました')
        }
      }

      if (needsGitHub) {
        const res = await fetch('/api/github/verify', { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          msgs.push('GitHub の参加確認に失敗しました')
          allOk = false
        } else if (!json.joined) {
          msgs.push('まだ GitHub Org 参加が確認できません。招待メールを承認してください')
          allOk = false
        } else {
          msgs.push('GitHub Org の参加確認が完了しました')
        }
      }

      if (allOk) {
        router.refresh()
      }
    } finally {
      setMessages(msgs)
      setLoadingVerify(false)
    }
  }

  const inviteLabel = [
    needsDiscord && 'Discord サーバーに参加',
    needsGitHub && 'GitHub Org に招待',
  ]
    .filter(Boolean)
    .join(' ＆ ')

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button onClick={inviteAll} disabled={disabled || loadingInvite}>
          {loadingInvite ? '処理中…' : inviteLabel}
        </Button>
        <Button variant="outline" onClick={verifyAll} disabled={disabled || loadingVerify}>
          {loadingVerify ? '確認中…' : '次へ'}
        </Button>
      </div>
      {messages.length > 0 && (
        <div className="space-y-1">
          {messages.map((msg, i) => (
            <p key={i} className="text-sm text-muted-foreground">{msg}</p>
          ))}
        </div>
      )}
    </div>
  )
}
