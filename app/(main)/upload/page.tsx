import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { canManageUploadTemplates, canUploadFiles } from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { listTemplates } from '@/lib/drive/templates'
import { finestDynamicGranularity } from '@/lib/drive/segments'
import { Skeleton } from '@/components/ui/skeleton'
import { UploadClient } from './upload-client'

export default async function UploadPage() {
  // シェルと権限判定に role が要るのでここだけ待つ（1往復）
  const { role, error } = await requireViewerRole()
  if (error === 'unauthenticated') redirect('/signin')
  if (!role || !canUploadFiles(role)) redirect('/')

  const canManage = canManageUploadTemplates(role)

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">資料アップロード</h1>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href="/upload/logs"
              className="inline-flex items-center rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
            >
              ログ →
            </Link>
            <Link
              href="/upload/settings"
              className="inline-flex items-center rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
            >
              設定 →
            </Link>
          </div>
        )}
      </div>

      <Suspense fallback={<UploadSkeleton />}>
        <UploadSection canManage={canManage} />
      </Suspense>
    </div>
  )
}

async function UploadSection({ canManage }: { canManage: boolean }) {
  // 一般メンバーには manager 専用テンプレートを出さない
  const templates = await listTemplates({ activeOnly: true, includeManagerOnly: canManage })

  return (
    <UploadClient
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        granularity: finestDynamicGranularity(t.segments),
      }))}
    />
  )
}

function UploadSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
