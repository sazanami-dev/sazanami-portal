import { randomBytes } from 'crypto'

const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SLUG_REGEX = /^[a-z0-9-]{1,100}$/

export function generateSlug(length = 7): string {
  const bytes = randomBytes(length)
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join('')
}

export function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}

export function validateTargetUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
