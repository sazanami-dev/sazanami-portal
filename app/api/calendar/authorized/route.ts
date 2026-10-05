import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ isAuthorized: false })

    const admin = createAdminClient()
    const { data: appUser, error } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
    if (error) {
      console.error('GET /api/calendar/authorized error:', error)
      return NextResponse.json({ isAuthorized: false })
    }

    const role = appUser?.role
    const allowed = role === 'admin' || role === 'developer' || role === 'manager'
    return NextResponse.json({ isAuthorized: allowed })
  } catch (err) {
    console.error('GET /api/calendar/authorized unexpected error:', err)
    return NextResponse.json({ isAuthorized: false })
  }
}
