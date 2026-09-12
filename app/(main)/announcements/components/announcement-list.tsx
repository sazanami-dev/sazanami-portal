'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { FileTextIcon, PencilIcon, PinIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatAnnouncementDateTime,
  toPlainTextPreview,
} from '@/lib/announcements/format'
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  isScheduled,
  type Announcement,
  type AnnouncementCategory,
} from '@/lib/announcements/types'

import {
  CategoryBadge,
  ImportantBadge,
  PinnedBadge,
  StateBadge,
} from './announcement-badges'
import { AnnouncementEditor } from './announcement-editor'
import { AnnouncementModal } from './announcement-modal'

const ALL_CATEGORIES = 'all'

type View = 'list' | 'drafts'

type ListResponse = {
  items: Announcement[]
  total: number
  page: number
  pageSize: number
}

export function AnnouncementList({ canManage }: { canManage: boolean }) {
  const [view, setView] = useState<View>('list')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory | typeof ALL_CATEGORIES>(
    ALL_CATEGORIES
  )
  const [page, setPage] = useState(1)

  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [selected, setSelected] = useState<Announcement | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)

  // 入力のたびに問い合わせないよう、検索語だけ遅らせて反映する
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setLoadError(false)
      const params = new URLSearchParams()
      params.set('view', view === 'drafts' ? 'drafts' : canManage ? 'managed' : 'public')
      params.set('page', String(page))
      if (search) params.set('search', search)
      if (category !== ALL_CATEGORIES) params.set('category', category)
      if (view === 'list' && canManage && includeArchived) params.set('includeArchived', '1')

      try {
        const res = await fetch(`/api/announcements?${params.toString()}`, { signal })
        if (!res.ok) {
          setLoadError(true)
          return
        }
        setData((await res.json()) as ListResponse)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setLoadError(true)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [view, canManage, page, search, category, includeArchived]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function togglePin(announcement: Announcement) {
    const res = await fetch(`/api/announcements/${announcement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: !announcement.isPinned }),
    })
    if (res.ok) void load()
  }

  async function deleteDraft(announcement: Announcement) {
    if (!window.confirm('この下書きを削除します。よろしいですか？')) return
    const res = await fetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  function openEditor(announcement: Announcement | null) {
    setEditing(announcement)
    setEditorOpen(true)
  }

  function changeView(next: View) {
    setView(next)
    setPage(1)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {view === 'drafts' ? '下書き' : 'お知らせ'}
        </h1>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {view === 'list' && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={includeArchived}
                  onCheckedChange={(checked) => {
                    setIncludeArchived(checked === true)
                    setPage(1)
                  }}
                />
                アーカイブも表示
              </label>
            )}
            <Button
              variant="outline"
              onClick={() => changeView(view === 'drafts' ? 'list' : 'drafts')}
            >
              <FileTextIcon />
              {view === 'drafts' ? 'お知らせ一覧' : '下書き一覧'}
            </Button>
            <Button onClick={() => openEditor(null)}>
              <PlusIcon />
              新規作成
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Input
            className="w-full max-w-sm"
            placeholder="お知らせを検索..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value as AnnouncementCategory | typeof ALL_CATEGORIES)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>すべてのカテゴリ</SelectItem>
              {ANNOUNCEMENT_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ANNOUNCEMENT_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <p className="p-6 text-sm text-muted-foreground">
            お知らせを取得できませんでした
          </p>
        )}

        {!loading && !loadError && data && data.items.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {view === 'drafts' ? '下書きはありません' : 'お知らせはまだありません'}
          </p>
        )}

        {!loading && !loadError && data && data.items.length > 0 && (
          <ul className="divide-y">
            {data.items.map((announcement) => {
              const scheduled = isScheduled(announcement)
              return (
                <li
                  key={announcement.id}
                  className={`relative flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-muted/50 ${
                    announcement.isPinned ? 'border-l-4 border-l-[#0F3FDD]' : ''
                  } ${
                    scheduled || announcement.status === 'archived' ? 'opacity-60' : ''
                  }`}
                >
                  {canManage && view === 'list' && (
                    <button
                      type="button"
                      aria-label={announcement.isPinned ? 'ピン留めを解除' : 'ピン留めする'}
                      title={announcement.isPinned ? 'ピン留めを解除' : 'ピン留めする'}
                      className={`relative z-10 mt-1 rounded p-1.5 transition-all ${
                        announcement.isPinned
                          ? 'bg-[#0F3FDD]/10 text-[#0F3FDD] hover:bg-[#0F3FDD]/20 shadow-xs ring-1 ring-[#0F3FDD]/30'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      onClick={() => void togglePin(announcement)}
                    >
                      <PinIcon
                        className={`size-4 transition-transform ${
                          announcement.isPinned ? 'fill-current rotate-45' : ''
                        }`}
                      />
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {announcement.isPinned && <PinnedBadge />}
                      {announcement.isImportant && <ImportantBadge />}
                      <CategoryBadge category={announcement.category} />
                      {scheduled && <StateBadge label="予約投稿" />}
                      {announcement.status === 'archived' && (
                        <StateBadge label="アーカイブ" />
                      )}
                      {announcement.status === 'draft' && <StateBadge label="下書き" />}
                    </div>
                    {/*
                      ::before で行全体を覆い、カードのどこを押しても開くようにする。
                      下書きは読むものではなく書きかけのものなので、詳細ではなく編集を開く。
                      ピン留め・削除などの操作ボタンは z-10 で手前に出して個別に効かせる。
                    */}
                    <button
                      type="button"
                      className="mt-2 block cursor-pointer text-left text-lg font-semibold before:absolute before:inset-0 before:content-[''] hover:text-primary"
                      onClick={() =>
                        view === 'drafts' ? openEditor(announcement) : setSelected(announcement)
                      }
                    >
                      {announcement.title}
                    </button>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {toPlainTextPreview(announcement.content)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2 text-sm text-muted-foreground">
                    <span>{formatAnnouncementDateTime(announcement.publishAt)}</span>
                    {canManage && (
                      <div className="relative z-10 flex items-center gap-1">
                        {/* 下書きはカード全体が編集を開くので、えんぴつは出さない */}
                        {view === 'list' && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="編集"
                            title="編集"
                            onClick={() => openEditor(announcement)}
                          >
                            <PencilIcon />
                          </Button>
                        )}
                        {/* 削除できるのは下書きのみ。公開済みはアーカイブ運用 */}
                        {announcement.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="削除"
                            title="削除"
                            onClick={() => void deleteDraft(announcement)}
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && !loadError && data && data.total > data.pageSize && (
          <div className="flex items-center justify-center gap-3 border-t p-4 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              前へ
            </Button>
            <span className="text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              次へ
            </Button>
          </div>
        )}
      </div>

      <AnnouncementModal announcement={selected} onClose={() => setSelected(null)} />

      {canManage && (
        <AnnouncementEditor
          open={editorOpen}
          announcement={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => void load()}
        />
      )}
    </div>
  )
}
