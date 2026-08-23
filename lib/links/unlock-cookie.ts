import { issueSignedCookieValue, verifySignedCookieValue } from '@/lib/auth/signed-cookie'

/**
 * パスワード保護リンクの解錠 cookie。
 *
 * 以前は `lv_<linkId>=1` という固定値だった。linkId は PasswordForm に渡され
 * ページに埋め込まれるため、訪問者が自分で `lv_<linkId>=1` を付けるだけで
 * パスワードを回避できていた（httpOnly はページ内のJSを防ぐだけで、
 * 利用者自身が DevTools や curl で cookie を付けることは妨げない）。
 * 署名付きの値にして、サーバーが発行したものだけを受け付ける。
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
