import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../authOptions";
import { Pool } from "pg";

// PostgreSQL 接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証されていません。" }, { status: 401 });
    }

    const email = session.user.email;

    const { newProjectName, newProjectDescription } = await req.json();

    if (!newProjectName || !newProjectDescription) {
      return NextResponse.json(
        { error: "プロジェクト名と説明は必須です。" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *",
      [newProjectName, newProjectDescription],
    );

    await pool.query(
      "INSERT INTO joined_project (email, project_id) VALUES ($1, $2) RETURNING *",
      [email, result.rows[0].id],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error inserting project:", error);
    return NextResponse.json(
      { error: "プロジェクトの登録中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証されていません。" }, { status: 401 });
    }

    const email = session.user.email;

    const result = await pool.query(
      "SELECT p.id, p.name, p.description FROM projects p INNER JOIN joined_project jp ON p.id = jp.project_id WHERE jp.email = $1",
      [email]
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "プロジェクト一覧の取得中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
