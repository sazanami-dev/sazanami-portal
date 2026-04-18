"use client"

import { useState, useRef } from "react"
import InputEditor from ".././components/InputEditor"
import MarkdownPreview from ".././components/MarkdownPreview"
import styles from ".././page.module.css"
import VersionModal from "../components/VersionModal"

type ViewMode = "both" | "input" | "preview"

export default function TermPage() {
    const [text, setText] = useState<string>("# Hello Markdown\n\nWrite some *Markdown* on the left.")
    const [mode, setMode] = useState<ViewMode>("both")

    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const previewRef = useRef<HTMLDivElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const lastSyncRef = useRef<"input" | "preview" | null>(null)

    const [showVersionModal, setShowVersionModal] = useState(false)

	// 左右でスクロール位置を同期
	const handleInputScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (!previewRef.current) return
        if (lastSyncRef.current === 'preview') return
        const ta = e.currentTarget
        const inputScrollable = ta.scrollHeight - ta.clientHeight
        const preview = previewRef.current
        const previewScrollable = preview.scrollHeight - preview.clientHeight
        if (inputScrollable <= 0 || previewScrollable <= 0) return
        const percent = ta.scrollTop / inputScrollable
        lastSyncRef.current = 'input'
        preview.scrollTop = Math.round(percent * previewScrollable)
        requestAnimationFrame(() => { lastSyncRef.current = null })
    }

    const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!inputRef.current) return
        if (lastSyncRef.current === 'input') return
        const dv = e.currentTarget
        const previewScrollable = dv.scrollHeight - dv.clientHeight
        const ta = inputRef.current
        const inputScrollable = ta.scrollHeight - ta.clientHeight
        if (previewScrollable <= 0 || inputScrollable <= 0) return
        const percent = dv.scrollTop / previewScrollable
        lastSyncRef.current = 'preview'
        ta.scrollTop = Math.round(percent * inputScrollable)
        requestAnimationFrame(() => { lastSyncRef.current = null })
    }

    // Markdownファイルのローカル保存
    const downloadMarkdown = () => {
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, "0")
        const dd = String(today.getDate()).padStart(2, "0")
        const defaultName = `${yyyy}-${mm}-${dd}-term`
        
        const inputName = window.prompt("保存するファイル名を入力してください（拡張子不要）:", defaultName)
        if (!inputName) {
            URL.revokeObjectURL(url)
            return
        }
        
        let filename = inputName
        if (!filename.toLowerCase().endsWith('.md')) {
            filename = `${filename}.md`
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    // ローカルMarkdownファイルの読み込み
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputEl = e.currentTarget
        const f = inputEl.files?.[0]
        if (!f) return
        
        const name = f.name.toLowerCase()
        if (!name.endsWith('.md')) {
            alert('拡張子 .md のファイルを選択してください')
            inputEl.value = ''
            return
        }
        
        try {
            const content = await f.text()
            if (content.length > 0) {
                const editorHasText = !!text && text.trim().length > 0
                if (editorHasText && !confirm('ファイルの内容で現在のエディタを上書きしますか？')) {
                    inputEl.value = ''
                    return
                }
                setText(content)
            }
        } catch (err) {
            console.error(err)
            alert('ファイルを読み込めませんでした')
        }
        inputEl.value = ''
    }

    return (
        <main className={styles.termRoot} data-mode={mode} style={{ display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
            {/* 操作パネル */}
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 60 }}>
                <div className={styles.controlsBox}>
                    <button onClick={() => setMode('input')} className={`${styles.modeButton} ${mode === 'input' ? styles.modeActive : ''}`}>編集</button>
                    <button onClick={() => setMode('preview')} className={`${styles.modeButton} ${mode === 'preview' ? styles.modeActive : ''}`}>プレビュー</button>
                    <button onClick={() => setMode('both')} className={`${styles.modeButton} ${mode === 'both' ? styles.modeActive : ''}`}>分割</button>
                    <button onClick={downloadMarkdown} className={styles.modeButton} style={{ background: '#60a5fa', color: 'white' }}>保存</button>
                    <button onClick={() => fileInputRef.current?.click()} className={styles.modeButton} style={{ background: '#34d399', color: 'white' }}>読み込む</button>
                    <button onClick={() => setShowVersionModal(true)} className={styles.modeButton} style={{ background: '#10b981', color: 'white' }}>適用</button>
                    <input ref={fileInputRef} onChange={handleFileChange} accept=".md,text/markdown" type="file" style={{ display: 'none' }} />
                </div>
            </div>

            <VersionModal
                open={showVersionModal}
                initial={''} 
                onClose={() => setShowVersionModal(false)}
                onConfirm={async (ver: number) => {
                    try {
                        const res = await fetch('/api/term/save', { // 該当のPOSTエンドポイント
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: text, version: ver }),
                            credentials: 'same-origin',
                        })
                        const j = await res.json().catch(() => null)
                        
                        if (!res.ok) {
                            throw new Error(String(j?.error ?? res.status))
                        }
                        
                        alert('会則を適用（保存）しました！')
                        setShowVersionModal(false)
                    } catch (err: any) {
                        console.error("保存に失敗しました:", err)
                        alert(`保存に失敗しました: ${err.message}`)
                    }
                }} 
            />

            <div style={{ display: "flex", gap: 16, alignItems: "stretch", flex: 1, minHeight: 0 }}>
                {(mode === "both" || mode === "input") && (
                    <div className={styles.editorPane} style={{ flex: mode === 'input' ? '1 1 100%' : '1 1 0%', display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <InputEditor text={text} onChange={setText} scrollRef={inputRef} onScroll={handleInputScroll} />
                    </div>
                )}

                {(mode === "both" || mode === "preview") && (
                    <div className={styles.previewPane} style={{ flex: mode === 'preview' ? '1 1 100%' : '1 1 0%', display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <MarkdownPreview text={text} scrollRef={previewRef} className={styles.mdPreview} onScroll={handlePreviewScroll} />
                    </div>
                )}
            </div>
        </main>
    )
}