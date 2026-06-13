import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerRole } from '@/lib/members/service'
import { canManageUploadTemplates } from '@/lib/members/permissions'
import { listTemplates } from '@/lib/drive/templates'
import { TemplatesClient } from './templates-client'

export default async function UploadSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const role = await getViewerRole(user.id)
  if (!role || !canManageUploadTemplates(role)) redirect('/')

  const templates = await listTemplates()
  const defaultBaseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? ''

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
      <TemplatesClient initialTemplates={templates} defaultBaseFolderId={defaultBaseFolderId} />
    </div>
  )
}
