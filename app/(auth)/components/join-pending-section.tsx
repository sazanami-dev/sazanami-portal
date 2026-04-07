'use client'

import type { User } from '@supabase/supabase-js'

type AppUser = {
  status: string
}

export function JoinPendingSection({
  authUser,
  appUser,
}: {
  authUser: User
  appUser: AppUser
}) {
  return (
    <div className="rounded-lg border bg-amber-50 p-4 space-y-2">
      <p className="text-sm font-medium text-amber-800">
        現在、登録内容を確認中です。
      </p>
      <p className="text-sm text-amber-700">
        管理者が承認するまでしばらくお待ちください。承認されると、ポータルを利用できるようになります。
      </p>
    </div>
  )
}