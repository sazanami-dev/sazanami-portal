import { NextResponse } from 'next/server'

import { JOIN_GATE_COOKIE } from '@/lib/auth/join-gate'

/**
 * サインアウト時の後始末。
 *
 * sz_join_ok は httpOnly でサーバーが発行しているため、クライアント側の
 * supabase.auth.signOut() では削除できない。ここで失効させる。
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })
  // set 時と同じ path を指定しないと削除されない
  response.cookies.delete({ name: JOIN_GATE_COOKIE, path: '/' })
  return response
}
