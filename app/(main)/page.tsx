import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileCard } from '@/app/(main)/components/dashboard/profile-card'
import { AnnouncementsSection } from '@/app/(main)/components/dashboard/announcements-section'
import { UpcomingEventsSection } from '@/app/(main)/components/dashboard/upcoming-events-section'

export default async function Home() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-4 dark:bg-black md:px-8">
      <div className="mx-auto max-w-[1600px]">
        
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[320px_1fr_1fr] lg:gap-6 xl:grid-cols-[380px_1fr_1fr] xl:gap-4">
          {/* プロフィールカード (左) */}
          <div className="flex h-full flex-col">
            <ProfileCard />
          </div>

          {/* お知らせ (中央) */}
          <div className="flex h-full flex-col">
            {/* お知らせの取得を待たずに他のカードを先に表示する */}
            <Suspense fallback={<Skeleton className="h-full min-h-72 w-full rounded-xl" />}>
              <AnnouncementsSection />
            </Suspense>
          </div>

          {/* 今後の活動 (右) */}
          <div className="flex h-full flex-col">
            <UpcomingEventsSection />
          </div>
        </div>
      </div>
    </div>
  )
}
