'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize from 'rehype-sanitize'

import { markdownComponents } from '@/components/profile/profile-markdown-view'

/**
 * お知らせ本文の Markdown 表示。
 * プロフィールの自己紹介と同じ見た目・同じサニタイズ方針を共有する。
 */
export function AnnouncementMarkdown({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div
      className={className}
      style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
