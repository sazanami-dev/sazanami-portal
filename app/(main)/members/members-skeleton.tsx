import { Skeleton } from '@/components/ui/skeleton'

// Suspense フォールバック用。見出し・ボタンは page 側で確定表示されるので、
// ここでは一覧本体だけをスケルトンにする。
export function MembersSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}
