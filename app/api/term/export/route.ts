import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireViewerRole } from "@/lib/members/route-helpers";

export async function GET() {
  const ctx = await requireViewerRole();

  if (ctx.error === "unauthenticated") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // 未登録ユーザーにも会則は閲覧可能とする（join フロー中の参照用）
  // ただし認証済みであることは必須。

  try {
    const admin = createAdminClient();

    //最新バージョンを優先、同じバージョンが複数ある場合は
    //更新日時の新しいものを優先して会則データを取得
    const { data, error } = await admin
      .from("terms")
      .select("content,version,updated_at")
      .order("version", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("会則データの取得エラー :", error.message);
    }

    const content = data?.content ?? null;
    const version = data?.version ?? null;
    const updated_at = data?.updated_at ?? null;

    // 編集ボタン許可: admin または developer ロールを許可
    const isAuthorized = ctx.role === "admin" || ctx.role === "developer";

    return NextResponse.json({ content, version, updated_at, isAuthorized });
    
  } catch (err) {
    console.error("GET /api/term/export 予期せぬエラー:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}