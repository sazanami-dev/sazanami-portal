/**
 * 署名付き cookie の共通実装。
 *
 * middleware(Edge Runtime) と Route Handler / Server Component(Node Runtime) の
 * 双方から使うため、next/headers など実行環境に依存する API は import しないこと。
 * 署名には両環境で使える Web Crypto を用いる。
 *
 * 値の形式は `subject.expiresAt.signature`。有効期限は cookie の maxAge では
 * なく署名対象の payload 側で担保する（cookie 属性は受信側で書き換えられる
 * 前提で扱うため）。
 *
 * purpose は用途ラベルで、署名の入力に含めてドメイン分離する。これにより
 * ある用途の正規の値を別用途の cookie に流用することができない。
 */
const ENCODER = new TextEncoder()

/** 署名鍵。未設定なら null を返し、呼び出し側は fail closed に倒す。 */
export function cookieSigningSecret(): string | null {
  const secret = process.env.COOKIE_SIGNING_SECRET
  return secret && secret.length > 0 ? secret : null
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(purpose: string, payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return toBase64Url(await crypto.subtle.sign('HMAC', key, ENCODER.encode(`${purpose}:${payload}`)))
}

/** 比較にかかる時間が内容に依存しないようにする */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * cookie に入れる署名付きの値を作る。
 * COOKIE_SIGNING_SECRET が未設定なら null を返す（＝cookie を発行しない）。
 */
export async function issueSignedCookieValue(
  purpose: string,
  subject: string,
  ttlSeconds: number
): Promise<string | null> {
  const secret = cookieSigningSecret()
  if (!secret) return null
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${subject}.${expiresAt}`
  return `${payload}.${await sign(purpose, payload, secret)}`
}

/** cookie の値が、この purpose / subject 向けに自分が発行した未失効のものかを検証する。 */
export async function verifySignedCookieValue(
  purpose: string,
  subject: string,
  value: string | undefined
): Promise<boolean> {
  const secret = cookieSigningSecret()
  if (!secret || !value) return false

  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [id, expiresAtRaw, signature] = parts
  if (id !== subject) return false

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false

  return timingSafeEqual(signature, await sign(purpose, `${id}.${expiresAtRaw}`, secret))
}
