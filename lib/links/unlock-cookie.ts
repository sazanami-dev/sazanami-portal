import { issueSignedCookieValue, verifySignedCookieValue } from '@/lib/auth/signed-cookie'

/**
 * パスワード保護リンクの解錠 cookie。
 *
 * 値は署名付きで、サーバーがパスワード照合に成功したときに発行したものだけを
 * 有効とする。
 */
export const LINK_UNLOCK_TTL_SECONDS = 3600

const PURPOSE = 'link-unlock'

export function linkUnlockCookieName(linkId: string): string {
  return `lv_${linkId}`
}

export function linkUnlockCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: LINK_UNLOCK_TTL_SECONDS,
  }
}

/** 署名鍵が無ければ null（＝解錠 cookie を発行しない） */
export function issueLinkUnlockValue(linkId: string): Promise<string | null> {
  return issueSignedCookieValue(PURPOSE, linkId, LINK_UNLOCK_TTL_SECONDS)
}

export function isLinkUnlocked(value: string | undefined, linkId: string): Promise<boolean> {
  return verifySignedCookieValue(PURPOSE, linkId, value)
}
