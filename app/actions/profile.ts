"use server"

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type UserProfileData = {
  id: string
  name: string
  studentId: string | null
  className: string | null
  user_profiles: {
    bio: string | null
    avatar_url: string | null
  } | null
}

export type MemberPublicProfile = {
  id: string
  name: string
  nameKana: string | null
  className: string | null
  bio: string | null
  avatarSignedUrl: string | null
}

export async function getUserProfile(): Promise<UserProfileData | null> {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData?.user) {
    return null
  }

  // Use Service Role Key for the DB query to bypass RLS on user_profiles.
  // Auth check is already done above with the user's session.
  const serviceClient = createAdminClient()

  const { data, error } = await serviceClient
    .from('users')
    .select('id, name, student_id, class_name, user_profiles(bio, avatar_url)')
    .eq('id', userData.user.id)
    .single()

  if (error || !data) {
    console.error('[getUserProfile] error:', error)
    return null
  }

  const profile = Array.isArray(data.user_profiles) ? data.user_profiles[0] : data.user_profiles

  return {
    id: data.id,
    name: data.name,
    studentId: data.student_id,
    className: data.class_name,
    user_profiles: profile,
  }
}

export async function updateUserProfile(bio: string, avatarUrl: string | null) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData?.user) {
    throw new Error('Not authenticated')
  }

  // Bypass RLS for upserting profile using Service Role Key, 
  // since we already authenticated the user.
  const serviceClient = createAdminClient()

  const { error } = await serviceClient
    .from('user_profiles')
    .upsert(
      { user_id: userData.user.id, bio, avatar_url: avatarUrl },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[updateUserProfile] error:', error)
    throw new Error('Failed to update profile: ' + error.message)
  }

  revalidatePath('/')
  return { success: true }
}

export async function getAvatarSignedUrl(avatarUrl: string | null): Promise<string | null> {
  if (!avatarUrl) return null

  // Bypass RLS and Storage JWT issues by using the Service Role Key
  const serviceClient = createAdminClient()

  const { data, error } = await serviceClient.storage
    .from('avatars')
    .createSignedUrl(avatarUrl, 3600) // 1 hour valid

  if (error || !data) {
    console.error('[getAvatarSignedUrl] error:', error)
    return null
  }

  return data.signedUrl
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error('Not authenticated')

  // ファイル名はサーバー側で構築し、パストラバーサルを防止する。
  // クライアントから受け取った fileName は使用しない。
  const safeFileName = `${userData.user.id}/${Date.now()}.jpg`

  const serviceClient = createAdminClient()
  const { data, error } = await serviceClient.storage
    .from('avatars')
    .upload(safeFileName, file, {
      contentType: file.type,
      upsert: true
    })

  if (error) {
    console.error('[uploadAvatar] upload error:', error.message)
    throw new Error(error.message)
  }

  return { path: data.path }
}

export async function getPublicMemberProfile(userId: string): Promise<MemberPublicProfile | null> {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData?.user) {
    return null
  }

  const serviceClient = createAdminClient()

  // Verify viewer is active member
  const { data: viewer } = await serviceClient
    .from('users')
    .select('role, status')
    .eq('id', userData.user.id)
    .single()

  if (!viewer || viewer.status !== 'active' || viewer.role === 'guest') {
    return null
  }

  // Fetch target user profile
  const { data: targetUser, error } = await serviceClient
    .from('users')
    .select('id, name, name_kana, class_name, user_profiles(bio, avatar_url)')
    .eq('id', userId)
    .single()

  if (error || !targetUser) {
    console.error('[getPublicMemberProfile] error:', error)
    return null
  }

  const profile = Array.isArray(targetUser.user_profiles)
    ? targetUser.user_profiles[0]
    : targetUser.user_profiles

  let avatarSignedUrl: string | null = null
  if (profile?.avatar_url) {
    avatarSignedUrl = await getAvatarSignedUrl(profile.avatar_url)
  }

  return {
    id: targetUser.id,
    name: targetUser.name,
    nameKana: targetUser.name_kana,
    className: targetUser.class_name,
    bio: profile?.bio || null,
    avatarSignedUrl,
  }
}

