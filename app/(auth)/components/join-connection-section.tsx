"use client"

import type { User, UserIdentity } from '@supabase/supabase-js'
import { LinkIdentityButton } from '@/app/(auth)/components/link-identity-button'
import { UnlinkIdentityButton } from '@/app/(auth)/components/unlink-identity-button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

// shadcn/ui の Dialog コンポーネントをインポート
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import JoinApprovalSection from '@/app/(auth)/components/join-approval-section'

export type ConnectionUserInfo = {
  email: string
  studentId: string
  className: string
  attendanceNumber: number | string
  name: string
  nameKana: string
  expectedGraduationYear: number | string | null
}

export type ConnectionAgreementInfo = {
  tosAgreed: boolean
  techTrainAgreed: boolean
}

function pickIdentity(
  identities: UserIdentity[] | undefined,
  provider: UserIdentity['provider']
): UserIdentity | undefined {
  return (identities ?? []).find((i) => i.provider === provider)
}

function getIdentityDisplay(identity: UserIdentity) {
  const d = (identity.identity_data ?? {}) as Record<string, unknown>

  const username =
    (typeof d.user_name === 'string' && d.user_name) ||
    (typeof d.preferred_username === 'string' && d.preferred_username) ||
    (typeof d.name === 'string' && d.name) ||
    (typeof d.full_name === 'string' && d.full_name) ||
    (typeof d.login === 'string' && d.login) ||
    null

  const avatarUrl =
    (typeof d.avatar_url === 'string' && d.avatar_url) ||
    (typeof d.picture === 'string' && d.picture) ||
    null

  return { username, avatarUrl }
}

export function JoinConnectionSection({
  authUser,
  canJoinOrg,
  isDiscordJoined,
  isGitHubJoined,
  userInfo,
  agreementInfo,
  onConfirm,
  onBack,
}: {
  authUser: User
  canJoinOrg: boolean
  isDiscordJoined: boolean
  isGitHubJoined: boolean
  /** モーダルに表示する登録情報。未指定時は authUser から最低限を構築。 */
  userInfo?: ConnectionUserInfo
  /** モーダルに表示する同意事項。 */
  agreementInfo?: ConnectionAgreementInfo
  /** モーダル確認時のコールバック。未指定時は従来通り JoinApprovalSection に遷移するのみ。 */
  onConfirm?: () => Promise<void> | void
  /** 前のステップへ戻る場合に指定 */
  onBack?: () => void
}) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const hasDiscordEmailError = searchParams.get('error') === 'discord_no_email'

  const handleOpenModal = () => {
    setSubmitError(null)
    setIsModalOpen(true)
  }

  const handleConfirmRegister = async () => {
    if (onConfirm) {
      setSubmitting(true)
      setSubmitError(null)
      try {
        await onConfirm()
        setIsModalOpen(false)
        setIsSubmitted(true)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : '登録に失敗しました')
      } finally {
        setSubmitting(false)
      }
      return
    }
    setIsModalOpen(false)
    setIsSubmitted(true)
  }

  const identities = authUser.identities ?? []
  const github = pickIdentity(identities, 'github')
  const discord = pickIdentity(identities, 'discord')
  const hasBothLinked = Boolean(discord && github)

  const displayInfo: ConnectionUserInfo = userInfo ?? {
    email: authUser.email ?? '',
    studentId: '',
    className: '',
    attendanceNumber: '',
    name: '',
    nameKana: '',
    expectedGraduationYear: '',
  }

  if (isSubmitted) {
    return <JoinApprovalSection />
  }

  return (
    <>
    <div className="space-y-6">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={submitting}
          className="-ml-2"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          戻る
        </Button>
      )}
      <div>
        <h2 className="text-lg font-semibold">アカウント連携</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GitHub・Discord を連携すると、承認後すぐにすべての機能を利用できます。
        </p>
      </div>

      {hasDiscordEmailError && (
        <div className="rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-200">
          Discordアカウントにメールアドレスが登録されていません。
          <a
            href="https://discord.com/settings/account"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline underline-offset-2"
          >
            Discordの設定
          </a>
          からメールアドレスを追加してから、再度連携してください。
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Discord */}
        <Card className="flex min-h-[240px] flex-col">
          <CardHeader className="items-center pb-2">
            <CardTitle className="text-base font-medium">Discord</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-3">
            {discord ? (
              (() => {
                const { username, avatarUrl } = getIdentityDisplay(discord)
                return (
                  <>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-12 w-12 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted" />
                    )}
                    <span className="text-sm font-medium">
                      {username ?? '（ユーザー名不明）'}
                    </span>
                  </>
                )
              })()
            ) : (
              <div className="text-sm text-muted-foreground">未連携</div>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            {discord ? (
              <UnlinkIdentityButton identity={discord} />
            ) : (
              <LinkIdentityButton provider="discord" next="/join">
                連携する
              </LinkIdentityButton>
            )}
          </CardFooter>
        </Card>

        {/* GitHub */}
        <Card className="flex min-h-[240px] flex-col">
          <CardHeader className="items-center pb-2">
            <CardTitle className="text-base font-medium">GitHub</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-3">
            {github ? (
              (() => {
                const { username, avatarUrl } = getIdentityDisplay(github)
                return (
                  <>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-12 w-12 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted" />
                    )}
                    <span className="text-sm font-medium">
                      {username ?? '（ユーザー名不明）'}
                    </span>
                  </>
                )
              })()
            ) : (
              <div className="text-sm text-muted-foreground">未連携</div>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            {github ? (
              <UnlinkIdentityButton identity={github} />
            ) : (
              <LinkIdentityButton provider="github" next="/join">
                連携する
              </LinkIdentityButton>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="flex items-center justify-center p-10">
        <Button 
          size="auto" 
          disabled={!hasBothLinked} 
          onClick={handleOpenModal}
          className='h-12'
        >
          <div className="mx-12 text-lg">登録</div>
        </Button>
      </div>

      
    </div>
    {/* 確認用モーダル (Dialog) の追加 */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>登録情報の最終確認</DialogTitle>
            <DialogDescription>
              以下の内容で登録申請を行います。お間違いがないか確認してください。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <dl className="grid grid-cols-3 gap-y-3 text-sm">
              <dt className="text-muted-foreground font-medium">メールアドレス</dt>
              <dd className="col-span-2">{displayInfo.email}</dd>

              <dt className="text-muted-foreground font-medium">学籍番号</dt>
              <dd className="col-span-2">{displayInfo.studentId}</dd>

              <dt className="text-muted-foreground font-medium">クラス名</dt>
              <dd className="col-span-2">{displayInfo.className}</dd>

              <dt className="text-muted-foreground font-medium">出席番号</dt>
              <dd className="col-span-2">{displayInfo.attendanceNumber}</dd>

              <dt className="text-muted-foreground font-medium">名前</dt>
              <dd className="col-span-2">{displayInfo.name}</dd>

              <dt className="text-muted-foreground font-medium">フリガナ</dt>
              <dd className="col-span-2">{displayInfo.nameKana}</dd>

              <dt className="text-muted-foreground font-medium">卒業年</dt>
              <dd className="col-span-2">{displayInfo.expectedGraduationYear || '—'}</dd>
            </dl>

            {agreementInfo && (
              <div className="border-t pt-4">
                <dl className="grid grid-cols-3 gap-y-3 text-sm">
                  <dt className="text-muted-foreground font-medium">さざなみ開発会則</dt>
                  <dd className="col-span-2">
                    {agreementInfo.tosAgreed ? '同意する' : '同意しない'}
                  </dd>

                  <dt className="text-muted-foreground font-medium">TechTrain への情報共有</dt>
                  <dd className="col-span-2">
                    {agreementInfo.techTrainAgreed ? '同意する' : '同意しない'}
                  </dd>
                </dl>
              </div>
            )}

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmRegister} disabled={submitting}>
              {submitting ? '送信中…' : 'この内容で登録する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}