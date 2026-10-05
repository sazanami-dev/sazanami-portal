import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pickDiscordUserId, updateDiscordNickname } from '@/lib/discord/member'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const {
    email,
    studentId,
    className,
    attendanceNumber,
    name,
    nameKana,
    expectedGraduationYear,
  } = body as {
    email: string
    studentId: string
    className: string | null
    attendanceNumber: number | null
    name: string
    nameKana: string
    expectedGraduationYear: number | null
  }

  if (!email || email !== (userData.user.email ?? '')) {
    return NextResponse.json({ error: 'email_mismatch' }, { status: 400 })
  }
  if (!studentId) return NextResponse.json({ error: 'student_id_required' }, { status: 400 })
  if (!name || !nameKana) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const userId = userData.user.id
  const isItAddress = /^it\d{6}@/i.test(email)
  const normalizedClassName = isItAddress ? className : 'XX0'

  const { data: existing, error: existingErr } = await supabase
    .from('users')
    .select('id,status')
    .eq('id', userId)
    .maybeSingle()

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'not_registered' }, { status: 404 })
  }
  if (existing.status !== 'renewing') {
    return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
  }

  const { error: updateErr } = await supabase
    .from('users')
    .update({
      student_id: studentId,
      class_name: normalizedClassName,
      attendance_number: attendanceNumber,
      name,
      name_kana: nameKana,
      expected_graduation_year: expectedGraduationYear,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  const discordUserId = pickDiscordUserId(userData.user.identities as unknown[] | undefined)

  let nicknameUpdated = false
  let nicknameSkippedReason: string | null = null

  if (!discordUserId) {
    nicknameSkippedReason = 'discord_not_linked'
  } else if (!botToken || !guildId) {
    nicknameSkippedReason = 'discord_env_missing'
  } else {
    const nicknameResult = await updateDiscordNickname({
      botToken,
      guildId,
      discordUserId,
      className: normalizedClassName,
      fullName: name,
    })
    if (nicknameResult.updated) {
      nicknameUpdated = true
    } else {
      nicknameSkippedReason = nicknameResult.reason
    }
  }

  return NextResponse.json(
    { ok: true, nicknameUpdated, nicknameSkippedReason },
    { status: 200 }
  )
}
