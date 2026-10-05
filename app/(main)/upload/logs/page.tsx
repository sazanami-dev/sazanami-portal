import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { canManageUploadTemplates } from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { listUploadLogs } from '@/lib/drive/upload-logs'
import { Skeleton } from '@/components/ui/skeleton'
import { LogsClient } from './logs-client'

export default async function UploadLogsPage() {
  const { role, error } = await requireViewerRole()
  if (error === 'unauthenticated') redirect('/signin')
  if (!role || !canManageUploadTemplates(role)) redirect('/')

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">アップロードログ</h1>
        <Link
          href="/upload"
          className="inline-flex items-center rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
        >
          ← アップロード画面
        </Link>
      </div>
      <Suspense fallback={<LogsSkeleton />}>
        <LogsSection />
      </Suspense>
    </div>
  )
}

async function LogsSection() {
  const logs = await listUploadLogs()
  return <LogsClient logs={logs} />
}

function LogsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
