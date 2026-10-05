import { redirect } from 'next/navigation'
import { getUserProfile, getAvatarSignedUrl } from '@/app/actions/profile'
import { ProfileEditForm } from './profile-edit-form'

export default async function ProfileEditPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/signin')
  }

  const avatarSignedUrl = await getAvatarSignedUrl(userProfile.user_profiles?.avatar_url || null)

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black md:px-8">
      <div className="mx-auto max-w-2xl">
        <ProfileEditForm
          userProfile={userProfile}
          avatarSignedUrl={avatarSignedUrl}
        />
      </div>
    </div>
  )
}
