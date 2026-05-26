import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!folderId || !clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: 'server_config_missing' }, { status: 500 })
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oAuth2Client.setCredentials({ refresh_token: refreshToken })

  const drive = google.drive({ version: 'v3', auth: oAuth2Client })

  // 重複チェック（失敗してもスキップして付与を試みる）
  try {
    const existing = await drive.permissions.list({
      fileId: folderId,
      fields: 'permissions(emailAddress,role)',
      supportsAllDrives: true,
    })
    const alreadyGranted = existing.data.permissions?.some(
      (p) => p.emailAddress === user.email && p.role === 'reader'
    )
    if (alreadyGranted) {
      return NextResponse.json({ granted: true, alreadyExisted: true })
    }
  } catch (listErr: any) {
    console.error('[drive/grant-access] permissions.list failed:', listErr?.message)
  }

  try {
    await drive.permissions.create({
      fileId: folderId,
      sendNotificationEmail: false,
      supportsAllDrives: true,
      requestBody: {
        role: 'reader',
        type: 'user',
        emailAddress: user.email,
      },
    })
    return NextResponse.json({ granted: true })
  } catch (createErr: any) {
    console.error('[drive/grant-access] permissions.create failed:', createErr?.message)
    return NextResponse.json({ error: 'drive_permission_failed' }, { status: 500 })
  }
}
