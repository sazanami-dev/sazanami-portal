'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/(auth)/components/ui/button'

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

  const onClick = async () => {
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/oauth?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <Button onClick={onClick} disabled={disabled || loading}>
      {loading ? 'Linking…' : children}
    </Button>
  )
}