import Image from "next/image";
import { redirect } from 'next/navigation'

import { LogoutButton } from '@/app/(auth)/components/signout-button'
import { createClient } from '@/lib/supabase/server'
import TermClient from './term-client'


export default async function Home() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/signin')

    return <TermClient />
}