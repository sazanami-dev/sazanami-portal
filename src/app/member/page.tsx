"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "../components/Header";

type Member = {
  name: string;
  email: string;
  class_name: string;
  class_number: string;
  student_id: string;
  role: string;
};

export default function MemberPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const { data: session, status } = useSession();
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
    async function fetchMembers() {
      try {
        const response = await fetch("/api/member");
        const data = await response.json();
        setMembers(data.members || []);
        setCurrentUserRole(data.role || "");
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    }

    if (session) {
      fetchMembers();
    }
  }, [session, status]);
  

  const handleRoleChange = async (email: string, newRole: string) => {
    if (email === session.user.email) {
      alert("自分のロールは変更できません。");
      return; // 処理を中断
    }
    const confirmChange = window.confirm(
      `ユーザー ${email} のロールを ${newRole} に変更しますか？`
    );
  
    if (!confirmChange) {
      return; // ユーザーがキャンセルした場合、処理を中断
    }
    try {
      const response = await fetch("/api/member/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role: newRole }),
      });

      if (!response.ok) {
        throw new Error("ロールの更新に失敗しました。");
      }
      // メンバーのロールを更新
      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.email === email ? { ...member, role: newRole } : member
        )
      );
      alert(`ユーザー ${email} のロールが ${newRole} に変更されました。`);
    } catch (error) {
      console.error("Error updating role:", error);
      alert("ロールの更新中にエラーが発生しました。");
    }
  };


  if (!session) {
    return <p>認証されていません。ログインしてください。</p>;
  }

  return (
    <div className="mt-20 flex flex-col items-center justify-center min-h-screen bg-gray-100 space-y-4">
      <title>所属メンバー</title>
      <Header />
      <h1 className="text-xl font-bold mb-4">所属メンバー</h1>
      {members.map((member, index) => (
        <div key={index} className="bg-white p-4 shadow-md rounded w-full">
          <p>名前: {member.name}</p>
          {member.email && <p>メール: {member.email}</p>}
          {member.class_name && <p>クラス名: {member.class_name}</p>}
          {member.class_number && <p>クラス番号: {member.class_number}</p>}
          {member.student_id && <p>学籍番号: {member.student_id}</p>}
          {member.role && <p>ロール: {member.role}</p>}
          {currentUserRole === "admin" && ( // 管理者の場合
            <select
              value={member.role || ""}
              onChange={(e) => handleRoleChange(member.email, e.target.value)}
              className="border border-gray-300 rounded px-2 py-1"
              disabled={member.email === session?.user?.email} // 自分のロール変更を無効化
            >
              <option value="member">メンバー</option>
              <option value="manager">運営</option>
              <option value="admin">管理者</option>
            </select>
          )}
          {currentUserRole === "manager" && member.role === "member" && ( // 運営の場合
            <select
              value={member.role || ""}
              onChange={(e) => handleRoleChange(member.email, e.target.value)}
              className="border border-gray-300 rounded px-2 py-1"
              disabled={member.email === session?.user?.email} // 自分のロール変更を無効化
            >
              <option value="member">メンバー</option>
              <option value="manager">運営</option>
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
