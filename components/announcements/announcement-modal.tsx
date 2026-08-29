import React from 'react'

export function AnnouncementModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold">【広報】ポータルサイトリニューアルのお知らせ</h2>
          <button className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            広報
          </span>
          <span>公開日: 2026/08/30 10:00</span>
        </div>
        <div className="prose prose-sm mt-6 dark:prose-invert">
          <p>
            ポータルサイトが新しくなりました。ダッシュボードからお知らせや今後の活動が確認できるようになりました。
          </p>
          <ul>
            <li>お知らせ機能</li>
            <li>プロフィール機能</li>
            <li>今後の活動表示</li>
          </ul>
        </div>
        <div className="mt-8 flex justify-end">
          <button className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
