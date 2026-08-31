import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
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
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black md:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">
          ダッシュボード
        </h1>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Main content column (Left on Desktop) */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <AnnouncementsSection />
            <UpcomingEventsSection />
          </div>

          {/* Sidebar column (Right on Desktop) */}
          <div className="flex flex-col gap-6">
            <ProfileCard />
            {/* Note: LogoutButton can be moved to header or keep it somewhere else */}
          </div>
        </div>
      </div>
    </div>
  )
}
