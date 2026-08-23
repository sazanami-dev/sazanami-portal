import { issueSignedCookieValue, verifySignedCookieValue } from '@/lib/auth/signed-cookie'

/**
 * join フロー完了判定の短命キャッシュ cookie。
 *
 * NOTE: この cookie は「DB を引かずにゲートを通す」ための最適化であって、
 *       認可の根拠ではない。認可は getViewerRole() が users.status を見て行う
 *       （lib/members/service.ts）。
 */
export const JOIN_GATE_COOKIE = 'sz_join_ok'

export const JOIN_GATE_TTL_SECONDS = 60

const PURPOSE = 'join-gate'

export function joinGateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: JOIN_GATE_TTL_SECONDS,
  }
}

/** 署名鍵が無ければ null（＝cookie を発行せず毎回DBで判定する） */
export function issueJoinGateValue(userId: string): Promise<string | null> {
  return issueSignedCookieValue(PURPOSE, userId, JOIN_GATE_TTL_SECONDS)
}

export function isValidJoinGateValue(
  value: string | undefined,
  userId: string
): Promise<boolean> {
  return verifySignedCookieValue(PURPOSE, userId, value)
}
