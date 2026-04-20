"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import MarkdownPreview from "./components/MarkdownPreview"
import termStyles from "./ui.module.css"
import mdStyles from "./markdown.module.css"

type ApiResponse = {
    content: string | null
    version?: number | null
    updated_at?: string | null
    isAuthorized?: boolean
}

export default function PageClient() {
    const [loading, setLoading] = useState(true)
    const [content, setContent] = useState<string | null>(null)
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false;

        // 会則データの取得
        const fetchTerms = async () => {
            try {
                const res = await fetch('/api/term/export', { credentials: 'same-origin' })
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
                
                const j: ApiResponse = await res.json()
                
                if (cancelled) return

                setContent(j.content ?? null)
                setIsAuthorized(!!j.isAuthorized)
            } catch (err) {
                if (cancelled) return
                console.error("会則データの取得に失敗しました:", err)
                setError('取得に失敗しました')
            } finally {
                if (!cancelled) setLoading(false)
            }
        };

        fetchTerms();

        return () => { cancelled = true }
    }, [])

    const fallback = "### 表示できる会則がありません。"

    if (loading) {
        return (
            <main className={termStyles.termRoot} style={{ boxSizing: 'border-box' }}>
                <div style={{ padding: 24 }}>読み込み中…</div>
            </main>
        )
    }

    if (error) {
        return (
            <main className={termStyles.termRoot} style={{ boxSizing: 'border-box' }}>
                <div style={{ padding: 24, color: '#dc2626' }}>{error}</div>
            </main>
        )
    }

    return (
        <main 
            className={termStyles.termRoot} 
            data-mode="preview" 
            style={{ display: "flex", flexDirection: "column", boxSizing: "border-box", position: 'relative' }}
        >
            {/* 管理者の場合のみ「編集」ボタンを表示 */}
            {isAuthorized && (
                <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 20 }}>
                    <Link href="/term/edit">
                        <button style={{ padding: '6px 10px', background: '#2563eb', color: 'white', borderRadius: 6, cursor: 'pointer', border: 'none' }}>
                            編集
                        </button>
                    </Link>
                </div>
            )}

            <div style={{ display: "flex", gap: 16, alignItems: "stretch", flex: 1, minHeight: 0 }}>
                <div className={termStyles.previewPane} style={{ flex: '1 1 100%', display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <MarkdownPreview text={content ?? fallback} className={mdStyles.mdPreview} />
                </div>
            </div>
        </main>
    )
}