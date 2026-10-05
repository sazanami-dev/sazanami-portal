'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Provider = 'github' | 'discord'

export function LinkIdentityButton({
  provider,
  next = '/connection',
  disabled = false,
  children,
}: {
  provider: Provider
  next?: string
  disabled?: boolean
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/oauth?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setLoading(false)
      setErrorMessage('連携に失敗しました。もう一度お試しください。')
    }
  }

  return (
    <div className="space-y-1">
      <Button onClick={onClick} disabled={disabled || loading}>
        <div className="mx-2">
          {loading ? 'Linking…' : children}
        </div>
      </Button>
      {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  )
}