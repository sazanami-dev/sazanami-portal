import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerRole } from '@/lib/members/service'
import { canManageUploadTemplates } from '@/lib/members/permissions'
import { listUploadLogs } from '@/lib/drive/upload-logs'
import { LogsClient } from './logs-client'

export default async function UploadLogsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const role = await getViewerRole(user.id)
  if (!role || !canManageUploadTemplates(role)) redirect('/')

  const logs = await listUploadLogs()

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
      <LogsClient logs={logs} />
    </div>
  )
}
