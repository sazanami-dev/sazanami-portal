import { NextResponse } from 'next/server'

import {
  processPendingDiscordNotifications,
} from '@/lib/announcements/discord'
import { revalidateAnnouncements } from '@/lib/announcements/service'

/** 予約投稿の遅延は呼び出し間隔がそのまま効くため、1 分間隔での実行を想定する */
export const dynamic = 'force-dynamic'

/**
 * 公開時刻に到達した予約投稿を Discord へ送信する。
 * スケジューラ（sazanami_bot）から定期的に呼ばれる。
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    // 認証できない状態で誰でも叩ける口を開けない
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const summary = await processPendingDiscordNotifications()

  if (summary.sent > 0 || summary.failed > 0) {
    console.log('[cron/announcements/discord]', JSON.stringify(summary))
    // 送信済みかどうかは管理画面の表示に出るため、キャッシュを破棄しておく
    revalidateAnnouncements()
  }

  return NextResponse.json(summary)
}
