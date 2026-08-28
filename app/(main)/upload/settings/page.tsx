import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { canManageUploadTemplates } from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { listTemplates } from '@/lib/drive/templates'
import { Skeleton } from '@/components/ui/skeleton'
import { TemplatesClient } from './templates-client'

export default async function UploadSettingsPage() {
  const { role, error } = await requireViewerRole()
  if (error === 'unauthenticated') redirect('/signin')
  if (!role || !canManageUploadTemplates(role)) redirect('/')

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">アップロード設定</h1>
        <Link
          href="/upload"
          className="inline-flex items-center rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
        >
          ← アップロード画面
        </Link>
      </div>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsSection />
      </Suspense>
    </div>
  )
}

async function SettingsSection() {
  const templates = await listTemplates()
  const defaultBaseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? ''
  return <TemplatesClient initialTemplates={templates} defaultBaseFolderId={defaultBaseFolderId} />
}

function SettingsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}
