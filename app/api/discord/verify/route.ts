import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  addRoleToMember,
  getGuildMember,
  pickDiscordUserId,
  updateDiscordNickname,
} from '@/lib/discord/member'

export async function POST() {
  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const user = userData.user

  const { data: appUser, error: appUserErr } = await supabase
    .from('users')
    .select('status, class_name, name')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (appUserErr) {
    return NextResponse.json({ error: 'user_status_check_failed' }, { status: 500 })
  }
  if (!appUser || !['active', 'pending'].includes(appUser.status)) {
    return NextResponse.json({ error: 'forbidden_status', detail: appUser?.status ?? 'no_user' }, { status: 403 })
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

  const memberResult = await getGuildMember({ botToken, guildId, discordUserId })
  if (!memberResult.found && memberResult.notFound) {
    return NextResponse.json({ joined: false, roleGranted: false }, { status: 200 })
  }
  if (!memberResult.found) {
    console.error('[discord/verify] getGuildMember failed:', memberResult.detail)
    return NextResponse.json({ error: 'member_check_failed', detail: memberResult.detail }, { status: 502 })
  }
  const currentRoles: string[] = memberResult.roles

  const alreadyHadRole = currentRoles.includes(roleId)

  if (!alreadyHadRole) {
    const roleResult = await addRoleToMember({ botToken, guildId, discordUserId, roleId })
    if (!roleResult.ok) {
      console.error('[discord/verify] addRoleToMember failed:', roleResult.detail)
      return NextResponse.json({ error: 'role_assign_failed', detail: roleResult.detail }, { status: 502 })
    }
  }

  const nicknameResult = await updateDiscordNickname({
    botToken,
    guildId,
    discordUserId,
    className: appUser.class_name ?? null,
    fullName: appUser.name ?? null,
  })
  if (!nicknameResult.updated && nicknameResult.reason === 'nickname_update_failed') {
    console.warn('[discord/verify] updateDiscordNickname failed (non-fatal):', nicknameResult.detail)
  }

  await supabase
    .from('user_identities')
    .update({ is_server_joined: true })
    .eq('user_id', user.id)
    .eq('provider', 'discord')

  return NextResponse.json({
    joined: true,
    roleGranted: true,
    alreadyHadRole,
    nicknameUpdated: nicknameResult.updated,
    nicknameSkippedReason: nicknameResult.updated ? null : nicknameResult.reason,
  })
}
