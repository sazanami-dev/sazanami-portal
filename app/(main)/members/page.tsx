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
      <div>
        <h1 className="text-2xl font-bold">メンバー一覧</h1>
        {canManagePendingMembers(result.viewerRole) && (
          <div className="mt-3">
            <Link
              href="/members/approvals"
              className="inline-flex rounded border px-3 py-1.5 text-sm hover:bg-muted"
            >
              承認画面へ
            </Link>
          </div>
        )}
      </div>
      <MembersClient
        viewerRole={result.viewerRole}
        viewerId={user.id}
        members={result.members}
      />
    </div>
  )
}
