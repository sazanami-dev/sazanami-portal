import { Skeleton } from '@/components/ui/skeleton'

// (main) 配下全体の既定フォールバック。
// layout.tsx が既に pt-32 を付けているため、ここでは付けない。
export default function Loading() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
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
