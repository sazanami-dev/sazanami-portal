import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { requireViewerRole } from '@/lib/members/route-helpers'
import TermClient from './term-client'

export default async function TermPage() {
    const supabase = await createClient()

    // 会則本文の取得と権限判定は互いに独立なので並列に投げる。
    // 従来はサーバーで getUser を待ったあと、クライアントが /api/term/export を
    // 再取得しており2往復ぶん待たせていた。
    const [roleCtx, termsRes] = await Promise.all([
        requireViewerRole(),
        supabase
            .from('terms')
            .select('content')
            .order('version', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])

    if (roleCtx.error === 'unauthenticated') redirect('/signin')

    const isAuthorized = roleCtx.role === 'admin' || roleCtx.role === 'developer'
    const content = termsRes.data?.content ?? null

    return <TermClient content={content} isAuthorized={isAuthorized} />
}
