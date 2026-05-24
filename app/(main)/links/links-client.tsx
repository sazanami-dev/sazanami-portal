'use client'

import { useState } from 'react'
import type { ShortLink } from '@/lib/links/service'
import LinkForm from './link-form'

type Props = {
  links: ShortLink[]
  currentUserId: string
  currentUserName: string
  studentId: string | null
  canCreateOfficial: boolean
  officialNamespace: string
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
  isAdmin,
  usersMap,
}: Props) {
  const [links, setLinks] = useState(initialLinks)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ShortLink | null>(null)
  const [activeTab, setActiveTab] = useState(currentUserId)

  function buildLinkUrl(link: ShortLink): string {
    if (link.namespace === officialNamespace) return `/s/${link.slug}`
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
  const canCreate = canCreateOfficial || !!studentId

  // 管理者ビューのタブ構築：自分を先頭に、他ユーザーを名前順で並べる
  const tabs: { userId: string; name: string }[] = []
  if (isAdmin) {
    const allUserIds = [...new Set(links.map((l) => l.createdBy).filter(Boolean))] as string[]

    // 自分を先頭に追加
    if (allUserIds.includes(currentUserId) || links.some((l) => !l.createdBy)) {
      tabs.push({ userId: currentUserId, name: currentUserName })
    }

    // 他ユーザーを名前順で追加
    const others = allUserIds
      .filter((id) => id !== currentUserId)
      .map((id) => ({ userId: id, name: usersMap[id] ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

    tabs.push(...others)
  }

  const showTabs = isAdmin && tabs.length > 1

  // 表示するリンクをタブに応じてフィルタ
  const visibleLinks = showTabs
    ? links.filter((l) => l.createdBy === activeTab || (!l.createdBy && activeTab === currentUserId))
    : links

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ショートリンク</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700"
          >
            + 新規作成
          </button>
        )}
      </div>

      <div className={showTabs ? 'flex gap-6 items-start' : ''}>
      {showTabs && (
        <aside className="w-44 shrink-0 sticky top-6">
          <ul className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1">
            {tabs.map((tab) => {
              const count = links.filter(
                (l) => l.createdBy === tab.userId || (!l.createdBy && tab.userId === currentUserId)
              ).length
              return (
                <li key={tab.userId}>
                  <button
                    onClick={() => setActiveTab(tab.userId)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between items-center gap-2 ${
                      activeTab === tab.userId
                        ? 'bg-gray-800 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="truncate">{tab.name}</span>
                    <span className={`text-xs shrink-0 ${activeTab === tab.userId ? 'text-gray-300' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
      )}

      <div className="flex-1 min-w-0">
      {visibleLinks.length === 0 ? (
        <p className="text-gray-500 text-sm">リンクがありません。</p>
      ) : (
        <div className="space-y-3">
          {visibleLinks.map((link) => (
            <div
              key={link.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                    {link.namespace === officialNamespace ? '公式' : link.namespace}
                  </span>
                  {link.hasPassword && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      PW保護
                    </span>
                  )}
                  {link.inCollection && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      リンク集掲載
                    </span>
                  )}
                </div>
                {link.title && (
                  <p className="text-sm font-medium text-gray-800 mb-0.5">{link.title}</p>
                )}
                <a
                  href={buildLinkUrl(link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-mono"
                >
                  /{link.namespace === officialNamespace ? `s/${link.slug}` : `${link.namespace}/${link.slug}`}
                </a>
                <p className="text-xs text-gray-400 truncate mt-0.5">{link.targetUrl}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditTarget(link)}
                  className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  disabled={isEditing && editTarget?.id === link.id}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      </div>

      {showCreateModal && (
        <Modal title="リンクを作成" onClose={() => setShowCreateModal(false)}>
          <LinkForm
            canCreateOfficial={canCreateOfficial}
            studentId={studentId}
            officialNamespace={officialNamespace}
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
            studentId={studentId}
            officialNamespace={officialNamespace}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
