import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_TYPES = ['terms_of_service', 'tech_train'] as const
type AgreementType = (typeof VALID_TYPES)[number]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const singleType = (body as { agreement_type?: string } | null)?.agreement_type
  const multiTypes = (body as { agreement_types?: string[] } | null)?.agreement_types
  const requestedTypes = [
    ...(typeof singleType === 'string' ? [singleType] : []),
    ...(Array.isArray(multiTypes) ? multiTypes : []),
  ]
  const agreementTypes = [...new Set(requestedTypes)].filter((type): type is AgreementType =>
    VALID_TYPES.includes(type as AgreementType)
  )

  if (agreementTypes.length === 0) {
    return NextResponse.json({ error: 'invalid_agreement_type' }, { status: 400 })
  }

  const userId = userData.user.id

  const { data: existingRows } = await supabase
    .from('user_agreements')
    .select('agreement_type')
    .eq('user_id', userId)
    .in('agreement_type', agreementTypes)

  const existingTypes = new Set(
    (existingRows ?? []).map((row: { agreement_type: AgreementType }) => row.agreement_type)
  )
  const typesToInsert = agreementTypes.filter((type) => !existingTypes.has(type))

  if (typesToInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from('user_agreements')
      .insert(
        typesToInsert.map((type) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          agreement_type: type,
        }))
      )

    if (insertErr) {
      console.error('[api/agreement] insert failed:', insertErr)
      return NextResponse.json({ error: 'insert_failed', detail: insertErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    agreed: true,
    inserted_types: typesToInsert,
    already_types: agreementTypes.filter((type) => existingTypes.has(type)),
  })
}
