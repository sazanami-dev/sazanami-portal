'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import type { UserIdentity } from '@supabase/supabase-js'
import { Button } from '@/app/(auth)/components/ui/button'


export function UnlinkIdentityButton({ identity }: { identity: UserIdentity }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.unlinkIdentity(identity)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      {loading ? 'Unlinking…' : '連携解除'}
    </Button>
  )
}