import { randomBytes } from 'crypto'

const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SLUG_REGEX = /^[a-z0-9-]{1,100}$/

/**
 * rejection sampling で均等な分布のランダム slug を生成する。
 * 256 % 36 = 4 のため、素朴な `% length` ではバイアスが発生する。
 */
export function generateSlug(length = 3): string {
  const maxValid = Math.floor(256 / CHARSET.length) * CHARSET.length
  const result: string[] = []
  while (result.length < length) {
    const bytes = randomBytes(length - result.length)
    for (const b of bytes) {
      if (b < maxValid) {
        result.push(CHARSET[b % CHARSET.length])
      }
    }
  }
  return result.join('')
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
