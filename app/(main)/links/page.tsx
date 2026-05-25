import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { listLinks } from '@/lib/links/service'
import { canCreateOfficialLink, OFFICIAL_LINK_NAMESPACE } from '@/lib/links/permissions'
import type { AppRole } from '@/lib/members/permissions'
import LinksClient from './links-client'

export default async function LinksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const admin = createAdminClient()
  const { data: userRow } = await admin
    .from('users')
    .select('role, student_id, name')
    .eq('id', user.id)
    .maybeSingle()

  if (!userRow) redirect('/signin')

  const role = userRow.role as AppRole
  const isFullAdmin = role === 'admin' || role === 'developer'
  const canOfficial = canCreateOfficialLink(role) // admin / developer / manager
  const links = await listLinks({
    createdBy: user.id,
    adminView: isFullAdmin,
    includeAllOfficial: !isFullAdmin && canOfficial,
  })

  // 公式リンクを複数ユーザーで共有するロール（admin/developer/manager）の場合、
  // 作成者名マップを取得してタブ表示に使う
  let usersMap: Record<string, string> = {}
  if (canOfficial && links.length > 0) {
    const creatorIds = [...new Set(links.map((l) => l.createdBy).filter(Boolean))] as string[]
    const { data: creators } = await admin
      .from('users')
      .select('id, name')
      .in('id', creatorIds)
    if (creators) {
      usersMap = Object.fromEntries(creators.map((c) => [c.id, c.name]))
    }
  }

  return (
    <LinksClient
      links={links}
      currentUserId={user.id}
      currentUserName={userRow.name}
      studentId={userRow.student_id ?? null}
      canCreateOfficial={canOfficial}
      officialNamespace={OFFICIAL_LINK_NAMESPACE}
      isAdmin={canOfficial}
      usersMap={usersMap}
    />
  )
}
