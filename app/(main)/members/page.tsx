import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { canManagePendingMembers } from '@/lib/members/permissions'
import { fetchMembersForViewer } from '@/lib/members/service'
import { requireViewerRole } from '@/lib/members/route-helpers'

import { MembersClient } from './members-client'
import { MembersSkeleton } from './members-skeleton'

export default async function MembersPage() {
  // シェル表示に role が要るのでここだけ待つ（1往復）
  const { userId, role, error } = await requireViewerRole()
  if (error === 'unauthenticated') redirect('/signin')
  if (!userId || !role) redirect('/error')

  return (
    <div className="container mx-auto max-w-8xl space-y-6 p-6">
      {/* 見出しとボタンは即座に確定表示される */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">メンバー一覧</h1>
        {canManagePendingMembers(role) && (
          <Link
            href="/members/approvals"
            className="inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            承認画面へ →
          </Link>
        )}
      </div>

      {/* 重いDB取得はここだけ後からストリーミングで埋まる */}
      <Suspense fallback={<MembersSkeleton />}>
        <MembersSection viewerId={userId} />
      </Suspense>
    </div>
  )
}

async function MembersSection({ viewerId }: { viewerId: string }) {
  const result = await fetchMembersForViewer(viewerId)
  if (!result.ok) {
    if (result.error === 'forbidden') redirect('/')
    redirect('/error')
  }

  return (
    <MembersClient
      viewerRole={result.viewerRole}
      viewerId={viewerId}
      members={result.members}
      driveGrantRole={process.env.GOOGLE_DRIVE_GRANT_ROLE ?? 'member'}
    />
  )
}
