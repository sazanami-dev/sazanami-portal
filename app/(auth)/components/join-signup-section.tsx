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
  //　先頭にクラス
  const headMatch = displayName.match(/^([A-Z]{2}\d)-(\d{2})/)
  if (headMatch) {
    return { className: headMatch[1], attendanceNumber: Number(headMatch[2]) }
  }
  // 末尾にクラス
  const tailMatch = displayName.match(/([A-Z]{2}\d)-(\d{2})$/)
  if (tailMatch) {
    return { className: tailMatch[1], attendanceNumber: Number(tailMatch[2]) }
  }
  return { className: null, attendanceNumber: null }
}
function normalizeName(displayName: string): string {
  return displayName
    .replace(/^[A-Z]{2}\d-\d{2}\s*/, '')   // 先頭のクラス-番号を除去
    .replace(/\s*[A-Z]{2}\d-\d{2}$/, '')    // 末尾のクラス-番号を除去
    .trim()
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
      : head === 'S' || head === 'G' || head === 'A'
        ? 3
        : head === 'J' || head === 'T' || head === 'W' || head === 'C'
          ? 2
          : null

  return plus ? admissionYear + plus : null
}

const CLASS_OPTIONS = [
  'NF1', 'NS1', 'NT1', 'NV1',
  'SF1', 'SF2', 'SS1', 'SS2', 'ST1', 'ST2',
  'JF1', 'JS1',
  'TF1', 'TS1',
  'GF1', 'GF2', 'GF3', 'GS1', 'GS2', 'GS3', 'GT1', 'GT2', 'GT3',
  'AF1', 'AF2', 'AS1', 'AS2', 'AT1', 'AT2',
  'WF1', 'WS1',
  'CF1', 'CS1',
] as const
const ATTENDANCE_OPTIONS = Array.from({ length: 40 }, (_, i) => i + 1)
const NON_IT_DEFAULT_CLASS = 'XX0'

function isItNumberEmail(value: string): boolean {
  return /^it\d{6}@/i.test(value)
}

type SignupFormProps = {
  /** 登録完了後に遷移したいパス（例: '/pending' や '/join'） */
  afterSuccessPath?: string
  mode?: 'signup' | 'renewing'
}

export function SignupForm({
  afterSuccessPath = '/pending',
  mode = 'signup',
}: SignupFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loadingInit, setLoadingInit] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')

  const isItEmail = isItNumberEmail(email)
  const extractedStudentId = extractStudentIdFromEmail(email)
  const [studentId, setStudentId] = useState('')

  const [className, setClassName] = useState('')
  const [attendanceNumber, setAttendanceNumber] = useState<number | ''>('')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastNameKana, setLastNameKana] = useState('')
  const [firstNameKana, setFirstNameKana] = useState('')
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
      const isItAddress = isItNumberEmail(e)
      // it メールなら学籍番号を自動抽出
      const extracted = extractStudentIdFromEmail(e)
      if (extracted) setStudentId(extracted)
      // 名前をスペースで姓・名に分割
      const normalized = normalizeName(dn)
      const parts = normalized.split(' ').filter(Boolean)
      if (parts.length >= 2) {
        setLastName(parts[0])
        setFirstName(parts.slice(1).join(' '))
      } else {
        setLastName(normalized)
      }

      const inf = inferClassAndAttendance(dn)
      if (!isItAddress) {
        setClassName(NON_IT_DEFAULT_CLASS)
      } else if (inf.className) {
        setClassName(inf.className)
      }
      if (inf.attendanceNumber) setAttendanceNumber(inf.attendanceNumber)

      const { data: appUser, error: appUserErr } = await supabase
        .from('users')
        .select(
          'status, email, student_id, class_name, attendance_number, name, name_kana, expected_graduation_year'
        )
        .eq('id', userData.user.id)
        .maybeSingle()

      if (appUserErr) {
        setInitError(appUserErr.message)
        setLoadingInit(false)
        return
      }

      if (mode === 'signup') {
        if (appUser?.status === 'active') {
          router.replace('/')
          return
        }
        if (appUser && appUser.status !== 'active') {
          router.replace('/join')
          return
        }
      } else {
        if (!appUser || appUser.status !== 'renewing') {
          router.replace('/join')
          return
        }

        setEmail(appUser.email ?? e)
        if (appUser.student_id) setStudentId(String(appUser.student_id))

        // Google 表示名にクラス・番号が含まれる場合は、renewing 時もそちらを優先する
        if (isItAddress && inf.className) {
          setClassName(inf.className)
        } else if (appUser.class_name) {
          setClassName(String(appUser.class_name))
        }
        if (inf.attendanceNumber != null) {
          setAttendanceNumber(inf.attendanceNumber)
        } else if (appUser.attendance_number != null) {
          setAttendanceNumber(Number(appUser.attendance_number))
        }
        if (appUser.name) {
          const nameParts = String(appUser.name).split(' ').filter(Boolean)
          if (nameParts.length >= 2) {
            setLastName(nameParts[0])
            setFirstName(nameParts.slice(1).join(' '))
          } else {
            setLastName(String(appUser.name))
          }
        }
        if (appUser.name_kana) {
          const kanaParts = String(appUser.name_kana).split(' ').filter(Boolean)
          if (kanaParts.length >= 2) {
            setLastNameKana(kanaParts[0])
            setFirstNameKana(kanaParts.slice(1).join(' '))
          } else {
            setLastNameKana(String(appUser.name_kana))
          }
        }
        if (appUser.expected_graduation_year != null) {
          setExpectedGraduationYear(Number(appUser.expected_graduation_year))
        }
      }

      setLoadingInit(false)
    }

    run()
  }, [mode, router, supabase])

  useEffect(() => {
    if (!email) return
    if (!isItNumberEmail(email)) {
      setClassName(NON_IT_DEFAULT_CLASS)
    }
  }, [email])

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
    if (!studentId.trim()) {
      setSubmitError('学籍番号を入力してください')
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
    if (!lastName.trim() || !firstName.trim()) {
      setSubmitError('姓と名を入力してください')
      setSubmitting(false)
      return
    }
    if (!lastNameKana.trim() || !firstNameKana.trim()) {
      setSubmitError('カナの姓と名を入力してください')
      setSubmitting(false)
      return
    }

    const submitPath = mode === 'renewing' ? '/api/auth/renew' : '/api/auth/signup'

    const res = await fetch(submitPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        studentId,
        className,
        attendanceNumber,
        name: `${lastName} ${firstName}`,
        nameKana: `${lastNameKana} ${firstNameKana}`,
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
        <h2 className="text-lg font-semibold">
          {mode === 'renewing' ? '登録情報の更新' : 'ユーザー登録'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === 'renewing'
            ? '必要情報を確認・更新してください。'
            : '必要情報を入力してください。登録後は承認待ちになります。'}
        </p>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">メールアドレス（変更不可）</label>
          <input className="w-full rounded border px-3 py-2" value={email} readOnly />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            学籍番号{isItEmail ? '（メールから自動取得）' : ''}
          </label>
          <input
            className="w-full rounded border px-3 py-2"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            readOnly={isItEmail}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">クラス名</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={!isItEmail}
          >
            <option value="">選択してください</option>
            <option value={NON_IT_DEFAULT_CLASS}>{NON_IT_DEFAULT_CLASS}</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">出席番号</label>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">姓</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">名</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">姓（カナ）</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={lastNameKana}
              onChange={(e) => setLastNameKana(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">名（カナ）</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={firstNameKana}
              onChange={(e) => setFirstNameKana(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            卒業年
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
          {submitting ? '送信中…' : mode === 'renewing' ? '更新する' : '登録する'}
        </button>
      </div>
    </div>
  )
}