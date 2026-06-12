import { NextResponse } from 'next/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { canUploadFiles } from '@/lib/members/permissions'
import { getTemplateById } from '@/lib/drive/templates'
import { resolveSegmentNames } from '@/lib/drive/client'

type Params = { params: Promise<{ id: string }> }

// アップロード画面のプレビュー用。実フォルダは作成せず、表示用パス文字列だけ返す。
export async function GET(request: Request, { params }: Params) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!ctx.role || !canUploadFiles(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const template = await getTemplateById(id)
  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const month = new URL(request.url).searchParams.get('month') ?? undefined
  let names: string[]
  try {
    names = resolveSegmentNames(template.segments, { month: month || undefined })
  } catch {
    return NextResponse.json({ error: 'invalid_template' }, { status: 400 })
  }

  return NextResponse.json({ displayPath: names.join(' / ') })
}
