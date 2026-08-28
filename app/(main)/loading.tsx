import { Skeleton } from '@/components/ui/skeleton'

// (main) 配下全体の既定フォールバック。
// loading.tsx はファイル規約だが、親セグメントの境界は子セグメントに継承される
// ため、ルートごとに置く必要はない（/members も /upload もこれが使われる）。
// 幅は各ページの実幅 768px×3 / 896px×1 / 1152px×2 / 1250px×1 に対して
// 平均ズレが最小になる max-w-4xl(896px) を採用している。
// layout.tsx が既に pt-32 を付けているため、ここでは付けない。
export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
