import { NextResponse } from 'next/server'

import { requireViewerRole } from '@/lib/members/route-helpers'
import {
  canManageAnnouncements,
  canViewAnnouncements,
} from '@/lib/announcements/permissions'
import {
  ANNOUNCEMENTS_PAGE_SIZE,
  createAnnouncement,
  listDraftAnnouncements,
  listManagedAnnouncements,
  listPublishedAnnouncements,
  revalidateAnnouncements,
  type AnnouncementListResult,
} from '@/lib/announcements/service'
import { isAnnouncementCategory } from '@/lib/announcements/types'
import {
  optionalBoolean,
  validateContent,
  validateCreateStatus,
  validateCategory,
  validatePublishAt,
  validateTitle,
} from '@/lib/announcements/validation'

/**
 * 一覧取得。
 * - view=public : 一般ユーザー向け（公開済み・公開日時到来済み）
 * - view=managed: 管理者向け（予約投稿を含む。includeArchived=1 でアーカイブも）
 * - view=drafts : 下書き一覧（管理者のみ）
 */
export async function GET(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!canViewAnnouncements(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const view = url.searchParams.get('view') ?? 'public'
  const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const search = url.searchParams.get('search') ?? undefined
  const categoryParam = url.searchParams.get('category')
  const category = isAnnouncementCategory(categoryParam) ? categoryParam : undefined
  const includeArchived = url.searchParams.get('includeArchived') === '1'

  const canManage = canManageAnnouncements(ctx.role)
  if ((view === 'managed' || view === 'drafts') && !canManage) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const params = { page, pageSize: ANNOUNCEMENTS_PAGE_SIZE, search, category }
  let result: AnnouncementListResult
  if (view === 'drafts') {
    result = await listDraftAnnouncements(params)
  } else if (view === 'managed') {
    result = await listManagedAnnouncements({ ...params, includeArchived })
  } else {
    result = await listPublishedAnnouncements(params)
  }

  return NextResponse.json({ ...result, canManage })
}

/** 新規作成（下書き保存・即時公開・予約投稿）。manager 以上のみ */
export async function POST(request: Request) {
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!canManageAnnouncements(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const {
    title,
    content,
    status,
    category,
    isImportant,
    isPinned,
    publishAt,
  } = body as Record<string, unknown>

  const titleResult = validateTitle(title)
  if (!titleResult.ok) {
    return NextResponse.json({ error: titleResult.error }, { status: 400 })
  }
  const contentResult = validateContent(content)
  if (!contentResult.ok) {
    return NextResponse.json({ error: contentResult.error }, { status: 400 })
  }
  const statusResult = validateCreateStatus(status ?? 'draft')
  if (!statusResult.ok) {
    return NextResponse.json({ error: statusResult.error }, { status: 400 })
  }
  const categoryResult = validateCategory(category ?? 'info')
  if (!categoryResult.ok) {
    return NextResponse.json({ error: categoryResult.error }, { status: 400 })
  }

  // 未指定なら即時公開扱い（サービス層で現在時刻が入る）
  let publishAtValue: string | undefined
  if (publishAt !== undefined && publishAt !== null) {
    const publishAtResult = validatePublishAt(publishAt)
    if (!publishAtResult.ok) {
      return NextResponse.json({ error: publishAtResult.error }, { status: 400 })
    }
    publishAtValue = publishAtResult.value
  }

  const announcement = await createAnnouncement({
    title: titleResult.value,
    content: contentResult.value,
    status: statusResult.value,
    category: categoryResult.value,
    isImportant: optionalBoolean(isImportant),
    isPinned: optionalBoolean(isPinned),
    publishAt: publishAtValue,
    createdBy: ctx.userId,
  })

  if (!announcement) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }

  revalidateAnnouncements()
  return NextResponse.json({ announcement }, { status: 201 })
}
