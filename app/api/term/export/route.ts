import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    //最新バージョンを優先、同じバージョンが複数ある場合は
    //更新日時の新しいものを優先して会則データを取得
    const { data, error } = await supabase
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
    
    let isAdmin = false;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (userId && !authError) {
        const { data: appUser } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
          
        isAdmin = appUser?.role === "admin";
      }
    } catch (e) {
      console.error("ユーザー情報の取得に失敗:", e);
    }

    return NextResponse.json({ content, version, updated_at, isAdmin });
    
  } catch (err) {
    console.error("GET /api/term/export 予期せぬエラー:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}