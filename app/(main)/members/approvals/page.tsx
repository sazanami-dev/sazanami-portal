import Link from 'next/link'
import { redirect } from 'next/navigation'
import { canManagePendingMembers } from '@/lib/members/permissions'
import { fetchMembersForViewer, type MemberFullRow } from '@/lib/members/service'
import { createClient } from '@/lib/supabase/server'
import { ApprovalsClient } from './approvals-client'

export default async function MemberApprovalsPage() {
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
  if (!canManagePendingMembers(result.viewerRole)) {
    redirect('/members')
  }

  const pendingRows = (result.members as MemberFullRow[]).filter(
    (r) => r.status === 'pending'
  )

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">承認画面</h1>
          <p className="text-sm text-muted-foreground">
            pending ユーザーの承認と削除を行います。
          </p>
        </div>
        <Link
          href="/members"
          className="inline-flex rounded border px-3 py-1.5 text-sm hover:bg-muted"
        >
          メンバー一覧へ戻る
        </Link>
      </div>
      <ApprovalsClient rows={pendingRows} />
    </div>
  )
}
