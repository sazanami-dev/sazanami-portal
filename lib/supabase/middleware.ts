import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOW_PATHS_FOR_LIMITED_USERS = [
  '/signin',
  '/signup',
  '/pending',
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

  // B) ログイン済みなら DB の users.status を確認して pending/未登録をガード
  // claims.sub が Supabase Auth の user id
  const userId = claims?.sub
  if (userId && !isAllowedPath(pathname)) {
    const { data: appUser, error: appUserErr } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .maybeSingle()

    // エラー時は安全側に倒す（とりあえず /error 等でもOK）
    if (!appUserErr) {
      if (!appUser) {
        const url = request.nextUrl.clone()
        url.pathname = '/signup'
        return NextResponse.redirect(url)
      }

      if (appUser.status !== 'active') {
        const url = request.nextUrl.clone()
        url.pathname = '/pending'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}