import { createClient } from '@/lib/supabase/server'
import { getViewerRole } from '@/lib/members/service'

export async function getAuthenticatedViewerId(): Promise<string | null> {
  const supabase = await createClient()
  // getUser() は必ず Auth API へ往復するが、getClaims() は JWT 検証で済む。
  // 非対称鍵(JWKS)へ移行すればローカル検証となり往復ゼロになる。
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
