'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import type { UserIdentity } from '@supabase/supabase-js'
import { Button } from '@/app/(auth)/components/ui/button'


export function UnlinkIdentityButton({ identity }: { identity: UserIdentity }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.unlinkIdentity(identity)

    if (error) {
      setLoading(false)
      setErrorMessage('連携解除に失敗しました。もう一度お試しください。')
      return
    }

    // user_identities テーブルからも削除
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      await supabase
        .from('user_identities')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('provider', identity.provider)
    }


    router.refresh()
  }

  return (
    <div className="space-y-1">
      <Button variant="outline" onClick={onClick} disabled={loading}>
        {loading ? 'Unlinking…' : '連携解除'}
      </Button>
      {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  )
}