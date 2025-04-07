import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const { email, classname, classnumber, name, studentid } = await req.json();

    if (!email || !classname || !classnumber || !name || !studentid) {
      return NextResponse.json({ error: 'すべてのフィールドを入力してください。' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO users (email, class_name, class_number, name, student_id, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [email, classname, classnumber, name, studentid, 'member']
    );

    return NextResponse.json({ message: 'ユーザーが登録されました。' }, { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'ユーザー登録中にエラーが発生しました。' }, { status: 500 });
  }
}
