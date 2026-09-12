'use client'

import React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize from 'rehype-sanitize'

import { cn } from '@/lib/utils'

export const announcementMarkdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1
      className="mb-4 mt-6 border-b pb-2 text-2xl font-bold tracking-tight text-foreground first:mt-0 sm:text-3xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-3 mt-5 border-b pb-1.5 text-xl font-bold tracking-tight text-foreground first:mt-0 sm:text-2xl"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-4 text-lg font-semibold text-foreground first:mt-0 sm:text-xl"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="mb-2 mt-3 text-base font-semibold text-foreground first:mt-0 sm:text-lg"
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p
      className="mb-4 text-base leading-relaxed text-foreground/90 sm:text-lg sm:leading-loose"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="mb-4 list-disc space-y-2 pl-6 text-base text-foreground/90 sm:text-lg"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="mb-4 list-decimal space-y-2 pl-6 text-base text-foreground/90 sm:text-lg"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  a: ({ children, ...props }) => (
    <a
      className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-4 border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground text-base sm:text-lg"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code
          className={cn('block overflow-x-auto font-mono text-sm sm:text-base', className)}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm sm:text-base text-foreground"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm sm:text-base text-foreground"
      {...props}
    >
      {children}
    </pre>
  ),
  hr: (props) => <hr className="my-6 border-border" {...props} />,
  table: ({ children, ...props }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-base sm:text-lg" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-border bg-muted/60 px-4 py-2 font-semibold text-foreground" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-border px-4 py-2 text-foreground/90" {...props}>
      {children}
    </td>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-bold text-foreground" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  del: ({ children, ...props }) => (
    <del className="text-muted-foreground line-through" {...props}>
      {children}
    </del>
  ),
  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="my-4 max-w-full rounded-lg shadow-xs" alt="" {...props} />
  ),
}

/**
 * お知らせ本文の Markdown 表示。
 * モーダル等の大画面で見やすいよう、読みやすいフォントサイズと行間を設定している。
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
        components={announcementMarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
