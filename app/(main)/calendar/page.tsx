import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import CalendarClient from './calendar-client'

export default async function Page() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/signin')

    const admin = createAdminClient()
    const { data: appUser } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
    const role = appUser?.role
    const allowed = role === 'admin' || role === 'developer' || role === 'manager'
    if (!allowed) redirect('/')

    return <CalendarClient />
}
