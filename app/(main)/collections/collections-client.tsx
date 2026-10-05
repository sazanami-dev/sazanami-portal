'use client'

import { useState } from 'react'
import type { ShortLink } from '@/lib/links/service'

type Props = {
  officialLinks: ShortLink[]
  careerLinks: ShortLink[]
  officialNamespace: string
  careerNamespace: string
}

export default function CollectionsClient({ officialLinks, careerLinks }: Props) {
  const [tab, setTab] = useState<'official' | 'career'>('official')

  const links = tab === 'official' ? officialLinks : careerLinks
  const prefix = tab === 'official' ? '/s/' : '/c/'

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">リンク集</h1>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'official'} onClick={() => setTab('official')}>
          さざなみ
          <span className="ml-1.5 text-xs opacity-60">{officialLinks.length}</span>
        </TabButton>
        <TabButton active={tab === 'career'} onClick={() => setTab('career')}>
          就活
          <span className="ml-1.5 text-xs opacity-60">{careerLinks.length}</span>
        </TabButton>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">掲載中のリンクはありません。</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => {
            const shortPath = `${prefix}${link.slug}`
            return (
              <li key={link.id} className="rounded border bg-background p-4">
                <a
                  href={shortPath}
                  className="text-base font-medium hover:underline"
                >
                  {link.title ?? link.slug}
                </a>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{shortPath}</p>
                <a
                  href={link.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-xs text-blue-600 hover:underline"
                >
                  {link.targetUrl}
                </a>
                {link.hasPassword && (
                  <span className="mt-1.5 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    PW保護
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-black text-black'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
