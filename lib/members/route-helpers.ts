import { createClient } from '@/lib/supabase/server'
import { getViewerRole } from '@/lib/members/service'

export async function getAuthenticatedViewerId(): Promise<string | null> {
  const supabase = await createClient()
  // getClaims() は JWT の検証で済むため、Auth API への往復が不要
  // （非対称鍵の JWKS はローカル検証される）。
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) return null
  return userId
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
