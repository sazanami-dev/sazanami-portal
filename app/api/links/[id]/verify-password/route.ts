import { NextResponse } from 'next/server'
import { getLinkById } from '@/lib/links/service'
import { verifyPassword } from '@/lib/links/password'
import {
  issueLinkUnlockValue,
  linkUnlockCookieName,
  linkUnlockCookieOptions,
} from '@/lib/links/unlock-cookie'
import { clientKey, consumeRateLimit } from '@/lib/rate-limit'

type RouteContext = { params: Promise<{ id: string }> }

const WINDOW_SECONDS = 600
/** 同一の要求元から、1つのリンクに対して許す試行回数 */
const PER_CLIENT_LIMIT = 10
/** 要求元を問わず、1つのリンクに対して許す試行回数 */
const PER_LINK_LIMIT = 100

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'too_many_requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params

  // パスワード照合は bcrypt で意図的に重いため、上限判定を先に行う
  const perClient = consumeRateLimit(
    `link-password:${clientKey(request)}:${id}`,
    PER_CLIENT_LIMIT,
    WINDOW_SECONDS
  )
  if (!perClient.allowed) return tooManyRequests(perClient.retryAfterSeconds)

  // 転送ヘッダは要求元が名乗るものなので、リンク単位の上限も併せて設ける
  const perLink = consumeRateLimit(`link-password:${id}`, PER_LINK_LIMIT, WINDOW_SECONDS)
  if (!perLink.allowed) return tooManyRequests(perLink.retryAfterSeconds)

  const body = await request.json().catch(() => null)
  if (!body || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const link = await getLinkById(id)
  if (!link) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!link.passwordHash) {
    return NextResponse.json({ error: 'no_password' }, { status: 400 })
  }

  const ok = await verifyPassword(body.password, link.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 400 })
  }

  // 署名鍵が無ければ解錠 cookie を発行できない（毎回パスワードを要求する）
  const unlockValue = await issueLinkUnlockValue(id)
  if (!unlockValue) {
    return NextResponse.json({ error: 'server_config_missing' }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(linkUnlockCookieName(id), unlockValue, linkUnlockCookieOptions())
  return response
}
