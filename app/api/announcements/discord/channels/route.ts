import { NextResponse } from 'next/server'

import { requireViewerRole } from '@/lib/members/route-helpers'
import { canManageAnnouncements } from '@/lib/announcements/permissions'
import {
  defaultAnnounceChannelIdByCategory,
  listAnnounceChannels,
} from '@/lib/discord/announce-channels'

/**
 * 通知先チャンネルの選択肢と、カテゴリごとの既定チャンネル。
 * 作成・編集モーダルのプルダウンで使う。manager 以上のみ。
 */
export async function GET() {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!canManageAnnouncements(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    channels: listAnnounceChannels(),
    defaultByCategory: defaultAnnounceChannelIdByCategory(),
    // 「Discord で開く」リンクの組み立てに使う
    guildId: process.env.DISCORD_GUILD_ID?.trim() ?? null,
  })
}
