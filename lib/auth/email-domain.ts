/**
 * サインインを許可するメールドメインの判定。
 *
 * ALLOWED_EMAIL_DOMAINS にカンマ区切りで列挙する（例: trident.ac.jp）。
 * 未設定なら制限しない。
 *
 * Google の OAuth はどのアカウントでも認証自体は成立するため、
 * 組織の利用者かどうかはアプリ側で確認する必要がある。
 */
export function allowedEmailDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedEmailDomain(email: string | null | undefined): boolean {
  const domains = allowedEmailDomains()
  if (domains.length === 0) return true
  if (!email) return false
  const domain = email.split('@').pop()?.toLowerCase()
  if (!domain) return false
  return domains.includes(domain)
}
