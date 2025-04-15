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
      router.push('/');
    }

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
          creator_email: session.user.email,
          title: newTitle,
          content: newContent,
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

  const handleDeleteAnnouncement = async (announcement_id: number) => {
    const confirmDelete = confirm('本当に削除しますか？');
    if (!confirmDelete) return;

    try {
      const response = await fetch('/api/announcement', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement_id }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`削除に失敗しました: ${error.error}`);
        return;
      }

      setAnnouncements(prev => prev.filter(a => a.announcement_id !== announcement_id));
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  return (
    <div className="pt-20 px-4">
      <h1 className="text-xl font-bold mb-4">お知らせ</h1>
      <Header />

      {status === 'authenticated' && (
        <div className="mb-6">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="タイトル"
            className="border mb-2 w-full p-2"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="内容"
            className="border mb-2 w-full p-2"
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
              {new Date(announcement.created_at).toLocaleString()}
            </p>
            <p>{announcement.content}</p>
            {session?.user?.email === announcement.creator_email && (
              <button
                onClick={() => handleDeleteAnnouncement(announcement.announcement_id)}
                className="mt-2 bg-red-500 text-white px-3 py-1 rounded"
              >
                削除
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
