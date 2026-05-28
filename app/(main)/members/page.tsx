import { redirect } from 'next/navigation'
import Link from 'next/link'
import { canManagePendingMembers } from '@/lib/members/permissions'
import { createClient } from '@/lib/supabase/server'
import { fetchMembersForViewer } from '@/lib/members/service'

import { MembersClient } from './members-client'

export default async function MembersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const result = await fetchMembersForViewer(user.id)
  if (!result.ok) {
    if (result.error === 'forbidden') redirect('/')
    redirect('/error')
  }

  return (
    <div className="container mx-auto max-w-8xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">メンバー一覧</h1>
        {canManagePendingMembers(result.viewerRole) && (
          <Link
            href="/members/approvals"
            className="inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            承認画面へ →
          </Link>
        )}
      </div>
      <MembersClient
        viewerRole={result.viewerRole}
        viewerId={user.id}
        members={result.members}
        driveGrantRole={process.env.GOOGLE_DRIVE_GRANT_ROLE ?? 'member'}
      />
    </div>
  )
}
