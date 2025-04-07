import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../authOptions";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "認証されていません。" },
        { status: 403 }
      );
    }
    const useremail = session.user.email;
    const getRole = await pool.query("SELECT role FROM users WHERE email = $1", [useremail]);
    const userRole = getRole.rows[0].role;
    const {email, role} = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "メールアドレスとロールは必須です。" },
        { status: 400 }
      );
    }

    // 自分ではロールを変更できないようにする
    if (email === useremail) {
      return NextResponse.json(
        { error: "自分のロールを変更することはできません。" },
        { status: 403 }
      );
    }

    // 管理者の権限チェック
    if (userRole === "admin") {
      await pool.query("UPDATE users SET role = $1 WHERE email = $2", [
        role,
        email,
      ]);
    } else if (userRole === "manager") {
      // 運営の権限チェック
      if (role !== "manager") {
        return NextResponse.json(
          { error: "運営はメンバーを運営に昇格させることしかできません。" },
          { status: 403 }
        );
      }
      await pool.query("UPDATE users SET role = $1 WHERE email = $2", [
        role,
        email,
      ]);
    } else {
      return NextResponse.json(
        { error: "ロールを変更する権限がありません。" },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: "ロールが正常に更新されました。" });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "ロールの更新中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}