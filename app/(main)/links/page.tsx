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
  const isAdmin = role === 'admin' || role === 'developer'
  const links = await listLinks({ createdBy: user.id, adminView: isAdmin })

  // 管理者の場合、リンク作成者の名前を取得してマップを渡す
  let usersMap: Record<string, string> = {}
  if (isAdmin && links.length > 0) {
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
      canCreateOfficial={canCreateOfficialLink(role)}
      officialNamespace={OFFICIAL_LINK_NAMESPACE}
      isAdmin={isAdmin}
      usersMap={usersMap}
    />
  )
}
