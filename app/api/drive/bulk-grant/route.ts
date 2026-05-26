import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
  if (caller?.role !== 'admin' && caller?.role !== 'developer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!folderId || !clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: 'server_config_missing' }, { status: 500 })
  }

  const TARGET_ROLE = process.env.GOOGLE_DRIVE_GRANT_ROLE ?? 'member'
  const { data: targets, error: dbErr } = await admin
    .from('users')
    .select('email')
    .eq('role', TARGET_ROLE)
    .eq('status', 'active')

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  const emails = (targets ?? []).map((r) => r.email).filter(Boolean) as string[]
  if (emails.length === 0) {
    return NextResponse.json({ granted: 0, skipped: 0, failed: [] })
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  const drive = google.drive({ version: 'v3', auth: oAuth2Client })

  // 既存 permission 一覧を取得（重複スキップ用）
  let existingEmails = new Set<string>()
  try {
    const existing = await drive.permissions.list({
      fileId: folderId,
      fields: 'permissions(emailAddress,role)',
      supportsAllDrives: true,
    })
    for (const p of existing.data.permissions ?? []) {
      if (p.emailAddress && p.role === 'reader') {
        existingEmails.add(p.emailAddress.toLowerCase())
      }
    }
  } catch (e: any) {
    console.error('[drive/bulk-grant] permissions.list failed:', e?.message)
  }

  const grantedEmails: string[] = []
  const skippedEmails: string[] = []
  const failed: { email: string; error: string }[] = []

  for (const email of emails) {
    if (existingEmails.has(email.toLowerCase())) {
      skippedEmails.push(email)
      continue
    }
    try {
      await drive.permissions.create({
        fileId: folderId,
        sendNotificationEmail: false,
        supportsAllDrives: true,
        requestBody: { role: 'reader', type: 'user', emailAddress: email },
      })
      grantedEmails.push(email)
    } catch (e: any) {
      console.error('[drive/bulk-grant] permissions.create failed:', email, e?.message)
      failed.push({ email, error: 'drive_permission_failed' })
    }
  }

  return NextResponse.json({
    granted: grantedEmails.length,
    grantedEmails,
    skipped: skippedEmails.length,
    skippedEmails,
    failed,
    total: emails.length,
  })
}
