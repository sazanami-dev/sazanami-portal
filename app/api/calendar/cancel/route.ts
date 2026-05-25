import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type RequestBody = {
  date?: string;
  calendarId?: string;
};

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type が application/json ではありません" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as RequestBody;
    const { date, calendarId } = body || {};
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "日付が不正です（形式: YYYY-MM-DD）" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    const admin = createAdminClient();
    const { data: appUser } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = appUser?.role;
    const allowed = role === "admin" || role === "developer" || role === "manager";
    if (!allowed)
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });

    const calId = calendarId ?? process.env.GOOGLE_CALENDAR_ID;
    if (!calId) {
      return NextResponse.json(
        {
          error:
            "calendarId が指定されておらず、環境変数 GOOGLE_CALENDAR_ID も設定されていません",
        },
        { status: 400 },
      );
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

    const timeMin = new Date(`${date}T00:00:00Z`).toISOString();
    const timeMax = new Date(
      new Date(`${date}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();

    const list = await calendar.events.list({
      calendarId: calId,
      timeMin,
      timeMax,
      singleEvents: true,
      maxResults: 250,
    });
    const items = list.data.items ?? [];

    const toDelete = items.filter((ev) => {
      const s = ev.start ?? {};
      if (s.date === date) return true;
      if (s.dateTime) {
        const dt = new Date(s.dateTime);
        const d = dt.toISOString().slice(0, 10);
        return d === date;
      }
      return false;
    });

    const results: any[] = [];
    for (let i = 0; i < toDelete.length; i++) {
      const ev = toDelete[i];
      if (!ev.id) {
        results.push({ error: `イベントに ID がありません (index ${i})` });
        continue;
      }
      try {
        await calendar.events.delete({ calendarId: calId, eventId: ev.id });
        results.push({ id: ev.id });
      } catch (_e: any) {
        const short = String(_e?.message ?? "不明なエラー").slice(0, 200);
        results.push({ error: `イベント削除に失敗しました: ${short}` });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
