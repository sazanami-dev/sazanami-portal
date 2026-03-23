'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/app/(auth)/components/ui/button'

type AppUser = {
  status: string
}

export function JoinCompletedSection({
  authUser,
  appUser,
}: {
  authUser: User
  appUser: AppUser
}) {
  const router = useRouter()
  const [remaining, setRemaining] = useState(3)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (remaining <= 0) {
      router.replace('/')
    }
  }, [remaining, router])

  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-green-50 p-4 space-y-2">
        <p className="text-sm font-medium text-green-800">
          すべてのタスクが完了しました。
        </p>
        {remaining > -1 && (
          <p className="text-sm text-green-700">
            {remaining}秒でトップに移動します。
          </p>
        )}
        {remaining <= -1 && (
          <Button asChild className="w-full">
            <Link href="/">移動しない場合はこちらを押してください</Link>
          </Button>
        )}
      </div>
    </section>
  )
}