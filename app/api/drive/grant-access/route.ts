import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // 付与条件はクライアント側(join-platform-actions)でしか見ていなかったため、
  // 認証さえ通れば誰でも共有ドライブの閲覧権限を取得できていた。
  // Google OAuth にドメイン制限が無く誰でもサインインできるので、
  // 同じ条件をサーバー側でも検証する。
  const admin = createAdminClient()
  const [appUserRes, identityRes] = await Promise.all([
    admin.from('users').select('id').eq('id', user.id).maybeSingle(),
    admin
      .from('user_identities')
      .select('provider,is_server_joined')
      .eq('user_id', user.id),
  ])

  // 未登録（join フローを通っていない）利用者には付与しない
  if (appUserRes.error || !appUserRes.data) {
    return NextResponse.json({ error: 'not_registered' }, { status: 403 })
  }

  const identities = identityRes.data ?? []
  const joined = (provider: string) =>
    identities.some((r) => r.provider === provider && r.is_server_joined)
  if (!joined('discord') || !joined('github')) {
    return NextResponse.json({ error: 'platforms_not_joined' }, { status: 403 })
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
