// app/(auth)/join/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

import { SignupForm } from '@/app/(auth)/components/join-signup-section'
import { JoinPendingSection } from '@/app/(auth)/components/join-pending-section'
import { JoinCompletedSection } from '@/app/(auth)/components/join-completed-section'
import { JoinConnectionSection } from '@/app/(auth)/components/join-connection-section'
import { JoinAgreementSection } from '@/app/(auth)/components/join-agreement-section'
import JoinApprovalSection from '@/app/(auth)/components/join-approval-section'
import { JoinStepList, type StepItem } from '@/app/(auth)/components/join-step-list'
import { JoinWizard } from '@/app/(auth)/components/join-wizard'

// --- 各ステップ用のSVGアイコン定義 ---
const userIcon = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const agreementIcon = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const connectionIcon = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

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

  const { data: agreements } = appUser
    ? await supabase
        .from('user_agreements')
        .select('agreement_type')
        .eq('user_id', authUser.id)
        .in('agreement_type', ['terms_of_service', 'tech_train'])
    : { data: [] }

  const agreedTypes = new Set((agreements ?? []).map((a: { agreement_type: string }) => a.agreement_type))
  const tosAgreed = agreedTypes.has('terms_of_service')
  const techTrainAgreed = agreedTypes.has('tech_train')
  const allAgreed = tosAgreed

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

  // ステップ定義（「管理者の承認を待つ」を削除）
  const steps: StepItem[] = (() => {
    switch (state) {
      case 'unregistered':
        return [
          { label: 'ユーザー情報を登録する', status: 'current' as const, icon: userIcon },
          { label: '会則・情報共有に同意する', status: 'upcoming' as const, icon: agreementIcon },
          { label: 'アカウントを連携する', status: 'upcoming' as const, icon: connectionIcon },
        ]
      case 'pending':
        return [
          { label: 'ユーザー情報を登録する', status: 'done' as const, icon: userIcon },
          { label: '会則・情報共有に同意する', status: allAgreed ? 'done' as const : 'current' as const, icon: agreementIcon },
          { label: 'アカウントを連携する', status: allAgreed ? (hasGithub && hasDiscord ? 'done' as const : 'current' as const) : 'upcoming' as const, icon: connectionIcon },
        ]
      case 'renewing':
        return [
          { label: '登録情報を更新する', status: 'current' as const, icon: userIcon },
        ]
      case 'active':
        return [
          { label: 'ユーザー情報を登録する', status: 'done' as const, icon: userIcon },
          { label: '会則・情報共有に同意する', status: allAgreed ? 'done' as const : 'current' as const, icon: agreementIcon },
          { label: 'アカウントを連携する', status: allAgreed ? (allConnected ? 'done' as const : 'current' as const) : 'upcoming' as const, icon: connectionIcon },
        ]
    }
  })()

  const upcomingSteps = steps.filter((s) => s.status === 'upcoming')

  return (
    <main className="mx-auto w-full max-w-4xl p-6 space-y-8">
      {/* ウェルカムメッセージ */}
      <section className="space-y-1 flex m-5">
        <h1 className="text-3xl font-bold w-full text-center">
          {displayName}さん、さざなみ開発へようこそ！
        </h1>
      </section>

      {/* 未登録 → ウィザード（ステップ表示は内部で管理） */}
      {state === 'unregistered' && (
        <JoinWizard
          authUser={authUser}
          isDiscordJoined={isDiscordServerJoined}
          isGitHubJoined={isGitHubOrgJoined}
        />
      )}

      {/* ステップインジケーター（登録済以降のみ） */}
      {state !== 'unregistered' && <JoinStepList steps={steps} />}

      <section className="space-y-6">

        {/* pending → 同意済なら承認待ち、未同意なら同意画面 */}
        {state === 'pending' && appUser && (
          <>
            {!allAgreed ? (
              <JoinAgreementSection tosAgreed={tosAgreed} techTrainAgreed={techTrainAgreed} />
            ) : (
              <JoinApprovalSection />
            )}
          </>
        )}

        {/* renewing → 更新フォーム */}
        {state === 'renewing' && <SignupForm mode="renewing" afterSuccessPath="/join" />}

        {/* active → 同意 → サーバー参加確認 → 完了 */}
        {state === 'active' && appUser && (
          <>
            {!allAgreed ? (
              <JoinAgreementSection tosAgreed={tosAgreed} techTrainAgreed={techTrainAgreed} />
            ) : !allConnected ? (
              <JoinApprovalSection initialStatus="approved" />
            ) : (
              <JoinCompletedSection authUser={authUser} appUser={appUser} />
            )}
          </>
        )}

      </section>

      
    </main>
  )
}