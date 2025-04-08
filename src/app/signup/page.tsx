'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [email, setEmail] = useState("");
  const [classname, setClassname] = useState("");
  const [classnumber, setClassnumber] = useState("");
  const [name, setName] = useState("");
  const [studentid, setStudentid] = useState("");
  const { data: session } = useSession();
  const router = useRouter();
  
  // アカウントから情報を取得
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
      setStudentid(session.user.email.substring(2, 8)); // 学籍番号取得
    }
    if (session?.user?.name) {
      if (/\d/.test(session.user.name)) {
        setClassname(session.user.name.substring(0, 3));
        setClassnumber(session.user.name.substring(4, 6));
        setName(session.user.name.substring(6));
      } else {
        setName(session.user.name);
      }
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, classname, classnumber, name, studentid }),
    });

    const result = await response.json();
    if (response.ok) {
      alert("登録が完了しました！");
      router.push("/top");
    } else {
      alert(result.error || "エラーが発生しました");
    }
  };

  if (!session) {
    return <p>認証されていません。ログインしてください。</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 shadow-md w-full max-w-md rounded-xl">
        <div className="flex justify-center mb-6">
          <img src="/sazanami_dev.svg" alt="Logo" className="h-16" />
        </div>
        <title>サインアップ</title>
        <h1 className="text-2xl font-bold mb-4 text-center">サインアップ</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">クラス名</label>
            <input
              type="text"
              value={classname}
              onChange={(e) => setClassname(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">出席番号</label>
            <input
              type="text"
              value={classnumber}
              onChange={(e) => setClassnumber(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">学籍番号</label>
            <input
              type="text"
              value={studentid}
              onChange={(e) => setStudentid(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none"
            />
          </div>

          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-md bg-gradient-to-l from-[#29323c] to-[#485563] px-10 font-medium text-neutral-50 shadow-lg shadow-neutral-500/20 transition active:scale-95"
            >
              登録
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
