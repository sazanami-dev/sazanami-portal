"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";

type Announcement = {
  announcement_id: number;
  creator_email: string;
  created_at: string;
  title: string;
  content: string;
};

const Top: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcement");
        if (!res.ok) throw new Error("お知らせの取得に失敗しました");
        const data = await res.json();
        setAnnouncements(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchAnnouncements();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mt-20 flex flex-col items-center justify-center min-h-screen bg-gray-100 space-y-4">
      <title>さざなみポータル</title>
      <Header />
      <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">最新のお知らせ</h1>
        {announcements.length === 0 ? (
          <p className="text-center text-gray-500">お知らせはまだありません。</p>
        ) : (
          <div className="space-y-6">
            {announcements.map((a) => (
              <div
                key={a.announcement_id}
                className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition duration-300"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{a.title}</h2>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{a.content}</p>
                <div className="text-sm text-gray-500 text-right">
                  {new Date(a.created_at).toLocaleString()} | {a.creator_email}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Top;