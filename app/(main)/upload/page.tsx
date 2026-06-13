import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerRole } from '@/lib/members/service'
import { canManageUploadTemplates, canUploadFiles } from '@/lib/members/permissions'
import { listTemplates } from '@/lib/drive/templates'
import { finestDynamicGranularity } from '@/lib/drive/segments'
import { UploadClient } from './upload-client'

export default async function UploadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const role = await getViewerRole(user.id)
  if (!role || !canUploadFiles(role)) redirect('/')

  const canManage = canManageUploadTemplates(role)
  // 一般メンバーには manager 専用テンプレートを出さない
  const templates = await listTemplates({ activeOnly: true, includeManagerOnly: canManage })

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

      <UploadClient
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          granularity: finestDynamicGranularity(t.segments),
        }))}
      />
    </div>
  )
}
