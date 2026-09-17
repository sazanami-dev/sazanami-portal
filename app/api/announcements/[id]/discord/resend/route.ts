import { NextResponse } from 'next/server'

import { requireViewerRole } from '@/lib/members/route-helpers'
import { canManageAnnouncements } from '@/lib/announcements/permissions'
import { resendAnnouncementToDiscord } from '@/lib/announcements/discord'
import { getManagedAnnouncement } from '@/lib/announcements/service'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Discord への手動再送。送信に失敗したお知らせだけが対象。
 * 未送信なら新規送信、送信済みメッセージが残っていれば編集としてやり直す。
 * manager 以上のみ。
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params
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

  const existing = await getManagedAnnouncement(id)
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (existing.discord.status === 'sending') {
    return NextResponse.json({ error: 'sending_in_progress' }, { status: 409 })
  }
  if (existing.discord.status !== 'failed' || !existing.discord.channelId) {
    // 未送信・送信待ち・送信済みは再送の対象にしない
    return NextResponse.json({ error: 'not_resendable' }, { status: 409 })
  }

  const result = await resendAnnouncementToDiscord(existing)
  if (result.outcome === 'skipped') {
    // 直前に他の処理が処理権を取った
    return NextResponse.json({ error: 'sending_in_progress' }, { status: 409 })
  }

  const latest = await getManagedAnnouncement(id)
  return NextResponse.json({
    discord: latest?.discord ?? existing.discord,
    outcome: result.outcome,
  })
}
