import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../authOptions';
import { Client } from 'pg';

// PostgreSQL 接続設定
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

// お知らせの一覧を取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
    }

    const res = await client.query(
      'SELECT announcement_id, creator_email, created_at, title, content FROM announcements ORDER BY created_at DESC'
    );
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'お知らせの取得中にエラーが発生しました' }, { status: 500 });
  }
}

// お知らせを新規作成
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
    }

    const creator_email = session.user.email;
    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'タイトルと内容は必須です。' }, { status: 400 });
    }

    const res = await client.query(
      'INSERT INTO announcements (creator_email, title, content) VALUES ($1, $2, $3) RETURNING *',
      [creator_email, title, content]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'お知らせの作成中にエラーが発生しました' }, { status: 500 });
  }
}

// お知らせを削除
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
    }

    const body = await req.json();
    const { announcement_id } = body;

    if (!announcement_id) {
      return NextResponse.json({ error: 'announcement_id は必須です。' }, { status: 400 });
    }

    const result = await client.query(
      'DELETE FROM announcements WHERE announcement_id = $1 AND creator_email = $2 RETURNING *',
      [announcement_id, session.user.email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: '削除対象が存在しない、または権限がありません。' }, { status: 403 });
    }

    return NextResponse.json({ message: '削除に成功しました' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除中にエラーが発生しました' }, { status: 500 });
  }
}
