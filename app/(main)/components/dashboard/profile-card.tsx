import React from 'react'
import { getUserProfile, getAvatarSignedUrl } from '@/app/actions/profile'
import { ProfileCardClient } from './profile-card-client'

export async function ProfileCard() {
  const userProfile = await getUserProfile()
  
  if (!userProfile) {
    // If no profile is found or not logged in, we could return a skeleton or null
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-6 text-card-foreground shadow backdrop-blur-md">
        <p className="text-sm text-muted-foreground">プロフィール情報が取得できません</p>
      </div>
    )
  }

  const avatarSignedUrl = await getAvatarSignedUrl(userProfile.user_profiles?.avatar_url || null)

  return (
    <ProfileCardClient 
      userProfile={userProfile} 
      avatarSignedUrl={avatarSignedUrl} 
    />
  )
}
