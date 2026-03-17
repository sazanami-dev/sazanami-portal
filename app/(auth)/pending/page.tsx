import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) redirect('/signin')

  const { data: appUser } = await supabase
    .from('users')
    .select('status')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!appUser) redirect('/signup')
  if (appUser.status === 'active') redirect('/')

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold">承認待ち</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        現在、登録内容を確認中です。承認されるまでお待ちください。
      </p>
    </main>
  )
}