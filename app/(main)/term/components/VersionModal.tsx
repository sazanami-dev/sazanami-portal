"use client"

import React, { useState } from "react"
import styles from "../page.module.css"

type Props = {
    open: boolean
    initial?: string
    onClose: () => void
    onConfirm: (version: number) => Promise<void> | void
}

export default function VersionModal({ open, initial = "", onClose, onConfirm }: Props) {
    const [value, setValue] = useState(initial)
    const [busy, setBusy] = useState(false)

    if (!open) return null

    const handleConfirm = async () => {
        const parsed = Number(value)
        if (!Number.isFinite(parsed) || parsed <= 0) {
            alert("無効なバージョン番号です")
            return
        }
        if (!confirm(`バージョン ${Math.floor(parsed)} で本当に保存しますか？`)) return
        try {
            setBusy(true)
            await onConfirm(Math.floor(parsed))
            onClose()
        } catch (err) {
            console.error(err)
            alert("保存中にエラーが発生しました")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <h3>バージョンを入力</h3>
                <p>保存するバージョン番号を入力してください</p>
                <input
                    className={styles.modalInput}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="バージョン番号"
                    aria-label="バージョン番号"
                />
                <div className={styles.modalActions}>
                    <button className={styles.modeButton} onClick={onClose} disabled={busy}>
                        キャンセル
                    </button>
                    <button
                        className={styles.modeButton}
                        style={{ background: "#10b981", color: "white" }}
                        onClick={handleConfirm}
                        disabled={busy}
                    >
                        {busy ? "保存中..." : "確定"}
                    </button>
                </div>
            </div>
        </div>
    )
}
