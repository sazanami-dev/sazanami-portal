'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/(auth)/components/ui/button'

export function JoinPlatformActions() {
  const router = useRouter()
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [messages, setMessages] = useState<string[]>([])

  const inviteAll = async () => {
    setLoadingInvite(true)
    setMessages([])
    const msgs: string[] = []

    try {
      const discordRes = await fetch('/api/discord/invite', { method: 'POST' })
      const discordJson = await discordRes.json().catch(() => ({}))
      if (!discordRes.ok || !discordJson?.inviteUrl) {
        msgs.push('Discord 招待URLの発行に失敗しました')
      } else {
        msgs.push('Discord 参加画面を開きます')
        window.open(discordJson.inviteUrl as string, '_blank', 'noopener,noreferrer')
      }

      const ghRes = await fetch('/api/github/invite', { method: 'POST' })
      const ghJson = await ghRes.json().catch(() => ({}))
      if (!ghRes.ok) {
        msgs.push('GitHub Org 招待の送信に失敗しました')
      } else if (ghJson.state === 'active') {
        msgs.push('既に GitHub Org メンバーです')
      } else {
        msgs.push('GitHub Org 招待を送信しました')
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
      const discordRes = await fetch('/api/discord/verify', { method: 'POST' })
      const discordJson = await discordRes.json().catch(() => ({}))
      if (!discordRes.ok) {
        msgs.push('Discord 参加確認またはロール付与に失敗しました')
        allOk = false
      } else if (!(discordJson.joined && discordJson.roleGranted)) {
        msgs.push('Discord 参加がまだ確認できません。参加後に再度お試しください')
        allOk = false
      } else {
        msgs.push('Discord の参加確認が完了しました')
      }

      const ghRes = await fetch('/api/github/verify', { method: 'POST' })
      const ghJson = await ghRes.json().catch(() => ({}))
      if (!ghRes.ok) {
        msgs.push('GitHub の参加確認に失敗しました')
        allOk = false
      } else if (!ghJson.joined) {
        msgs.push('まだ GitHub Org 参加が確認できません。招待メールを承認してください')
        allOk = false
      } else {
        msgs.push('GitHub Org の参加確認が完了しました')
      }

      if (allOk) {
        router.refresh()
      }
    } finally {
      setMessages(msgs)
      setLoadingVerify(false)
    }
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button onClick={inviteAll} disabled={loadingInvite} className="min-w-[16rem] w-full sm:w-auto">
          {loadingInvite ? '処理中…' : 'Discord サーバー ＆ GitHub Org に参加'}
        </Button>
        <Button variant="outline" onClick={verifyAll} disabled={loadingVerify} className="min-w-[6rem] w-full sm:w-auto">
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
