"use client"

import { useEffect, useState, useRef } from "react"
import InputEditor from "./components/InputEditor"
import MarkdownPreview from "./components/MarkdownPreview"
import styles from "./page.module.css"

type ViewMode = "both" | "input" | "preview"

export default function TermPage() {
	const [text, setText] = useState<string>("# Hello Markdown\n\nWrite some *Markdown* on the left.")
	const [mode, setMode] = useState<ViewMode>("both")

	const inputRef = useRef<HTMLTextAreaElement | null>(null)
	const previewRef = useRef<HTMLDivElement | null>(null)

	const handleInputScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
		if (!previewRef.current) return
		const ta = e.currentTarget as HTMLTextAreaElement
		const inputScrollable = ta.scrollHeight - ta.clientHeight
		const preview = previewRef.current
		const previewScrollable = preview.scrollHeight - preview.clientHeight
		if (inputScrollable <= 0 || previewScrollable <= 0) return
		const percent = ta.scrollTop / inputScrollable
		preview.scrollTop = Math.round(percent * previewScrollable)
	}

	const downloadMarkdown = () => {
		const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		const today = new Date()
		const yyyy = today.getFullYear()
		const mm = String(today.getMonth() + 1).padStart(2, "0")
		const dd = String(today.getDate()).padStart(2, "0")
		const filename = `${yyyy}${mm}${dd}-term.md`
		a.download = filename
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	}

	useEffect(() => {
		document.title = "Markdown Editor"
	}, [])

	return (
		<main className={styles.termRoot} style={{ padding: 20, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
			<div style={{ marginTop: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flex: "none" }}>
				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<button onClick={() => setMode("input")} style={{ padding: "6px 10px", background: "#e5e7eb", borderRadius: 6 }}>入力</button>
					<button onClick={() => setMode("preview")} style={{ padding: "6px 10px", background: "#e5e7eb", borderRadius: 6 }}>出力</button>
					<button onClick={() => setMode("both")} style={{ padding: "6px 10px", background: "#e5e7eb", borderRadius: 6 }}>両方</button>
					<button onClick={downloadMarkdown} style={{ padding: "6px 10px", background: "#60a5fa", color: "white", borderRadius: 6 }}>保存 (.md)</button>
				</div>
			</div>

			<div style={{ display: "flex", gap: 16, alignItems: "stretch", flex: 1, minHeight: 0 }}>
				{(mode === "both" || mode === "input") && (
					<div style={{ flex: "1 1 0%", display: "flex", flexDirection: "column" }}>
						<InputEditor text={text} onChange={setText} scrollRef={inputRef} onScroll={handleInputScroll} />
					</div>
				)}

				{(mode === "both" || mode === "preview") && (
					<div style={{ flex: "1 1 0%", display: "flex", flexDirection: "column" }}>
						<MarkdownPreview text={text} scrollRef={previewRef} className={styles.mdPreview} />
					</div>
				)}
			</div>
		</main>
	)
}
