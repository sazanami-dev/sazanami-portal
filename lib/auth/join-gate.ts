/**
 * join フロー完了判定の短命キャッシュ cookie。
 *
 * middleware(Edge Runtime) と Route Handler(Node Runtime) の双方から使うため、
 * next/headers など実行環境に依存する API は import しないこと。
 * 署名には両環境で使える Web Crypto を用いる。
 *
 * NOTE: この cookie は「DB を引かずにゲートを通す」ための最適化であって、
 *       認可の根拠ではない。実際の認可は getViewerRole() が users.status を
 *       見て行う（lib/members/service.ts）。署名はあくまで多層防御。
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

const ENCODER = new TextEncoder()

function signingSecret(): string | null {
  const secret = process.env.JOIN_GATE_SECRET
  return secret && secret.length > 0 ? secret : null
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return toBase64Url(await crypto.subtle.sign('HMAC', key, ENCODER.encode(payload)))
}

/** 長さと内容の両方で早期 return しない比較（署名の総当たりを助けないため） */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * cookie に入れる値を作る。形式は `userId.expiresAt.signature`。
 *
 * 有効期限も署名対象に含めるため、利用者が値を控えておいて後から貼り直しても
 * TTL を過ぎていれば通らない（maxAge は利用者が書き換えられるので当てにしない）。
 * JOIN_GATE_SECRET が未設定なら null を返し、cookie を発行しない
 * ＝ キャッシュが効かず毎回 DB を引く（fail closed）。
 */
export async function issueJoinGateValue(userId: string): Promise<string | null> {
  const secret = signingSecret()
  if (!secret) return null
  const expiresAt = Math.floor(Date.now() / 1000) + JOIN_GATE_TTL_SECONDS
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${await sign(payload, secret)}`
}

/** cookie の値が、この userId 向けに自分が発行した未失効のものかを検証する。 */
export async function isValidJoinGateValue(
  value: string | undefined,
  userId: string
): Promise<boolean> {
  const secret = signingSecret()
  if (!secret || !value) return false

  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [id, expiresAtRaw, signature] = parts
  if (id !== userId) return false

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false

  return timingSafeEqual(signature, await sign(`${id}.${expiresAtRaw}`, secret))
}
