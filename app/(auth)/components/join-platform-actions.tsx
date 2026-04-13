'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/(auth)/components/ui/button'

export function JoinPlatformActions({
  disabled,
  step,
}: {
  disabled?: boolean
  step: 'discord' | 'github'
}) {
  const router = useRouter()
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [message, setMessage] = useState('')

  const invite = async () => {
    setLoadingInvite(true)
    setMessage('')
    try {
      if (step === 'github') {
        const githubRes = await fetch('/api/github/invite', { method: 'POST' })
        const githubJson = await githubRes.json().catch(() => ({}))
        if (!githubRes.ok) {
          setMessage('GitHub Org 招待の送信に失敗しました')
          return
        }
        if (githubJson.state === 'active') {
          setMessage('既に GitHub Org メンバーです')
        } else {
          setMessage('GitHub Org 招待を送信しました')
        }
        router.refresh()
        return
      }

      const discordRes = await fetch('/api/discord/invite', { method: 'POST' })
      const discordJson = await discordRes.json().catch(() => ({}))
      if (!discordRes.ok || !discordJson?.inviteUrl) {
        setMessage('Discord 招待URLの発行に失敗しました')
        return
      }
      setMessage('Discord 参加画面を開きます')
      window.open(discordJson.inviteUrl as string, '_blank', 'noopener,noreferrer')
    } finally {
      setLoadingInvite(false)
    }
  }

  const verify = async () => {
    setLoadingVerify(true)
    setMessage('')
    try {
      if (step === 'github') {
        const githubRes = await fetch('/api/github/verify', { method: 'POST' })
        const githubJson = await githubRes.json().catch(() => ({}))
        if (!githubRes.ok) {
          setMessage('GitHub の参加確認に失敗しました')
          return
        }
        if (!githubJson.joined) {
          setMessage('まだ GitHub Org 参加が確認できません。招待メールを承認してください')
          return
        }
        setMessage('GitHub Org の参加確認が完了しました')
        router.refresh()
        return
      }

      const discordRes = await fetch('/api/discord/verify', { method: 'POST' })
      const discordJson = await discordRes.json().catch(() => ({}))
      if (!discordRes.ok) {
        setMessage('Discord 参加確認またはロール付与に失敗しました')
        return
      }
      if (!(discordJson.joined && discordJson.roleGranted)) {
        setMessage('Discord 参加がまだ確認できません。参加後に再度お試しください')
        return
      }
      setMessage('Discord の参加確認が完了しました')
      router.refresh()
    } finally {
      setLoadingVerify(false)
    }
  }

  const inviteButtonLabel = step === 'discord' ? 'Discordサーバーに参加' : 'GitHub Org に招待'

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <Button onClick={invite} disabled={disabled || loadingInvite}>
          {loadingInvite ? '処理中…' : inviteButtonLabel}
        </Button>
        <Button variant="outline" onClick={verify} disabled={disabled || loadingVerify}>
          {loadingVerify ? '確認中…' : '次へ'}
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
