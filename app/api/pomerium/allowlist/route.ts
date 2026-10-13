import { NextResponse } from 'next/server'

import { buildPomeriumAllowlist } from '@/lib/pomerium/allowlist'

export const dynamic = 'force-dynamic'

/**
 * Pomerium のポリシー用に、部員メールアドレスの許可リストを返す。
 * Pomerium ホストの同期スクリプト（scripts/pomerium/sync-allowlist.py）から定期的に呼ばれる。
 */
export async function GET(request: Request) {
  // 部員のメールアドレス一覧を返す口なので、cron 用とは別の秘密で守る
  const secret = process.env.POMERIUM_SYNC_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'pomerium_sync_secret_missing' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const allowlist = await buildPomeriumAllowlist()
    return NextResponse.json(allowlist, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[pomerium/allowlist]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
