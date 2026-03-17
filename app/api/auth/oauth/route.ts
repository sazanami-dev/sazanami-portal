import { NextResponse } from 'next/server'

// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

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
  // 登録有無/ステータス確認（RLSで本人のみ見える想定）
  const { data: appUser, error: appUserErr } = await supabase
    .from('users')
    .select('id,status')
    .eq('id', userId)
    .maybeSingle()
  if (appUserErr) {
    return NextResponse.redirect(`${origin}/error`)
  }
  // ここが分岐の要点
  if (!appUser) {
    next = '/signup'
  } else if (appUser.status !== 'active') {
    next = '/pending'
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  return redirectTo(origin, forwardedHost, next)
}