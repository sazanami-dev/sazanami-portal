import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../authOptions";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証されていません。" }, { status: 401 });
    }

    const email = session.user.email;

    const result = await pool.query("SELECT role FROM users WHERE email = $1", [email]);

    switch (result.rows[0].role) {
      case "admin":
      case "manager":
        const allMembers = await pool.query("SELECT * FROM users");
        return NextResponse.json({ members: allMembers.rows, role: result.rows[0].role });
      default:
        const basicMembers = await pool.query("SELECT name FROM users");
        return NextResponse.json({ members: basicMembers.rows, role: result.rows[0].role });
    }
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "データ取得に失敗しました。" }, { status: 500 });
  }
}
