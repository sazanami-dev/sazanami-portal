"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock } from "lucide-react"
import { JoinPlatformActions } from "./join-platform-actions"

// 状態の型定義
type ApprovalStatus = "pending" | "approved"

export default function JoinApprovalSection({
  initialStatus = "pending",
}: {
  initialStatus?: ApprovalStatus
} = {}) {
  const [status, setStatus] = useState<ApprovalStatus>(initialStatus)

  return (
    // 画面全体の中央にカードを配置するレイアウト
    <div className="flex  items-center justify-center p-10">
      
      <Card className="w-full max-w-md text-center shadow-lg">
        {status === "pending" ? (
          /* =========================================
             承認待ち (Pending) の表示
          ========================================= */
          <>
            <CardHeader>
              <div className="mb-4 flex justify-center">
                {/* 待機中を表現する時計アイコン（少しゆっくり点滅させます） */}
                <Clock className="h-16 w-16 animate-pulse text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">承認待ちです</CardTitle>
              <CardDescription className="pt-2">
                現在、管理者によるアカウントの確認を行っています。<br />
                承認が完了するまでしばらくお待ちください。
              
            </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                承認が完了すると、すべての機能をご利用いただけるようになります。<br />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {/* 開発確認用の切り替えボタン（本番では削除してください） */}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setStatus("approved")}
              >
                （テスト）承認済みに切り替える
              </Button>
            </CardFooter>
          </>
        ) : (
          /* =========================================
             承認済み (Approved) の表示
          ========================================= */
          <>
            <CardHeader>
              <div className="mb-4 flex justify-center">
                {/* 完了を表す緑色のチェックアイコン */}
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl">承認されました！</CardTitle>
              <CardDescription className="pt-2">
                アカウントの確認が完了しました。<br />
                すべての機能をご利用いただけます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground text-left space-y-2">
                <p>下の「連携」ボタンを押すと:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>GitHub Org の招待がメールに送信されます</li>
                  <li>Discord サーバー参加画面が新しいタブで開きます</li>
                </ul>
                <p>両方に参加したら「次へ」ボタンで参加を確認してください。</p>
              </div>
            </CardContent>
            <CardFooter>
              <JoinPlatformActions />
            </CardFooter>
          </>
        )}
      </Card>

    </div>
  )
}