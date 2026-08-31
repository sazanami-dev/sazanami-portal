import React from 'react'

export function AnnouncementEditor() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold">お知らせを作成</h2>
          <button className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">タイトル</label>
            <input
              type="text"
              placeholder="【】タイトルを入力"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">本文 (Markdown)</label>
            <textarea
              rows={8}
              placeholder="お知らせの内容を入力してください..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex justify-between pt-4">
            <button className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
              下書き保存
            </button>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
