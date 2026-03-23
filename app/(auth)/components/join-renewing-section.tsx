// app/(auth)/components/join-renewing-section.tsx
'use client'

import type { User } from '@supabase/supabase-js'
// 必要であればここに更新用フォームを実装（簡易版のメッセージだけでもOK）

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
        さざなみ開発への参加継続手続きを行なってください。今後、ここに更新用フォームを配置します。
      </p>
    </section>
  )
}