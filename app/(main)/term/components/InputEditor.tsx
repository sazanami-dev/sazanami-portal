"use client"

import React from "react"

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
    e.preventDefault()
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

  return (
    <textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder ?? "Markdown を入力"}
      wrap="soft"
      ref={scrollRef}
      onScroll={onScroll}
      style={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        padding: 12,
        fontSize: "1.5rem",
        fontFamily: "Consolas, monospace",
        overflow: "auto",
        resize: "none",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}
    />
  )
}
