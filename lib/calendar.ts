import { google } from 'googleapis';
import { unstable_cache } from 'next/cache';
import { errorMessage } from '@/lib/errors';

export type UpcomingEvent = {
  id: string;
  title: string;
  start: string; // ISO date string or date
  end: string;   // ISO date string or date
  location: string | null;
  isAllDay: boolean;
};

async function fetchUpcomingEventsFromGoogle(): Promise<UpcomingEvent[]> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const calId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientId || !clientSecret || !refreshToken || !calId) {
    throw new Error('Google Calendar API credentials are not fully set.');
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const res = await calendar.events.list({
    calendarId: calId,
    timeMin: new Date().toISOString(),
    maxResults: 3,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const items = res.data.items || [];

  return items.map((item) => {
    const isAllDay = !!item.start?.date;
    const start = item.start?.dateTime || item.start?.date || '';
    const end = item.end?.dateTime || item.end?.date || '';
    
    return {
      id: item.id || crypto.randomUUID(),
      title: item.summary || '予定',
      start,
      end,
      location: item.location || null,
      isAllDay,
    };
  });
}

// キャッシュ: 5分 (300秒)
export const getUpcomingEvents = unstable_cache(
  fetchUpcomingEventsFromGoogle,
  ['upcoming-events'],
  { revalidate: 300 }
);
