import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { supabaseServerUrl } from '@/lib/supabase/url'

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

/**
 * join フローが未完了でも通すパス。
 * これらは判定結果を使わないため、判定用の DB アクセスごとスキップできる。
 * /join 自体は未完了/完了で挙動を分けるため、ここには含めない。
 */
function isAllowedWhileUnfinished(pathname: string): boolean {
  return (
    pathname.startsWith('/join/') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/agreement') ||
    pathname.startsWith('/api/discord') ||
    pathname.startsWith('/api/github') ||
    pathname.startsWith('/api/term') ||
    pathname.startsWith('/error')
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  // 公開パス・認証パスで同一の設定を使うため、クライアント生成は1箇所に集約する
  const supabase = createServerClient(
    supabaseServerUrl(),
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

  // 公開リダイレクトルートは認証ガードをスキップ（セッション更新は継続）
  if (isPublicLinkPath(pathname)) {
    await supabase.auth.getClaims()
    return supabaseResponse
  }

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

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
  if (!userId) return supabaseResponse

  // 判定結果を使わないパスは、ここで DB アクセスごとスキップする
  if (isAllowedWhileUnfinished(pathname)) return supabaseResponse

  // 3クエリは互いに独立なので並列に投げる（従来は逐次で3往復ぶん待っていた）
  const [appUserRes, identityRes, agreementRes] = await Promise.all([
    supabase.from('users').select('status').eq('id', userId).maybeSingle(),
    supabase
      .from('user_identities')
      .select('provider,is_server_joined')
      .eq('user_id', userId),
    supabase
      .from('user_agreements')
      .select('id')
      .eq('user_id', userId)
      .eq('agreement_type', 'terms_of_service')
      .maybeSingle(),
  ])

  // DB障害時は判定不能なのでリダイレクトせず素通しする（従来の appUserErr ガードと同じ挙動）
  if (appUserRes.error) return supabaseResponse

  const appUser = appUserRes.data
  const hasRegistration = !!appUser
  const isActive = appUser?.status === 'active'

  const identityRows = identityRes.data
  const githubIdentity = identityRows?.find((r) => r.provider === 'github')
  const discordIdentity = identityRows?.find((r) => r.provider === 'discord')
  const hasRequiredLinks =
    !!githubIdentity &&
    !!discordIdentity &&
    !!githubIdentity.is_server_joined &&
    !!discordIdentity.is_server_joined

  // 従来は hasRegistration の時だけ agreement を取得していたので、その条件を維持する
  const hasAgreements = hasRegistration && !!agreementRes.data

  const hasUnfinishedTasks =
    !hasRegistration || !isActive || !hasAgreements || !hasRequiredLinks

  if (hasUnfinishedTasks) {
    // ここに来る pathname は /join か保護パスのみ（許可パスは上で除外済み）
    if (pathname !== '/join') {
      const url = request.nextUrl.clone()
      url.pathname = '/join'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // やり残しが無いのに /join に来たらトップへ
  if (pathname === '/join') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
