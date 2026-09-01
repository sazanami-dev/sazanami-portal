import { google, type calendar_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

// Drive 側 (lib/drive/client.ts) と同じ環境変数・同じ組み立て方だが、
// カレンダー機能から Drive モジュール全体を読み込まずに済むよう別に持つ。

export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('server_config_missing')
  }
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  return oAuth2Client
}

export function getCalendarClient(): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth: getOAuthClient() })
}

/** 表示対象のカレンダーID。未設定ならエラー（呼び出し側で握りつぶす） */
export function getDefaultCalendarId(): string {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('calendar_id_missing')
  return calendarId
}
