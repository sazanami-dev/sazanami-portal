'use client'

import React from 'react'
import DOMPurify from 'isomorphic-dompurify'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'

export const markdownComponents = {
  h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.75rem 0 0.5rem 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.3rem' }} {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0.75rem 0 0.4rem 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.2rem' }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0.6rem 0 0.3rem 0' }} {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: React.ComponentPropsWithoutRef<'h4'>) => (
    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0.5rem 0 0.25rem 0' }} {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }: React.ComponentPropsWithoutRef<'h5'>) => (
    <h5 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0.4rem 0 0.2rem 0' }} {...props}>{children}</h5>
  ),
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
    <p style={{ fontSize: '0.875rem', margin: '0 0 0.6rem 0', lineHeight: 1.7 }} {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', margin: '0.3rem 0 0.6rem 0' }} {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', margin: '0.3rem 0 0.6rem 0' }} {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) => (
    <li style={{ margin: '0.2rem 0', display: 'list-item' }} {...props}>{children}</li>
  ),
  a: ({ children, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
    <a style={{ color: '#2563eb', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote style={{ borderLeft: '3px solid #d1d5db', margin: '0.75rem 0', padding: '0.15rem 1rem', color: '#6b7280', fontStyle: 'normal' }} {...props}>{children}</blockquote>
  ),
  code: ({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'> & { className?: string }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return <code style={{ background: 'transparent', padding: 0, display: 'block', whiteSpace: 'pre', overflow: 'auto', fontFamily: 'monospace' }} className={className} {...props}>{children}</code>
    }
    return <code style={{ backgroundColor: '#f3f4f6', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '0.85em', fontFamily: 'monospace' }} {...props}>{children}</code>
  },
  pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => (
    <pre style={{ backgroundColor: '#f6f8fa', padding: '10px', borderRadius: '6px', overflow: 'auto', margin: '0.5rem 0', border: '1px solid #e5e7eb' }} {...props}>{children}</pre>
  ),
  hr: (props: React.ComponentPropsWithoutRef<'hr'>) => (
    <hr style={{ border: 'none', height: '1px', backgroundColor: '#e5e7eb', margin: '1rem 0' }} {...props} />
  ),
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
    <div style={{ overflowX: 'auto', margin: '0.5rem 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }} {...props}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) => (
    <th style={{ border: '1px solid #e5e7eb', padding: '0.4rem 0.6rem', textAlign: 'left', backgroundColor: '#f9fafb', fontWeight: 600 }} {...props}>{children}</th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) => (
    <td style={{ border: '1px solid #e5e7eb', padding: '0.4rem 0.6rem', textAlign: 'left' }} {...props}>{children}</td>
  ),
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong style={{ fontWeight: 700 }} {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: React.ComponentPropsWithoutRef<'em'>) => (
    <em style={{ fontStyle: 'italic' }} {...props}>{children}</em>
  ),
  del: ({ children, ...props }: React.ComponentPropsWithoutRef<'del'>) => (
    <del style={{ textDecoration: 'line-through', color: '#9ca3af' }} {...props}>{children}</del>
  ),
  img: (props: React.ComponentPropsWithoutRef<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0.5rem 0', borderRadius: '6px' }} alt="" {...props} />
  ),
}

interface ProfileMarkdownViewProps {
  content: string
  className?: string
}

export function ProfileMarkdownView({ content, className = '' }: ProfileMarkdownViewProps) {
  const sanitized = DOMPurify.sanitize(content)

  return (
    <div
      className={className}
      style={{
        fontSize: '0.875rem',
        lineHeight: 1.7,
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  )
}
