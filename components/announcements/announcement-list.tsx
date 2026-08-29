import React from 'react'

export function AnnouncementList() {
  return (
    <div className="rounded-xl border bg-card shadow">
      {/* 検索・絞り込みなどのヘッダー部分 */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="お知らせを検索..."
            className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {/* TODO: Add category filter dropdown */}
        </div>
      </div>

      {/* リスト部分 */}
      <div className="divide-y">
        {/* Placeholder item */}
        <div className="flex items-start justify-between p-4 transition-colors hover:bg-muted/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900 dark:text-red-300">
                重要
              </span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                広報
              </span>
            </div>
            <h3 className="mt-2 text-lg font-semibold hover:cursor-pointer hover:text-primary">
              Announcement Title 1
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              This is a preview of the announcement content...
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
            <span>2026/08/30 10:00</span>
            {/* TODO: Show edit button if manager+ */}
            <button className="text-primary hover:underline">編集</button>
          </div>
        </div>
      </div>
      
      {/* ページネーション部分 */}
      <div className="flex items-center justify-center border-t p-4">
        <p className="text-sm text-muted-foreground">ページネーション</p>
      </div>
    </div>
  )
}
