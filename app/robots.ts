import type { MetadataRoute } from 'next'

// メンバー専用システムのため全クローラーをブロックする
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
