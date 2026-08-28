'use client'

// (main) 配下のエラー境界。データ取得に失敗しても再試行できるようにする。
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto max-w-2xl space-y-4 p-6 text-center">
      <h2 className="text-xl font-bold">読み込みに失敗しました</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
      >
        再試行
      </button>
    </div>
  )
}
