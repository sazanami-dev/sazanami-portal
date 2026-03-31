import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function pickDiscordUserId(identities: unknown[] | undefined): string | null {
  const discord = (identities ?? []).find((i) => {
    const x = i as Record<string, unknown>
    return x.provider === 'discord'
  }) as Record<string, unknown> | undefined

  if (!discord) return null

  const d = (discord.identity_data ?? {}) as Record<string, unknown>
  const cands = [d.sub, d.user_id, discord.provider_id].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  )
  return cands[0] ?? null
}

export async function POST() {
  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const user = userData.user

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
  const guildId = process.env.DISCORD_GUILD_ID
  const roleId = process.env.DISCORD_ROLE_ID_MEMBER
  if (!botToken || !guildId || !roleId) {
    return NextResponse.json({ error: 'discord_env_missing' }, { status: 500 })
  }

  const discordUserId = pickDiscordUserId(user.identities as unknown[] | undefined)
  if (!discordUserId) {
    return NextResponse.json({ error: 'discord_not_linked' }, { status: 400 })
  }

  const memberRes = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
    { headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store' }
  )

  if (memberRes.status === 404) {
    return NextResponse.json({ joined: false, roleGranted: false }, { status: 200 })
  }
  if (!memberRes.ok) {
    const detail = await memberRes.text().catch(() => '')
    return NextResponse.json({ error: 'member_check_failed', detail }, { status: 502 })
  }
  const member = await memberRes.json()
  const currentRoles: string[] = member.roles ?? []

  if (currentRoles.includes(roleId)) {
    await supabase
      .from('user_identities')
      .update({ is_server_joined: true })
      .eq('user_id', user.id)
      .eq('provider', 'discord')
    return NextResponse.json({ joined: true, roleGranted: true, alreadyHadRole: true })
  }
  const roleRes = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } }
  )

  if (!roleRes.ok) {
    const detail = await roleRes.text().catch(() => '')
    return NextResponse.json({ error: 'role_assign_failed', detail }, { status: 502 })
  }

  await supabase
    .from('user_identities')
    .update({ is_server_joined: true })
    .eq('user_id', user.id)
    .eq('provider', 'discord')

  return NextResponse.json({ joined: true, roleGranted: true, alreadyHadRole: false })
}