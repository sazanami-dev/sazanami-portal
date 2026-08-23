/**
 * join フロー完了判定の短命キャッシュ cookie。
 *
 * middleware(Edge Runtime) と Route Handler(Node Runtime) の双方から使うため、
 * next/headers など実行環境に依存する API は import しないこと。
 *
 * NOTE: この cookie は「DB を引かずにゲートを通す」ための最適化であって、
 *       認可の根拠ではない。実際の認可は getViewerRole() が users.status を
 *       見て行う（lib/members/service.ts）。
 */
export const JOIN_GATE_COOKIE = 'sz_join_ok'

export const JOIN_GATE_TTL_SECONDS = 60

export function joinGateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: JOIN_GATE_TTL_SECONDS,
  }
}
