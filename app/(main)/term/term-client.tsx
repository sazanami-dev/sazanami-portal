"use client"

import Link from "next/link"
import MarkdownPreview from "./components/MarkdownPreview"
import termStyles from "./ui.module.css"
import mdStyles from "./markdown.module.css"

type Props = {
    // 会則本文はサーバー側で取得して props で受け取る
    content: string | null
    isAuthorized: boolean
}

export default function PageClient({ content, isAuthorized }: Props) {
    const fallback = "### 表示できる会則がありません。"

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
