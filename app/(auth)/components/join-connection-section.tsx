"use client" // useStateを使用するため追加（Next.jsのApp Routerの場合必須です）

import type { User, UserIdentity } from '@supabase/supabase-js'
import { LinkIdentityButton } from '@/app/(auth)/components/link-identity-button'
import { UnlinkIdentityButton } from '@/app/(auth)/components/unlink-identity-button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

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
}: {
  authUser: User
  canJoinOrg: boolean
  isDiscordJoined: boolean
  isGitHubJoined: boolean
}) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  // モーダルの開閉状態を管理するstateを追加
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 仮のユーザー情報（後で実際のデータに置き換えてください）
  const dummyUserInfo = {
    email: "student@example.com",
    studentId: "2300000",
    className: "NV1",
    attendanceNumber: "28",
    name: "山田 太郎",
    furigana: "ヤマダ タロウ",
    graduationYear: "2027年",
  }

  // 登録ボタンを押した時はまずモーダルを開く
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  // モーダル内の「登録する」を押した時の処理
  const handleConfirmRegister = () => {
    setIsModalOpen(false)
    setIsSubmitted(true)
  }

  const identities = authUser.identities ?? []
  const github = pickIdentity(identities, 'github')
  const discord = pickIdentity(identities, 'discord')
  const hasBothLinked = Boolean(discord && github)

  if (isSubmitted) {
    return <JoinApprovalSection />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">アカウント連携</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GitHub・Discord を連携すると、承認後すぐにすべての機能を利用できます。
        </p>
      </div>

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
          onClick={handleOpenModal} // ここを handleOpenModal に変更
          className='h-12'
        >
          <div className="mx-12 text-lg">登録</div>
        </Button>
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
              <dd className="col-span-2">{dummyUserInfo.email}</dd>
              
              <dt className="text-muted-foreground font-medium">学籍番号</dt>
              <dd className="col-span-2">{dummyUserInfo.studentId}</dd>
              
              <dt className="text-muted-foreground font-medium">クラス名</dt>
              <dd className="col-span-2">{dummyUserInfo.className}</dd>
              
              <dt className="text-muted-foreground font-medium">出席番号</dt>
              <dd className="col-span-2">{dummyUserInfo.attendanceNumber}</dd>
              
              <dt className="text-muted-foreground font-medium">名前</dt>
              <dd className="col-span-2">{dummyUserInfo.name}</dd>
              
              <dt className="text-muted-foreground font-medium">フリガナ</dt>
              <dd className="col-span-2">{dummyUserInfo.furigana}</dd>
              
              <dt className="text-muted-foreground font-medium">卒業年</dt>
              <dd className="col-span-2">{dummyUserInfo.graduationYear}</dd>
            </dl>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmRegister}>
              この内容で登録する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}