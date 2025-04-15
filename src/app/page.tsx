"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "../styles/page.module.css";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      const checkUser = async () => {
        try {
          const response = await fetch("/api/auth/check-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: session.user.email }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const result = await response.json();

          if (result.registered) {
            router.push("/top");
          } else {
            router.push("/signup");
          }
        } catch (error) {
          console.error("ユーザー確認エラー:", error);
        }
      };

      checkUser();
    }
  }, [session, status, router]);

  return (
    <div className={styles.container}>
      <title>さざなみポータル</title>
      <h1 className={styles.title}>さざなみポータル</h1>
      <h3 className={styles.subtitle}>組織内のGoogleアカウントのみが認証可能です</h3>
      <button
        onClick={() => signIn("google")}
        className={styles.button}
      >
        Googleで続ける
      </button>
    </div>
  );
}
