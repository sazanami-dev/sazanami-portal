import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['admin', 'developer', 'manager', 'member'] as const

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!folderId || !clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: 'server_config_missing' }, { status: 500 })
  }

  // 剥奪対象外のメールアドレス一覧（許可ロールの全ユーザー）
  const { data: allowedUsers, error: dbErr } = await admin
    .from('users')
    .select('email')
    .in('role', ALLOWED_ROLES)

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  const allowedEmails = new Set(
    (allowedUsers ?? []).map((r) => r.email.toLowerCase())
  )

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  const drive = google.drive({ version: 'v3', auth: oAuth2Client })

  // フォルダの全 user 権限をページネーションで取得
  const targets: { id: string; email: string }[] = []
  let pageToken: string | undefined

  try {
    do {
      const res = await drive.permissions.list({
        fileId: folderId,
        fields: 'nextPageToken,permissions(id,type,emailAddress,role)',
        supportsAllDrives: true,
        pageToken,
      })
      for (const p of res.data.permissions ?? []) {
        if (
          p.type === 'user' &&
          p.id &&
          p.emailAddress &&
          !allowedEmails.has(p.emailAddress.toLowerCase())
        ) {
          targets.push({ id: p.id, email: p.emailAddress })
        }
      }
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)
  } catch (e: any) {
    console.error('[drive/bulk-revoke] permissions.list failed:', e?.message)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  if (targets.length === 0) {
    return NextResponse.json({ revoked: 0, revokedEmails: [], failed: [] })
  }

  const revokedEmails: string[] = []
  const failed: { email: string }[] = []

  for (const { id, email } of targets) {
    try {
      await drive.permissions.delete({
        fileId: folderId,
        permissionId: id,
        supportsAllDrives: true,
      })
      revokedEmails.push(email)
    } catch (e: any) {
      console.error('[drive/bulk-revoke] permissions.delete failed:', email, e?.message)
      failed.push({ email })
    }
  }

  return NextResponse.json({
    revoked: revokedEmails.length,
    revokedEmails,
    failed,
    total: targets.length,
  })
}
