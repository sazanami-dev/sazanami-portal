import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/app/(auth)/components/signout-button'

export default async function Home() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/signin')
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-5 dark:bg-black">
      <div className="w-full max-w-7xl space-y-8">

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sazanami Portal
          </h1>
          <p className="mt-2 text-muted-foreground">
            ようこそ、<span className="font-medium text-foreground">{data.claims.email}</span> さん
          </p>
        </div>

        <div className="flex justify-center">
          <LogoutButton />
        </div>

      </div>
    </div>
  )
}
