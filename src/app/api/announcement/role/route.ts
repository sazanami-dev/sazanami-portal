import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../authOptions';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
    }

    const result = await client.query('SELECT role FROM users WHERE email = $1', [email]);
    const role = result.rows[0]?.role || null;

    return NextResponse.json({ role });
  } catch (error) {
    console.error('ロール取得エラー:', error);
    return NextResponse.json({ error: 'ロール取得に失敗しました' }, { status: 500 });
  }
}
