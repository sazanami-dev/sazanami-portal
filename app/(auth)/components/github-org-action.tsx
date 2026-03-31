'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/(auth)/components/ui/button'

export function GitHubOrgActions({ disabled }: { disabled?: boolean }) {
  const router = useRouter()
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [message, setMessage] = useState('')

  const invite = async () => {
    setLoadingInvite(true)
    setMessage('')
    try {
      const res = await fetch('/api/github/invite', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage('Org 招待の送信に失敗しました')
        return
      }
      if (json.state === 'active') {
        setMessage('既に Org メンバーです')
        router.refresh()
      } else {
        setMessage('招待を送信しました。メールを確認して承認してください')
      }
    } finally {
      setLoadingInvite(false)
    }
  }

  const verify = async () => {
    setLoadingVerify(true)
    setMessage('')
    try {
      const res = await fetch('/api/github/verify', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage('参加確認に失敗しました')
        return
      }
      if (json.joined) {
        setMessage('Org 参加を確認しました')
        router.refresh()
      } else {
        setMessage('まだ参加が確認できません。招待メールを承認してください')
      }
    } finally {
      setLoadingVerify(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <Button onClick={invite} disabled={disabled || loadingInvite}>
          {loadingInvite ? '送信中…' : 'Org に招待を送信'}
        </Button>
        <Button variant="outline" onClick={verify} disabled={disabled || loadingVerify}>
          {loadingVerify ? '確認中…' : '参加確認'}
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}