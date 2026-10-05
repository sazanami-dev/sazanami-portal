"use client"

import React, { useRef, useState, useEffect } from "react"

type Props = {
  text: string
  onChange: (t: string) => void
  placeholder?: string
  scrollRef?: React.RefObject<HTMLTextAreaElement | null>
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void
}

export default function InputEditor({ text, onChange, placeholder, scrollRef, onScroll }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return
    e.preventDefault()//スクロールバーを左右で同期
    const ta = e.currentTarget
    const value = ta.value
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const tab = "  "
    const newPos = start + tab.length
    onChange(value.slice(0, start) + tab + value.slice(end))
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newPos
    })
  }

  const localRef = useRef<HTMLTextAreaElement | null>(null)
  const gutterRef = useRef<HTMLDivElement | null>(null)

  const taRef = scrollRef || localRef

  const [linePx, setLinePx] = useState<number | null>(null)
  const [fontPx, setFontPx] = useState<number | null>(null)

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop
    if (onScroll) onScroll(e)
  }

  // 行番号と入力エリアの行の高さを合わせるため、
  // 行の高さとフォントサイズを取得して状態に保存する
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    const compute = () => {
      const cs = getComputedStyle(ta)
      const lh = parseFloat(cs.lineHeight || '0')
      const fs = parseFloat(cs.fontSize || '0')
      if (lh && lh > 0) setLinePx(lh)
      if (fs && fs > 0) setFontPx(fs)
    }
    compute()
    window.addEventListener('resize', compute)
    const ro = new ResizeObserver(() => compute())
    ro.observe(ta)
    return () => { window.removeEventListener('resize', compute); ro.disconnect() }
  }, [taRef, text])

  const lines = text ? text.split("\n") : [""]

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <style>{`
        .no-scrollbar-arrows::-webkit-scrollbar-button {
          display: none;
        }
      `}</style>
      <div
        ref={gutterRef}
        aria-hidden
        style={{
          width: 36,
          boxSizing: 'border-box',
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 2,
          paddingRight: 2,
          overflow: 'hidden',
          textAlign: 'right',
          fontFamily: 'Consolas, monospace',
          fontSize: fontPx ? `${fontPx}px` : undefined,
          color: 'rgba(209,213,219,0.6)',
          background: 'transparent',
          userSelect: 'none'
        }}
      >
        {lines.map((_, i) => (
          <div key={i} style={{ height: linePx ? `${linePx}px` : undefined, lineHeight: linePx ? `${linePx}px` : undefined, paddingRight: 2 }}>{i + 1}</div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Markdown を入力"}
          wrap="soft"
          ref={taRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            display: 'block',
            minHeight: 0,
            height: '100%',
            margin: 0,
            padding: 12,
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
            fontSize: '1.5rem',
            fontFamily: 'Consolas, monospace',
            overflowY: 'scroll',
            resize: 'none',
            whiteSpace: 'pre-wrap',
            border: 'none',
            outline: 'none',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        />
      </div>
    </div>
  )
}