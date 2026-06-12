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

// 学籍番号パターン: 数字のみ (例: 12345678)
const STUDENT_ID_SLUG_PATTERN = /^\/\d+\/[^/]+\/?$/

function isPublicLinkPath(pathname: string): boolean {
  // クローラー向けメタファイルは認証なしで配信する
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') return true
  if (pathname.startsWith('/s/')) return true
  if (pathname.startsWith('/c/')) return true
  if (STUDENT_ID_SLUG_PATTERN.test(pathname)) return true
  if (pathname.startsWith('/api/links/')) return true
  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // 公開リダイレクトルートは認証ガードをスキップ（セッション更新は継続）
  if (isPublicLinkPath(request.nextUrl.pathname)) {
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
    await supabase.auth.getClaims()
    return supabaseResponse
  }

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

  if (
    !claims &&
    !pathname.startsWith('/signin') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/api/auth/oauth') &&
    !pathname.startsWith('/api/links')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  const userId = claims?.sub
  if (userId) {
    const { data: appUser, error: appUserErr } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .maybeSingle()

    // identity 判定のために auth user を取得
    const { data: userData, error: userErr } = await supabase.auth.getUser()


    const hasRegistration = !!appUser
    const isActive = appUser?.status === 'active'

    const { data: identityRows } = await supabase
      .from('user_identities')
      .select('provider,is_server_joined')
      .eq('user_id', userId)

    const githubIdentity = identityRows?.find((r) => r.provider === 'github')
    const discordIdentity = identityRows?.find((r) => r.provider === 'discord')
    const hasGithub = !!githubIdentity
    const hasDiscord = !!discordIdentity
    const isDiscordServerJoined = !!discordIdentity?.is_server_joined
    const isGitHubOrgJoined = !!githubIdentity?.is_server_joined
    const hasRequiredLinks =
      hasGithub &&
      hasDiscord &&
      isDiscordServerJoined &&
      isGitHubOrgJoined

    let hasAgreements = false
    if (hasRegistration) {
      const { data: tosAgreement } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', userId)
        .eq('agreement_type', 'terms_of_service')
        .maybeSingle()
      hasAgreements = !!tosAgreement
    }

    const hasUnfinishedTasks =
      !hasRegistration || !isActive || !hasAgreements || !hasRequiredLinks

    const isAllowedPath =
      pathname === '/join' ||
      pathname.startsWith('/join/') ||
      pathname.startsWith('/signin') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/agreement') ||
      pathname.startsWith('/api/discord') ||
      pathname.startsWith('/api/github') ||
      pathname.startsWith('/api/term') ||
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