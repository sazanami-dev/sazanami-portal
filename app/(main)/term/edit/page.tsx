import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditClient from './edit-client'

export default async function Page() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/signin')

    const admin = createAdminClient()
    const { data: appUser, error } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
    const role = appUser?.role
    const allowed = role === 'admin' || role === 'developer'
    if (!allowed) redirect('/term')

    return <EditClient />
}