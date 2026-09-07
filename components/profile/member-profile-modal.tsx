'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPublicMemberProfile, MemberPublicProfile } from '@/app/actions/profile'
import { ProfileMarkdownView } from '@/components/profile/profile-markdown-view'
import { User, X, Loader2 } from 'lucide-react'

interface MemberProfileModalProps {
  userId: string | null
  onClose: () => void
}

function ProfileModalDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<MemberPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    getPublicMemberProfile(userId)
      .then((data) => {
        if (!isMounted) return
        if (!data) {
          setError('プロフィールを取得できませんでした。')
        } else {
          setProfile(data)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Failed to fetch profile:', err)
        setError('プロフィールの取得中にエラーが発生しました。')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  // ESCキーで閉じる & 背景スクロール抑制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200">
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          aria-label="閉じる"
        >
          <X className="h-5 w-5" />
        </button>

        {/* コンテンツ領域 */}
        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm">プロフィールを読み込み中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                閉じる
              </button>
            </div>
          ) : profile ? (
            <div className="flex flex-col space-y-6">
              {/* ユーザー基本情報（アバター・名前・クラス） */}
              <div className="flex flex-col items-center text-center">
                {profile.avatarSignedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarSignedUrl}
                    alt={`${profile.name}のアバター`}
                    className="h-24 w-24 rounded-full object-cover shadow-sm bg-muted border border-border"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted shadow-xs border border-border">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                {profile.nameKana && (
                  <p className="mt-3 text-xs font-medium text-muted-foreground/80 tracking-widest">
                    {profile.nameKana}
                  </p>
                )}
                <h2 id="profile-modal-title" className={`${profile.nameKana ? 'mt-0.5' : 'mt-4'} text-xl font-bold tracking-tight`}>
                  {profile.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {profile.className || 'クラス未設定'}
                </p>
              </div>

              {/* 自己紹介文 */}
              <div className="rounded-lg border bg-muted/20 p-4">
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  自己紹介
                </h3>
                {profile.bio ? (
                  <ProfileMarkdownView content={profile.bio} />
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    自己紹介はまだ設定されていません
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function MemberProfileModal({ userId, onClose }: MemberProfileModalProps) {
  if (!userId) return null
  return <ProfileModalDialog key={userId} userId={userId} onClose={onClose} />
}
