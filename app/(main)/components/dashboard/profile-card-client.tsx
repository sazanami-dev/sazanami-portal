"use client"

import React, { useState } from 'react'
import { UserProfileData } from '@/app/actions/profile'
import { User } from 'lucide-react'
import Link from 'next/link'
import { MemberProfileModal } from '@/components/profile/member-profile-modal'

type ProfileCardClientProps = {
  userProfile: UserProfileData
  avatarSignedUrl: string | null
}

export function ProfileCardClient({ userProfile, avatarSignedUrl }: ProfileCardClientProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-6 text-card-foreground shadow backdrop-blur-md">
      <button
        type="button"
        onClick={() => setIsProfileModalOpen(true)}
        className="group relative rounded-full focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
        title="プロフィールを表示"
      >
        {avatarSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSignedUrl}
            alt="User avatar"
            className="h-50 w-50 rounded-full object-cover bg-muted transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-50 w-50 items-center justify-center rounded-full bg-muted transition-transform group-hover:scale-105">
            <User className="h-25 w-25 text-muted-foreground" />
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => setIsProfileModalOpen(true)}
        className="mt-4 text-xl font-semibold text-foreground hover:text-primary hover:underline transition-colors focus:outline-hidden cursor-pointer"
        title="プロフィールを表示"
      >
        {userProfile.name}
      </button>
      <p className="text-sm text-muted-foreground">
        {userProfile.className || 'クラス未設定'} - {userProfile.studentId || '学籍番号未設定'}
      </p>

      <div className="mt-6 w-full">
        <Link
          href="/profile/edit"
          className="block w-full rounded-md bg-secondary px-3 py-2 text-center text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          プロフィール編集
        </Link>
      </div>

      <MemberProfileModal
        userId={isProfileModalOpen ? userProfile.id : null}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  )
}
