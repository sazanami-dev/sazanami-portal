import { createClient } from '@/lib/supabase/server'
import { getViewerRole } from '@/lib/members/service'

export async function getAuthenticatedViewerId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function requireViewerRole() {
  const userId = await getAuthenticatedViewerId()
  if (!userId) {
    return { userId: null as string | null, role: null, error: 'unauthenticated' as const }
  }
  const role = await getViewerRole(userId)
  if (!role) {
    return { userId, role: null, error: 'not_registered' as const }
  }
  return { userId, role, error: null as null }
}
