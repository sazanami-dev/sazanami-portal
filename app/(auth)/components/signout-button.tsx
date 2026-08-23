'use client'

import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/app/(auth)/components/ui/button'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    // httpOnly の sz_join_ok はブラウザ側からは消せないので、先に
    // Route Handler へ投げてサーバーに削除させる。signOut() より前に
    // 呼ぶことで、セッションが生きているうちに確実に到達させる。
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {})
    await supabase.auth.signOut()
    router.push('/signin')
  }

  return <Button onClick={logout}>Logout</Button>
}
