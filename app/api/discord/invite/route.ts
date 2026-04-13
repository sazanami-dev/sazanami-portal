import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDiscordInvite } from '@/lib/discord/invite'

export async function POST() {
  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const { data: appUser, error: appUserErr } = await supabase
  .from('users')
  .select('status')
  .eq('id', userData.user.id)
  .maybeSingle()

if (appUserErr) {
  return NextResponse.json({ error: 'user_status_check_failed' }, { status: 500 })
}
if (!appUser || appUser.status !== 'active') {
  return NextResponse.json({ error: 'forbidden_until_active' }, { status: 403 })
}

  const botToken = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_INVITE_CHANNEL_ID
  if (!botToken || !channelId) {
    return NextResponse.json({ error: 'discord_env_missing' }, { status: 500 })
  }

  const inviteResult = await createDiscordInvite({
    botToken,
    channelId,
    maxAge: process.env.DISCORD_INVITE_MAX_AGE,
  })

  if (!inviteResult.ok) {
    return NextResponse.json(
      { error: 'invite_create_failed', detail: inviteResult.detail },
      { status: 502 }
    )
  }

  return NextResponse.json({ inviteUrl: inviteResult.inviteUrl })
}