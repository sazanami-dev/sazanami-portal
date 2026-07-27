import { redirect } from 'next/navigation'
import { requireViewerRole } from '@/lib/members/route-helpers'
import EditClient from './edit-client'

export default async function Page() {
    const { role, error } = await requireViewerRole()
    if (error === 'unauthenticated') redirect('/signin')
    if (role !== 'admin' && role !== 'developer') redirect('/term')

    return <EditClient />
}
