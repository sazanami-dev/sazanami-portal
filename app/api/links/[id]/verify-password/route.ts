import { NextResponse } from 'next/server'
import { getLinkById } from '@/lib/links/service'
import { verifyPassword } from '@/lib/links/password'
import {
  issueLinkUnlockValue,
  linkUnlockCookieName,
  linkUnlockCookieOptions,
} from '@/lib/links/unlock-cookie'

type RouteContext = { params: Promise<{ id: string }> }

// TODO: レート制限を追加すること（ブルートフォース対策）
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params

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
