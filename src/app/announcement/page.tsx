'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from "../components/Header";

type Announcement = {
  announcement_id: number;
  creator_email: string;
  created_at: string;
  title: string;
  content: string;
};

export default function AnnouncementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');  // 未認証の場合はログイン画面にリダイレクト
    }

    // 認証されたユーザーのみ、お知らせを取得する
    const fetchAnnouncements = async () => {
      if (status === 'authenticated' && session?.user?.email) {
        try {
          const response = await fetch('/api/announcement');
          if (!response.ok) {
            alert('お知らせの取得に失敗しました');
            return;
          }
          const data = await response.json();
          setAnnouncements(data);
        } catch (error) {
          console.error('Error fetching announcements:', error);
        }
      }
    };

    fetchAnnouncements();
  }, [status, session, router]);

  const handleCreateAnnouncement = async () => {
    if (!newTitle || !newContent) {
      alert('タイトルと内容を入力してください');
      return;
    }

    if (!session?.user?.email) {
      alert('認証情報がありません');
      return;
    }

    try {
      const response = await fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_email: session.user.email,  // セッションからメールアドレスを取得
          title: newTitle,
          content: newContent
        }),
      });

      if (!response.ok) {
        alert('お知らせの作成に失敗しました');
        return;
      }

      const newAnnouncement = await response.json();
      setAnnouncements([...announcements, newAnnouncement]);
      setNewTitle('');
      setNewContent('');
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  return (
    <div className="pt-20 px-4">
      <h1 className="text-xl font-bold mb-4">お知らせ</h1>
      <Header />

      {status === 'authenticated' && (
        <div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="タイトル"
            className="border mb-2"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="内容"
            className="border mb-2"
          />
          <button
            onClick={handleCreateAnnouncement}
            className="bg-blue-500 text-white p-2 rounded"
          >
            お知らせを作成
          </button>
        </div>
      )}

      <ul>
        {announcements.map((announcement) => (
          <li key={announcement.announcement_id} className="mb-4 p-4 border shadow-sm rounded">
            <h2 className="text-lg font-semibold">{announcement.title}</h2>
            <p className="text-sm text-gray-600">
              {new Date(announcement.created_at).toLocaleString()}  {/* タイムスタンプをフォーマット */}
            </p>
            <p>{announcement.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}