import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * リダイレクト先のオリジンを決める。
 *
 * x-forwarded-host は受信経路によっては信頼できないため、
 * ALLOWED_FORWARDED_HOSTS（カンマ区切り）に列挙したホストだけ採用し、
 * それ以外は Host 由来の origin を使う。TLS を手前で終端している構成でも
 * https を維持できるよう、本番ではプロトコルを固定する。
 */
function redirectBase(origin: string, forwardedHost: string | null): string {
  if (process.env.NODE_ENV === 'development') return origin

  const allowed = (process.env.ALLOWED_FORWARDED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
  if (forwardedHost && allowed.includes(forwardedHost)) {
    return `https://${forwardedHost}`
  }

  const url = new URL(origin)
  url.protocol = 'https:'
  return url.origin
}

function redirectTo(origin: string, forwardedHost: string | null, next: string) {
  return NextResponse.redirect(`${redirectBase(origin, forwardedHost)}${next}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  
  const forwardedHost = request.headers.get('x-forwarded-host')

  try {
    let next = searchParams.get('next') ?? '/'
    if (!next.startsWith('/')) next = '/'

    // Supabase が OAuth エラーをクエリパラメータで返す場合（例: Discordにメールが未登録）
    const oauthError = searchParams.get('error')
    if (oauthError) {
      const description = searchParams.get('error_description') ?? ''
      if (/email/i.test(description)) {
        return redirectTo(origin, forwardedHost, `${next}?error=discord_no_email`)
      }
      return redirectTo(origin, forwardedHost, `/error?error=${oauthError}`)
    }

    const code = searchParams.get('code')
    if (!code) {
      return redirectTo(origin, forwardedHost, '/error?error=missing_code')
    }
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('[oauth] exchangeCodeForSession failed:', exchangeError.message)
      if (/email/i.test(exchangeError.message)) {
        return redirectTo(origin, forwardedHost, `${next}?error=discord_no_email`)
      }
      return redirectTo(origin, forwardedHost, `/error?error=exchange_failed`)
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      console.error('[oauth] getUser failed:', userErr?.message)
      return redirectTo(origin, forwardedHost, '/error?error=user_fetch_failed')
    }
    const userId = userData.user.id

    const { data: appUser, error: appUserErr } = await supabase
      .from('users')
      .select('id,status')
      .eq('id', userId)
      .maybeSingle()
    if (appUserErr) {
      console.error('[oauth] users select failed:', appUserErr.message)
      return redirectTo(origin, forwardedHost, '/error?error=db_error')
    }

    if (appUser) {
      const adminSupabase = createAdminClient()
      const identities = userData.user.identities ?? []
      const targetProviders: readonly string[] = ['discord', 'github']
      for (const identity of identities) {
        if (!targetProviders.includes(identity.provider)) continue
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

    if (!appUser) {
      next = '/join'
    } else if (appUser.status !== 'active') {
      next = '/join'
    }
    return redirectTo(origin, forwardedHost, next)
  } catch (err) {
    console.error('[oauth] unhandled error:', err)
    return redirectTo(origin, forwardedHost, '/error?error=internal')
  }
}