'use client'

import { useState, useRef, useEffect } from 'react'
import type { ShortLink } from '@/lib/links/service'
import LinkForm from './link-form'

type Props = {
  links: ShortLink[]
  currentUserId: string
  currentUserName: string
  studentId: string | null
  canCreateOfficial: boolean
  officialNamespace: string
  canCreateCareer: boolean
  careerNamespace: string
  isAdmin: boolean
  usersMap: Record<string, string>
}

export default function LinksClient({
  links: initialLinks,
  currentUserId,
  currentUserName,
  studentId,
  canCreateOfficial,
  officialNamespace,
  canCreateCareer,
  careerNamespace,
  isAdmin,
  usersMap,
}: Props) {
  const [links, setLinks] = useState(initialLinks)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ShortLink | null>(null)
  const [activeTab, setActiveTab] = useState(currentUserId)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  function buildLinkUrl(link: ShortLink): string {
    if (link.namespace === officialNamespace) return `/s/${link.slug}`
    if (link.namespace === careerNamespace) return `/c/${link.slug}`
    return `/${link.namespace}/${link.slug}`
  }

  async function handleDelete(id: string) {
    if (!confirm('このリンクを削除しますか？')) return
    const res = await fetch(`/api/links/${id}`, { method: 'DELETE' })
    if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  function handleCreated(link: ShortLink) {
    setLinks((prev) => [link, ...prev])
    setShowCreateModal(false)
  }

  function handleUpdated(link: ShortLink) {
    setLinks((prev) => prev.map((l) => (l.id === link.id ? link : l)))
    setEditTarget(null)
  }

  const isEditing = !!editTarget
  const canCreate = canCreateOfficial || canCreateCareer || !!studentId

  const tabs: { userId: string; name: string }[] = []
  if (isAdmin) {
    tabs.push({ userId: currentUserId, name: currentUserName })
    const allUserIds = [...new Set(links.map((l) => l.createdBy).filter(Boolean))] as string[]
    const others = allUserIds
      .filter((id) => id !== currentUserId)
      .map((id) => ({ userId: id, name: usersMap[id] ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    tabs.push(...others)
  }

  const showTabs = isAdmin && tabs.length > 0
  const visibleLinks = showTabs
    ? links.filter((l) => l.createdBy === activeTab || (!l.createdBy && activeTab === currentUserId))
    : links

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ショートリンク</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-black/90"
          >
            + 新規作成
          </button>
        )}
      </div>

      {showTabs && (
        <div className="md:hidden relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-muted w-full"
          >
            <span className="flex-1 text-left truncate">
              {tabs.find((t) => t.userId === activeTab)?.name ?? ''}
            </span>
            <span className="text-xs text-muted-foreground">
              {links.filter((l) => l.createdBy === activeTab || (!l.createdBy && activeTab === currentUserId)).length}
            </span>
            <svg
              className={`w-4 h-4 shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showUserMenu && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded border bg-background shadow-md">
              <ul className="max-h-60 overflow-y-auto py-1">
                {tabs.map((tab) => {
                  const count = links.filter(
                    (l) => l.createdBy === tab.userId || (!l.createdBy && tab.userId === currentUserId)
                  ).length
                  const active = activeTab === tab.userId
                  return (
                    <li key={tab.userId}>
                      <button
                        onClick={() => { setActiveTab(tab.userId); setShowUserMenu(false) }}
                        className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center gap-2 transition-colors ${
                          active ? 'bg-black text-white font-medium' : 'hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <span className="truncate">{tab.name}</span>
                        <span className={`text-xs shrink-0 ${active ? 'text-white/60' : ''}`}>{count}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className={showTabs ? 'md:flex md:gap-6 md:items-start' : ''}>
        {showTabs && (
          <aside className="hidden md:block w-44 shrink-0 sticky top-6">
            <ul className="space-y-0.5 max-h-[70vh] overflow-y-auto">
              {tabs.map((tab) => {
                const count = links.filter(
                  (l) => l.createdBy === tab.userId || (!l.createdBy && tab.userId === currentUserId)
                ).length
                const active = activeTab === tab.userId
                return (
                  <li key={tab.userId}>
                    <button
                      onClick={() => setActiveTab(tab.userId)}
                      className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center gap-2 transition-colors ${
                        active ? 'bg-black text-white font-medium' : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className="truncate">{tab.name}</span>
                      <span className={`text-xs shrink-0 ${active ? 'text-white/60' : ''}`}>{count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>
        )}

        <div className="flex-1 min-w-0 space-y-3">
          {visibleLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">リンクがありません。</p>
          ) : (
            visibleLinks.map((link) => (
              <div key={link.id} className="rounded border bg-background p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {link.namespace === officialNamespace ? '公式' : link.namespace === careerNamespace ? '就活' : link.namespace}
                    </span>
                    {link.hasPassword && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        PW保護
                      </span>
                    )}
                    {link.inCollection && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        リンク集掲載
                      </span>
                    )}
                  </div>
                  {link.title && (
                    <p className="text-sm font-medium mb-0.5">{link.title}</p>
                  )}
                  <a
                    href={buildLinkUrl(link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-blue-600 hover:underline"
                  >
                    {buildLinkUrl(link)}
                  </a>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{link.targetUrl}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditTarget(link)}
                    className="rounded border px-2 py-0.5 text-xs hover:bg-muted/50"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    disabled={isEditing && editTarget?.id === link.id}
                    className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <Modal title="リンクを作成" onClose={() => setShowCreateModal(false)}>
          <LinkForm
            canCreateOfficial={canCreateOfficial}
            officialNamespace={officialNamespace}
            canCreateCareer={canCreateCareer}
            careerNamespace={careerNamespace}
            studentId={studentId}
            onSuccess={handleCreated}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="リンクを編集" onClose={() => setEditTarget(null)}>
          <LinkForm
            initial={editTarget}
            canCreateOfficial={canCreateOfficial}
            officialNamespace={officialNamespace}
            canCreateCareer={canCreateCareer}
            careerNamespace={careerNamespace}
            studentId={studentId}
            onSuccess={handleUpdated}
            onCancel={() => setEditTarget(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border bg-background p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
          >
            閉じる
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
