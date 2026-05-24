import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient, createAdminClient } from '@/lib/supabase/server'

type Item = {
  clientId?: string;
  title?: string;
  startDate: string;
  endDate?: string;
  category?: "internal" | "external" | string;
  location?: string;
  colorId?: string;
};

type RequestBody = {
  calendarId: string;
  title?: string; 
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
  category?: "internal" | "external" | string;
  location?: string;
  colorId?: string;
  items?: Item[];
};

export async function POST(req: Request) {
  try {

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type が application/json ではありません' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 })
    }
    const admin = createAdminClient()
    const { data: appUser } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
    const role = appUser?.role
    const allowed = role === 'admin' || role === 'developer'
    if (!allowed) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = (await req.json()) as RequestBody;

    const {
      calendarId,
      title,
      category,
      location,
      items,
      startDate,
      endDate,
      allDay,
    } = body || {};
    const calId = calendarId ?? process.env.GOOGLE_CALENDAR_ID;
    if (!calId) {
      return NextResponse.json(
        {
          error: "calendarId が指定されておらず、環境変数 GOOGLE_CALENDAR_ID も設定されていません",
        },
        { status: 400 },
      );
    }

        const allowedColorIds = new Set(['1','2','3','4','5','6','7','8','9','10','11'])

    function makeSummary(base?: string | null, loc?: string | null) {
      const baseStr = base ?? undefined;
      const locStr = loc ? String(loc).trim() : undefined;
      if (baseStr && locStr) {
        if (!baseStr.includes("@")) return `${baseStr}@${locStr}`;
        return baseStr;
      }
      return baseStr ?? "予定";
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        {
          error:
            "サーバー設定不備: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN のいずれかが未設定です",
        },
        { status: 500 },
      );
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oAuth2Client.setCredentials({ refresh_token: refreshToken });
    await oAuth2Client.getAccessToken();

    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    if (Array.isArray(items)) {
      if (items.length === 0)
        return NextResponse.json(
          { error: "イベントが指定されていません" },
          { status: 400 },
        );

      if (items.length > 10)
        return NextResponse.json(
          { error: "一度に送信できるイベントは10個までです" },
          { status: 400 },
        );

      const results: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const itStart = it.startDate;
        if (!itStart) {
          results.push({ error: "イベントの開始日が指定されていません" });
          continue;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(itStart)) {
          results.push({ error: "開始日時の形式が無効です" });
          continue;
        }

        const start = { date: itStart };
        const itEnd =
          it.endDate ??
          new Date(new Date(itStart).getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        const end = { date: itEnd };

        const safeTitle = String(it.title ?? title ?? '').trim().slice(0, 200)
        const safeLocation = String(it.location ?? location ?? '').trim().slice(0, 200)

        const color = String(it.colorId ?? (body as any)?.colorId ?? '')
        if (color && !allowedColorIds.has(color)) {
          results.push({ error: `invalid colorId: ${color}` })
          continue
        }

        const summary = makeSummary(safeTitle || undefined, safeLocation || undefined);
        const event: any = { summary, start, end };
        event.reminders = { useDefault: false };
        event.conferenceData = {useDefault: false};
        if (color) event.colorId = color;
        if (safeLocation) event.location = safeLocation;

        const cat = it.category ?? category;
        if (cat) {
          const catLabel =
            cat === "internal" ? "内部" : cat === "external" ? "外部" : cat;
          event.description = `区分: ${catLabel}`;
        }

        try {
          const res = await calendar.events.insert({
            calendarId: calId,
            requestBody: event,
          });
          results.push({ clientId: it.clientId, id: res.data.id, htmlLink: res.data.htmlLink });
        } catch (_e: any) {
          const short = String(_e?.message ?? '不明なエラー').slice(0, 200)
          results.push({ clientId: it.clientId, error: `イベント作成に失敗しました (index ${i}): ${short}` })
        }
      }

      return NextResponse.json({ results });
    }

    if (!allDay)
      return NextResponse.json(
        { error: "終日イベントのみがサポートされています" },
        { status: 400 },
      );
      
    if (!startDate)
      return NextResponse.json(
        { error: "イベントの開始日が指定されていません" },
        { status: 400 },
      );

    const start = { date: startDate };
    const end = {
      date:
        endDate ??
        new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
    };
    const singleSummary = makeSummary(title ?? undefined, location ?? undefined);
    const singleEvent: any = { summary: singleSummary, start, end };
    singleEvent.reminders = { useDefault: false };
    if (body?.colorId) singleEvent.colorId = String(body.colorId);
    if (location) singleEvent.location = location;
    if (category)
      singleEvent.description = `区分: ${category === "internal" ? "内部" : category === "external" ? "外部" : category}`;

    const res = await calendar.events.insert({
      calendarId: calId,
      requestBody: singleEvent,
    });
    return NextResponse.json({ id: res.data.id, htmlLink: res.data.htmlLink });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 500 },
    );
  }
}
