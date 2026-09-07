"use client"

import React from 'react'
import { UserProfileData } from '@/app/actions/profile'
import { User } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

type ProfileCardClientProps = {
  userProfile: UserProfileData
  avatarSignedUrl: string | null
}

export function ProfileCardClient({ userProfile, avatarSignedUrl }: ProfileCardClientProps) {
  const bio = userProfile.user_profiles?.bio || ''

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-6 text-card-foreground shadow backdrop-blur-md">
      {avatarSignedUrl ? (
        <img
          src={avatarSignedUrl}
          alt="User avatar"
          className="h-24 w-24 rounded-full object-cover bg-muted"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <User className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      <h3 className="mt-4 text-xl font-semibold">{userProfile.name}</h3>
      <p className="text-sm text-muted-foreground">
        {userProfile.className || 'クラス未設定'} - {userProfile.studentId || '学籍番号未設定'}
      </p>

      <div className="mt-4 w-full">
        {bio ? (
          <div className="line-clamp-2 text-sm text-muted-foreground prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                // Prevent links from navigating out on the dashboard preview
                a: ({ ...props }) => <span className="text-primary underline" {...props} />
              }}
            >
              {bio}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">自己紹介が設定されていません</p>
        )}
      </div>

      <Link
        href="/profile/edit"
        className="mt-6 w-full rounded-md bg-secondary px-4 py-2 text-center text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        プロフィール編集
      </Link>
    </div>
  )
}
