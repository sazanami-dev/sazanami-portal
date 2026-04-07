// app/(auth)/join/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

import { SignupForm } from '@/app/(auth)/components/join-signup-section'
import { JoinPendingSection } from '@/app/(auth)/components/join-pending-section'
import { JoinCompletedSection } from '@/app/(auth)/components/join-completed-section'
import { JoinConnectionSection } from '@/app/(auth)/components/join-connection-section'
import { JoinStepList } from '@/app/(auth)/components/join-step-list'

type Step = {
  label: string
  status: 'done' | 'current' | 'upcoming'
}

export default async function JoinPage() {
  const supabase = await createClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    redirect('/signin')
  }

  const authUser = userData.user

  const { data: appUser, error: appUserErr } = await supabase
    .from('users')
    .select(
      'status, email, name, name_kana, student_id, class_name, attendance_number, expected_graduation_year'
    )
    .eq('id', authUser.id)
    .maybeSingle()

  if (appUserErr) {
    redirect('/error')
  }
  const { data: identityRows } = await supabase
      .from('user_identities')
      .select('provider,is_server_joined')
      .eq('user_id', authUser.id)
    const githubIdentity = identityRows?.find((r) => r.provider === 'github')
    const discordIdentity = identityRows?.find((r) => r.provider === 'discord')

  // 状態判定
  type State = 'unregistered' | 'pending' | 'renewing' | 'active'
  let state: State
  if (!appUser) {
    state = 'unregistered'
  } else if (appUser.status === 'pending') {
    state = 'pending'
  } else if (appUser.status === 'renewing') {
    state = 'renewing'
  } else {
    state = 'active'
  }

  // 表示名
  const displayName =
    appUser?.name ??
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    authUser.email ??
    ''

  // 連携済みか判定
  
  const identities = authUser.identities ?? []
  const hasGithub = identities.some((i) => i.provider === 'github')
  const hasDiscord = identities.some((i) => i.provider === 'discord')
  const isDiscordServerJoined = !!discordIdentity?.is_server_joined
  const isGitHubOrgJoined = !!githubIdentity?.is_server_joined

  const allConnected = hasGithub && hasDiscord && isDiscordServerJoined && isGitHubOrgJoined

  // ステップ定義
  const steps: Step[] = (() => {
    switch (state) {
      case 'unregistered':
        return [
          { label: 'ユーザー情報を登録する', status: 'current' as const },
          { label: 'アカウントを連携する（GitHub / Discord）', status: 'upcoming' as const },
          { label: '管理者の承認を待つ', status: 'upcoming' as const },
        ]
      case 'pending':
        return [
          { label: 'ユーザー情報を登録する', status: 'done' as const },
          { label: 'アカウントを連携する（GitHub / Discord）', status: allConnected ? 'done' as const : 'current' as const },
          { label: '管理者の承認を待つ', status: 'current' as const },
        ]
      case 'renewing':
        return [
          { label: '登録情報を更新する', status: 'current' as const },
        ]
      case 'active':
        return [
          { label: 'ユーザー情報を登録する', status: 'done' as const },
          { label: 'アカウントを連携する（GitHub / Discord）', status: allConnected ? 'done' as const : 'current' as const },
          { label: '管理者の承認を待つ', status: 'done' as const },
        ]
    }
  })()

  const upcomingSteps = steps.filter((s) => s.status === 'upcoming')

  return (
    <main className="mx-auto max-w-lg p-6 space-y-8">
      {/* ウェルカムメッセージ */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold">
          {displayName}さん、さざなみ開発へようこそ！
        </h1>
        <p className="text-sm text-muted-foreground">
          参加手続きの進捗を確認できます。
        </p>
      </section>

      {/* ステップインジケーター */}
      <JoinStepList steps={steps} />

      {/* 次にやること */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">次にやること</h2>

        {/* 未登録 → 登録フォーム */}
        {state === 'unregistered' && (
          <SignupForm afterSuccessPath="/join" />
        )}

        {/* pending → 承認待ちメッセージ + アカウント連携 */}
        {state === 'pending' && appUser && (
          <>
            <JoinPendingSection authUser={authUser} appUser={appUser} />
            <JoinConnectionSection authUser={authUser} canJoinOrg={false} />
          </>
        )}

        {/* renewing → 更新フォーム */}
        {state === 'renewing' && <SignupForm mode="renewing" afterSuccessPath="/join" />}

        {/* active → 未連携があれば連携UI、なければ完了 */}
        {state === 'active' && appUser && (
          <>
            {!allConnected && (
              <JoinConnectionSection authUser={authUser} canJoinOrg={true} />
            )}
            {allConnected && (
              <JoinCompletedSection authUser={authUser} appUser={appUser} />
            )}
          </>
        )}

      </section>

      {/* 残りのやること */}
      {upcomingSteps.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            残りのやること
          </h2>
          <ul className="space-y-1">
            {upcomingSteps.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                  {steps.indexOf(s) + 1}
                </span>
                {s.label}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}