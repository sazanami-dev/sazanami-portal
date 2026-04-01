"use client"

import MarkdownPreview from "./MarkdownPreview"
import styles from "../page.module.css"

type Props = {
  initialText?: string
}

export default function TermClient({ initialText = "# 利用規約\n\nここに規約テキストが表示されます。" }: Props) {
  const content = initialText ?? ""

  return (
    <main className={styles.termRoot} style={{ padding: 0, boxSizing: "border-box" }}>
      <div style={{ height: "100%", width: "100%" }}>
        <MarkdownPreview text={content} className={styles.mdPreview} />
      </div>
    </main>
  )
}
