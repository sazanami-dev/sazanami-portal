'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { SignupForm, type SignupSubmitData, type SignupInitialValues } from '@/app/(auth)/components/join-signup-section'
import { JoinAgreementSection, type AgreementSubmitData } from '@/app/(auth)/components/join-agreement-section'
import { JoinConnectionSection, type ConnectionUserInfo } from '@/app/(auth)/components/join-connection-section'
import { JoinStepList, type StepItem } from '@/app/(auth)/components/join-step-list'

type WizardStep = 'signup' | 'agreement' | 'connection'

const STORAGE_KEY = 'join-wizard-state'

type WizardState = {
  step: WizardStep
  signupData?: SignupSubmitData
  agreementData?: AgreementSubmitData
}

const userIcon = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const agreementIcon = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const connectionIcon = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

function buildSteps(current: WizardStep): StepItem[] {
  const order: WizardStep[] = ['signup', 'agreement', 'connection']
  const statusFor = (step: WizardStep): 'done' | 'current' | 'upcoming' => {
    const a = order.indexOf(step)
    const b = order.indexOf(current)
    if (a < b) return 'done'
    if (a === b) return 'current'
    return 'upcoming'
  }
  return [
    { label: 'ユーザー情報を登録する', status: statusFor('signup'), icon: userIcon },
    { label: '会則・情報共有に同意する', status: statusFor('agreement'), icon: agreementIcon },
    { label: 'アカウントを連携する', status: statusFor('connection'), icon: connectionIcon },
  ]
}

function loadState(): WizardState {
  if (typeof window === 'undefined') return { step: 'signup' }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { step: 'signup' }
    const parsed = JSON.parse(raw) as WizardState
    if (parsed && typeof parsed === 'object' && parsed.step) return parsed
    return { step: 'signup' }
  } catch {
    return { step: 'signup' }
  }
}

function saveState(state: WizardState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function clearState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {}
}

function splitName(full: string): { last: string; first: string } {
  const parts = (full ?? '').split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return { last: parts[0], first: parts.slice(1).join(' ') }
  }
  return { last: full ?? '', first: '' }
}

export function JoinWizard({ authUser }: { authUser: User }) {
  const [state, setState] = useState<WizardState>({ step: 'signup' })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

  const handleSignupSubmit = (data: SignupSubmitData) => {
    setState({ step: 'agreement', signupData: data })
  }

  const handleAgreementSubmit = (data: AgreementSubmitData) => {
    setState((prev) => ({ ...prev, step: 'connection', agreementData: data }))
  }

  const handleAgreementBack = () => {
    setState((prev) => ({ ...prev, step: 'signup' }))
  }

  const handleConnectionBack = () => {
    setState((prev) => ({ ...prev, step: 'agreement' }))
  }

  const handleFinalConfirm = async () => {
    if (!state.signupData || !state.agreementData) {
      throw new Error('登録データが不完全です。最初からやり直してください。')
    }
    const agreementTypes: string[] = ['terms_of_service']
    if (state.agreementData.techTrainAgreed) agreementTypes.push('tech_train')

    const res = await fetch('/api/auth/register-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state.signupData,
        agreementTypes,
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json?.error ?? '登録に失敗しました')
    }
    clearState()
    // router.refresh() は呼ばない。JoinConnectionSection の setIsSubmitted(true)
    // により JoinApprovalSection が表示される。
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      </div>
    )
  }

  const steps = buildSteps(state.step)

  const renderStep = () => {
    if (state.step === 'signup') {
      const initialValues: SignupInitialValues | undefined = state.signupData
        ? (() => {
            const sd = state.signupData!
            const n = splitName(sd.name)
            const k = splitName(sd.nameKana)
            return {
              studentId: sd.studentId,
              className: sd.className,
              attendanceNumber: sd.attendanceNumber,
              lastName: n.last,
              firstName: n.first,
              lastNameKana: k.last,
              firstNameKana: k.first,
              expectedGraduationYear: sd.expectedGraduationYear ?? undefined,
            }
          })()
        : undefined

      return (
        <SignupForm
          initialValues={initialValues}
          onSubmit={handleSignupSubmit}
        />
      )
    }

    if (state.step === 'agreement') {
      return (
        <JoinAgreementSection
          tosAgreed={state.agreementData?.tosAgreed ?? false}
          techTrainAgreed={state.agreementData?.techTrainAgreed ?? false}
          onSubmit={handleAgreementSubmit}
          onBack={handleAgreementBack}
        />
      )
    }

    const userInfo: ConnectionUserInfo = {
      email: state.signupData?.email ?? authUser.email ?? '',
      studentId: state.signupData?.studentId ?? '',
      className: state.signupData?.className ?? '',
      attendanceNumber: state.signupData?.attendanceNumber ?? '',
      name: state.signupData?.name ?? '',
      nameKana: state.signupData?.nameKana ?? '',
      expectedGraduationYear: state.signupData?.expectedGraduationYear ?? '',
    }

    return (
      <JoinConnectionSection
        authUser={authUser}
        userInfo={userInfo}
        agreementInfo={{
          tosAgreed: state.agreementData?.tosAgreed ?? false,
          techTrainAgreed: state.agreementData?.techTrainAgreed ?? false,
        }}
        onConfirm={handleFinalConfirm}
        onBack={handleConnectionBack}
      />
    )
  }

  return (
    <>
      <JoinStepList steps={steps} />
      <section className="space-y-6">{renderStep()}</section>
    </>
  )
}
