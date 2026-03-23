// app/(auth)/components/signup-form.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function extractStudentIdFromEmail(email: string): string | null {
  const local = email.split('@')[0] ?? ''
  const m = local.match(/^it(\d{6})$/i)
  if (!m) return null
  return m[1]
}

function admissionYearFromStudentId(studentId: string): number | null {
  const m = studentId.match(/^(\d{2})\d{4}$/)
  if (!m) return null
  return 2000 + Number(m[1])
}

function inferClassAndAttendance(displayName: string): {
  className: string | null
  attendanceNumber: number | null
} {
  const m = displayName.match(/^([A-Za-z0-9]{3})-(\d{2})/)
  if (!m) return { className: null, attendanceNumber: null }
  return { className: m[1], attendanceNumber: Number(m[2]) }
}

function normalizeName(displayName: string): string {
  return displayName.replace(/^[A-Za-z0-9]{3}-\d{2}\s*/, '').trim()
}

function calcExpectedGraduationYear(
  admissionYear: number | null,
  className: string | null
): number | null {
  if (!admissionYear || !className) return null
  const head = className[0]?.toUpperCase()
  if (!head) return null

  const plus =
    head === 'N'
      ? 4
      : head === 'S' || head === 'G'
        ? 3
        : head === 'J' || head === 'T' || head === 'W'
          ? 2
          : null

  return plus ? admissionYear + plus : null
}

const CLASS_OPTIONS = ['SS1', 'SS2', 'SS3', 'GS1', 'NS1', 'JT1', 'TW1'] as const
const ATTENDANCE_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1)

type SignupFormProps = {
  /** 登録完了後に遷移したいパス（例: '/pending' や '/join'） */
  afterSuccessPath?: string
}

export function SignupForm({ afterSuccessPath = '/pending' }: SignupFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loadingInit, setLoadingInit] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')

  const studentId = useMemo(() => extractStudentIdFromEmail(email) ?? '', [email])

  const [className, setClassName] = useState('')
  const [attendanceNumber, setAttendanceNumber] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [nameKana, setNameKana] = useState('')
  const [expectedGraduationYear, setExpectedGraduationYear] = useState<number | ''>('')

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 初期化: auth ユーザー取得 & 既登録チェック
  useEffect(() => {
    const run = async () => {
      setLoadingInit(true)
      setInitError(null)

      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr || !userData.user) {
        router.replace('/signin')
        return
      }

      const e = userData.user.email ?? ''
      const dn =
        (userData.user.user_metadata?.full_name as string | undefined) ||
        (userData.user.user_metadata?.name as string | undefined) ||
        ''

      setEmail(e)
      setDisplayName(dn)
      setName(normalizeName(dn))

      const inf = inferClassAndAttendance(dn)
      if (inf.className) setClassName(inf.className)
      if (inf.attendanceNumber) setAttendanceNumber(inf.attendanceNumber)

      const { data: appUser, error: appUserErr } = await supabase
        .from('users')
        .select('status')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (appUserErr) {
        setInitError(appUserErr.message)
        setLoadingInit(false)
        return
      }

      if (appUser?.status === 'active') {
        router.replace('/')
        return
      }
      if (appUser && appUser.status !== 'active') {
        router.replace('/join')
        return
      }

      setLoadingInit(false)
    }

    run()
  }, [router, supabase])

  useEffect(() => {
    const admissionYear = admissionYearFromStudentId(studentId)
    const y = calcExpectedGraduationYear(admissionYear, className || null)
    setExpectedGraduationYear(y ?? '')
  }, [studentId, className])

  const onSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)

    if (!email) {
      setSubmitError('email が取得できません')
      setSubmitting(false)
      return
    }
    if (!studentId) {
      setSubmitError('student_id を email から抽出できません')
      setSubmitting(false)
      return
    }
    if (!className) {
      setSubmitError('class_name を選択してください')
      setSubmitting(false)
      return
    }
    if (attendanceNumber === '') {
      setSubmitError('attendance_number を選択してください')
      setSubmitting(false)
      return
    }
    if (!name.trim()) {
      setSubmitError('name を入力してください')
      setSubmitting(false)
      return
    }
    if (!nameKana.trim()) {
      setSubmitError('name_kana を入力してください')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        studentId,
        className,
        attendanceNumber,
        name,
        nameKana,
        expectedGraduationYear: expectedGraduationYear === '' ? null : expectedGraduationYear,
      }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSubmitError(json?.error ?? '登録に失敗しました')
      setSubmitting(false)
      return
    }

    router.replace(afterSuccessPath)
  }

  if (loadingInit) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-red-600">初期化に失敗しました: {initError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">ユーザー登録</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          必要情報を入力してください。登録後は承認待ちになります。
        </p>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">email（変更不可）</label>
          <input className="w-full rounded border px-3 py-2" value={email} readOnly />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">student_id（変更不可）</label>
          <input className="w-full rounded border px-3 py-2" value={studentId} readOnly />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">class_name</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          >
            <option value="">選択してください</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">attendance_number</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={attendanceNumber}
            onChange={(e) =>
              setAttendanceNumber(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">選択してください</option>
            {ATTENDANCE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">name（微調整可）</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">name_kana</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={nameKana}
            onChange={(e) => setNameKana(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            expected_graduation_year（微調整可）
          </label>
          <input
            className="w-full rounded border px-3 py-2"
            type="number"
            value={expectedGraduationYear}
            onChange={(e) =>
              setExpectedGraduationYear(
                e.target.value ? Number(e.target.value) : ''
              )
            }
          />
        </div>

        <button
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? '送信中…' : '登録する'}
        </button>
      </div>
    </div>
  )
}