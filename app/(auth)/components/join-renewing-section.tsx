// app/(auth)/components/join-renewing-section.tsx
'use client'

import type { User } from '@supabase/supabase-js'
// ここに年度更新用フォームを実装

type AppUser = {
  status: string
}

export function JoinRenewingSection({
  authUser,
  appUser,
}: {
  authUser: User
  appUser: AppUser
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">登録情報の更新が必要です</h2>
      <p className="text-sm text-muted-foreground">
        さざなみ開発への参加継続手続きを行なってください。
      </p>
    </section>
  )
}