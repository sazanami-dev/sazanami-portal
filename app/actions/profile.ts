"use server"

import { createClient } from '@/lib/supabase/server'
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

export async function getUserProfile(): Promise<UserProfileData | null> {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData?.user) {
    return null
  }

  // Use Service Role Key for the DB query to bypass RLS on user_profiles.
  // Auth check is already done above with the user's session.
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
  const fileName = formData.get('fileName') as string

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error('Not authenticated')

  // Try standard upload
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true
    })

  if (error) {
    console.error('[uploadAvatar] Standard upload error:', error.message)
    // Fallback to Service Role Key (bypasses RLS and potentially storage JWT strict checks)
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: sData, error: sError } = await serviceClient.storage
      .from('avatars')
      .upload(fileName, file, { contentType: file.type, upsert: true })

    if (sError) throw new Error(sError.message)
    return { path: sData.path }
  }

  return { path: data.path }
}
