import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireViewerRole } from "@/lib/members/route-helpers";

export async function POST(request: Request) {
    const ctx = await requireViewerRole();

    if (ctx.error === "unauthenticated") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // 未登録、または role が admin / developer のいずれでもない場合は拒否
    if (ctx.error === "not_registered" || (ctx.role !== "admin" && ctx.role !== "developer")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let bodyJson: unknown = null;
    try {
        bodyJson = await request.json();
    } catch (err) {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (
        !bodyJson ||
        typeof bodyJson !== "object" ||
        typeof (bodyJson as { content?: unknown }).content !== "string"
    ) {
        return NextResponse.json(
            { error: "invalid_body", detail: "missing content string" },
            { status: 400 },
        );
    }

    const { content } = bodyJson as { content: string };

    const admin = createAdminClient();

    // 現在の最新バージョンを取得してサーバ側でインクリメントする
    const { data: latestRows, error: selErr } = await admin
        .from("terms")
        .select("version")
        .order("version", { ascending: false })
        .limit(1);

    if (selErr) {
        console.error("会則の最新バージョン取得に失敗しました:", selErr.message);
        return NextResponse.json({ error: "terms_select_failed", detail: selErr.message }, { status: 500 });
    }

    const latestVersion = (Array.isArray(latestRows) && latestRows[0]?.version) ? Number(latestRows[0].version) : 0;
    const nextVersion = latestVersion + 1;

    const { error } = await admin.from("terms").insert({
        id: crypto.randomUUID(),
        content,
        version: nextVersion,
        updated_by: ctx.userId ?? null,
    });

    if (error) {
        console.error("会則の保存に失敗しました:", error.message);
        return NextResponse.json(
            { error: "terms_insert_failed", detail: error.message },
            { status: 500 },
        );
    }

    return NextResponse.json({ ok: true, version: nextVersion });
}
