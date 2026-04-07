import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // email と studentId はサーバー側でも検証
  if (!email || email !== (userData.user.email ?? '')) {
    return NextResponse.json({ error: 'email_mismatch' }, { status: 400 })
  }
  if (!studentId) return NextResponse.json({ error: 'student_id_required' }, { status: 400 })
  if (!name || !nameKana) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const userId = userData.user.id
  const isItAddress = /^it\d{6}@/i.test(email)
  const normalizedClassName = isItAddress ? className : 'XX0'

  // 既に登録があるなら弾く（
  const { data: existing } = await supabase
    .from('users')
    .select('id,status')
    .eq('id', userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 })
  }

  const { error: insertErr } = await supabase.from('users').insert({
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

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}