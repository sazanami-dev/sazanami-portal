import { NextResponse } from 'next/server';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

// GETリクエスト - お知らせの一覧を取得
export async function GET() {
  try {
    const res = await client.query('SELECT * FROM announcements ORDER BY timestamp DESC');
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching announcements' }, { status: 500 });
  }
}

// POSTリクエスト - お知らせを新規作成
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_email, title, content } = body;

    const res = await client.query(
      'INSERT INTO announcements (user_email, title, content) VALUES ($1, $2, $3) RETURNING *',
      [user_email, title, content]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error creating announcement' }, { status: 500 });
  }
}
