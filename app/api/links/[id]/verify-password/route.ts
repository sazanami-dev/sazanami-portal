import { NextResponse } from 'next/server'
import { getLinkById } from '@/lib/links/service'
import { verifyPassword } from '@/lib/links/password'

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

  const response = NextResponse.json({ ok: true })
  response.cookies.set(`lv_${id}`, '1', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 3600,
    path: '/',
  })
  return response
}
