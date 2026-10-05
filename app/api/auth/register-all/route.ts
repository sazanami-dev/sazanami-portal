import { NextResponse } from 'next/server'
import { isAllowedEmailDomain } from '@/lib/auth/email-domain'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendPendingApprovalNotification } from '@/lib/discord/notify'

type RegisterAllBody = {
  email: string
  studentId: string
  className: string | null
  attendanceNumber: number | null
  name: string
  nameKana: string
  expectedGraduationYear: number | null
  agreementTypes?: ('terms_of_service' | 'tech_train')[]
}

const VALID_AGREEMENT_TYPES = ['terms_of_service', 'tech_train'] as const
type AgreementType = (typeof VALID_AGREEMENT_TYPES)[number]

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as RegisterAllBody | null
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const {
    email,
    studentId,
    className,
    attendanceNumber,
    name,
    nameKana,
    expectedGraduationYear,
    agreementTypes,
  } = body

  if (!email || email !== (userData.user.email ?? '')) {
    return NextResponse.json({ error: 'email_mismatch' }, { status: 400 })
  }
  if (!isAllowedEmailDomain(email)) {
    return NextResponse.json({ error: 'email_domain_not_allowed' }, { status: 403 })
  }
  if (!studentId) return NextResponse.json({ error: 'student_id_required' }, { status: 400 })
  if (!name || !nameKana) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const requestedAgreements = Array.isArray(agreementTypes) ? agreementTypes : []
  const normalizedAgreements = [...new Set(requestedAgreements)].filter(
    (t): t is AgreementType => VALID_AGREEMENT_TYPES.includes(t as AgreementType)
  )
  if (!normalizedAgreements.includes('terms_of_service')) {
    return NextResponse.json({ error: 'tos_required' }, { status: 400 })
  }

  const userId = userData.user.id
  const isItAddress = /^it\d{6}@/i.test(email)
  const normalizedClassName = isItAddress ? className : 'XX0'

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 })
  }

  const { error: insertUserErr } = await supabase.from('users').insert({
    id: userId,
    email,
    student_id: studentId,
    class_name: normalizedClassName,
    attendance_number: attendanceNumber,
    name,
    name_kana: nameKana,
    expected_graduation_year: expectedGraduationYear,
    status: 'pending',
  })

  if (insertUserErr) {
    return NextResponse.json({ error: insertUserErr.message }, { status: 500 })
  }

  const agreementRows = normalizedAgreements.map((type) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    agreement_type: type,
  }))

  const { error: insertAgreementErr } = await supabase
    .from('user_agreements')
    .insert(agreementRows)

  if (insertAgreementErr) {
    return NextResponse.json(
      { error: 'agreement_insert_failed', detail: insertAgreementErr.message },
      { status: 500 }
    )
  }

  const adminSupabase = createAdminClient()
  const identities = userData.user.identities ?? []
  const targetProviders = ['discord', 'github'] as const
  for (const identity of identities) {
    if (!targetProviders.includes(identity.provider as 'discord' | 'github')) continue
    const identityData = (identity.identity_data ?? {}) as Record<string, unknown>
    const providerUserId = identity.id
    const username =
      (typeof identityData.user_name === 'string' && identityData.user_name) ||
      (typeof identityData.preferred_username === 'string' && identityData.preferred_username) ||
      (typeof identityData.name === 'string' && identityData.name) ||
      (typeof identityData.full_name === 'string' && identityData.full_name) ||
      ''
    await adminSupabase
      .from('user_identities')
      .upsert(
        {
          id: crypto.randomUUID(),
          user_id: userId,
          provider: identity.provider,
          provider_user_id: providerUserId,
          username,
        },
        { onConflict: 'user_id,provider' }
      )
  }

  try {
    await sendPendingApprovalNotification({
      userId,
      email,
      name,
      studentId,
      className: normalizedClassName,
    })
  } catch (e) {
    console.error('[register-all] discord notify failed:', e)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
