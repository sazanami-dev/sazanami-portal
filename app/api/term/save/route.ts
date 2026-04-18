import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireViewerRole } from "@/lib/members/route-helpers";

export async function POST(request: Request) {
    const ctx = await requireViewerRole();

    if (ctx.error === "unauthenticated") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    if (ctx.error === "not_registered" || ctx.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let bodyJson: any = null;
    try {
    bodyJson = await request.json();
    } catch (err) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!bodyJson || typeof bodyJson.content !== "string") {
    return NextResponse.json(
        { error: "invalid_body", detail: "missing content string" },
        { status: 400 },
    );
}

    const { content, version = 1 } = bodyJson;

    const admin = createAdminClient();
    const { error } = await admin.from("terms").insert({
    id: crypto.randomUUID(),
    content,
    version,
    updated_by: ctx.userId ?? null,
});

    if (error) {
    console.error("会則の保存に失敗しました:", error.message);
    return NextResponse.json(
        { error: "terms_insert_failed", detail: error.message },
        { status: 500 },
    );
    }

    return NextResponse.json({ ok: true });
}
