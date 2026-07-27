import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { canManagePendingMembers } from '@/lib/members/permissions'
import { fetchMembersForViewer, type MemberFullRow } from '@/lib/members/service'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalsClient } from './approvals-client'

export default async function MemberApprovalsPage() {
  // シェルと権限判定に role が要るのでここだけ待つ（1往復）
  const { userId, role, error } = await requireViewerRole()
  if (error === 'unauthenticated') redirect('/signin')
  if (!userId || !role) redirect('/error')
  if (!canManagePendingMembers(role)) redirect('/members')

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
      <Suspense fallback={<ApprovalsSkeleton />}>
        <ApprovalsSection viewerId={userId} />
      </Suspense>
    </div>
  )
}

async function ApprovalsSection({ viewerId }: { viewerId: string }) {
  const result = await fetchMembersForViewer(viewerId)
  if (!result.ok) {
    if (result.error === 'forbidden') redirect('/')
    redirect('/error')
  }

  const pendingRows = (result.members as MemberFullRow[]).filter(
    (r) => r.status === 'pending'
  )

  return <ApprovalsClient rows={pendingRows} />
}

function ApprovalsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
