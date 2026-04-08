"use client"

import { useState, useRef } from "react"
import InputEditor from "./components/InputEditor"
import MarkdownPreview from "./components/MarkdownPreview"
import styles from "./page.module.css"

type ViewMode = "both" | "input" | "preview"

export default function TermPage() {
	const [text, setText] = useState<string>("# Hello Markdown\n\nWrite some *Markdown* on the left.")
	const [mode, setMode] = useState<ViewMode>("both")

	const inputRef = useRef<HTMLTextAreaElement | null>(null)
	const previewRef = useRef<HTMLDivElement | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

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
		// デフォルト名（YYYY-MM-DD-term）を用意してユーザーに入力を促す
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

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputEl = e.currentTarget
		const f = inputEl.files?.[0]
		if (!f) return
		const name = f.name.toLowerCase()
		if (!name.endsWith('.md')) {
			alert('拡張子 .md のファイルを選択してください')
			return
		}
		try {
			const content = await f.text()
			// エディタが現在空なら確認不要で上書き
			const editorHasText = !!text && text.length > 0
			if (content.length === 0) {
			} else {
				if (editorHasText) {
					if (!confirm('ファイルの内容で現在のエディタを上書きしますか？')) {
						inputEl.value = ''
						return
					}
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
		<main className={styles.termRoot} style={{ padding: 20, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
			<div style={{ marginTop: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flex: "none" }}>
				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<button onClick={() => setMode("input")} style={{ padding: "6px 10px", background: "#e5e7eb", borderRadius: 6 }}>入力</button>
					<button onClick={() => setMode("preview")} style={{ padding: "6px 10px", background: "#e5e7eb", borderRadius: 6 }}>出力</button>
					<button onClick={() => setMode("both")} style={{ padding: "6px 10px", background: "#e5e7eb", borderRadius: 6 }}>両方</button>
					<button onClick={downloadMarkdown} style={{ padding: "6px 10px", background: "#60a5fa", color: "white", borderRadius: 6 }}>保存 (.md)</button>
					<button onClick={() => fileInputRef.current?.click()} style={{ padding: "6px 10px", background: "#34d399", color: "white", borderRadius: 6 }}>読み込む (.md)</button>
					<input ref={fileInputRef} onChange={handleFileChange} accept=".md,text/markdown" type="file" style={{ display: 'none' }} />
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
