import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { PENDING_APPROVER_ROLES } from '@/lib/members/permissions'
import { requireViewerRole } from '@/lib/members/route-helpers'
import { sendApprovalEmail } from '@/lib/mailer'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const { id: targetId } = await context.params
  const ctx = await requireViewerRole()
  if (ctx.error === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (ctx.error === 'not_registered' || !ctx.role || !ctx.userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (
    !ctx.role ||
    !(PENDING_APPROVER_ROLES as readonly string[]).includes(ctx.role)
  ) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: target, error: te } = await admin
    .from('users')
    .select('id, status, email, name')
    .eq('id', targetId)
    .maybeSingle()

  if (te || !target) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (target.status !== 'pending') {
    return NextResponse.json({ error: 'not_pending' }, { status: 400 })
  }

  const { error } = await admin
    .from('users')
    .update({
      status: 'active',
      role: 'member',
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await sendApprovalEmail(target.email, target.name)
    } catch (mailErr) {
      console.error('[approve] email send failed:', mailErr)
    }
  }

  return NextResponse.json({ ok: true })
}
