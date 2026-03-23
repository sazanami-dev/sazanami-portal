import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOW_PATHS_FOR_LIMITED_USERS = [
  '/signin',
  '/join',
]

function isAllowedPath(pathname: string) {
  if (ALLOW_PATHS_FOR_LIMITED_USERS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true
  }
  // 認証系APIは通す（OAuthコールバック/登録APIなど）
  if (pathname.startsWith('/api/auth')) return true

  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const pathname = request.nextUrl.pathname

  // A) 未ログインは既存のガード（例外パスは通す）
  if (
    !claims &&
    !pathname.startsWith('/signin') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/api/auth/oauth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  // B) ログイン済みなら「やり残し」判定をして /join へ寄せる
  const userId = claims?.sub
  if (userId) {
    const { data: appUser, error: appUserErr } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .maybeSingle()

    // identity 判定のために auth user を取得
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    const identities = userData?.user?.identities ?? []

    const hasRegistration = !!appUser
    const isActive = appUser?.status === 'active'

    const hasGithub = identities.some((i) => i.provider === 'github')
    const hasDiscord = identities.some((i) => i.provider === 'discord')
    const { data: discordIdentity } = await supabase
      .from('user_identities')
      .select('is_server_joined')
      .eq('user_id', userId)
      .eq('provider', 'discord')
      .maybeSingle()

    const isDiscordServerJoined = !!discordIdentity?.is_server_joined
    const hasRequiredLinks = hasGithub && hasDiscord //&& isDiscordServerJoined

    const hasUnfinishedTasks =
      !hasRegistration || !isActive || !hasRequiredLinks

    const isAllowedPath =
      pathname === '/join' ||
      pathname.startsWith('/join/') ||
      pathname.startsWith('/signin') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/error')

    // やり残しがあるのに /join 以外へ行こうとしたら /join へ
    if (!appUserErr && !userErr && hasUnfinishedTasks && !isAllowedPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/join'
      return NextResponse.redirect(url)
    }

    // 任意: やり残しが無いのに /join に来たらトップへ
    if (!appUserErr && !userErr && !hasUnfinishedTasks && pathname === '/join') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}