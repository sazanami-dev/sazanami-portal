import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

function redirectTo(origin: string, forwardedHost: string | null, next: string) {
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return NextResponse.redirect(`${origin}${next}`)
  if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`)
  return NextResponse.redirect(`${origin}${next}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next が来ていれば基本はそこへ。ただし登録状況で上書きする
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) next = '/'
  if (!code) {
    return NextResponse.redirect(`${origin}/error`)
  }
  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/error`)
  }
  // セッション確立後のユーザー取得
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.redirect(`${origin}/error`)
  }
  const userId = userData.user.id


  // auth.identities → user_identities テーブルへ同期
  // 登録有無/ステータス確認
  const { data: appUser, error: appUserErr } = await supabase
    .from('users')
    .select('id,status')
    .eq('id', userId)
    .maybeSingle()
  if (appUserErr) {
    return NextResponse.redirect(`${origin}/error`)
  }
  // user が存在する場合のみ identity を同期（service_role で RLS バイパス）
  if (appUser) {
    const adminSupabase = createAdminClient()
    const identities = userData.user.identities ?? []
    const targetProviders = ['discord', 'github'] as const
    for (const identity of identities) {
      if (!targetProviders.includes(identity.provider as any)) continue
      const identityData = (identity.identity_data ?? {}) as Record<string, unknown>
      const providerUserId = identity.id
      const username =
        (typeof identityData.user_name === 'string' && identityData.user_name) ||
        (typeof identityData.preferred_username === 'string' && identityData.preferred_username) ||
        (typeof identityData.name === 'string' && identityData.name) ||
        (typeof identityData.full_name === 'string' && identityData.full_name) ||
        ''
      await adminSupabase
        .from('user_identities')
        .upsert(
          {
            id: crypto.randomUUID(),
            user_id: userId,
            provider: identity.provider,
            provider_user_id: providerUserId,
            username,
          },
          { onConflict: 'user_id,provider' }
        )
    }
  }
  // ここが分岐の要点
  if (!appUser) {
    next = '/join'
  } else if (appUser.status !== 'active') {
    next = '/join'
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  return redirectTo(origin, forwardedHost, next)
}