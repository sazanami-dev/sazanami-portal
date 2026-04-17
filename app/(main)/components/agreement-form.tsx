"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/app/(auth)/components/ui/checkbox"
import { Button } from "@/app/(auth)/components/ui/button"

type AgreementType = "terms_of_service" | "tech_train"

export function AgreementForm({
  agreementType,
  alreadyAgreed,
  label,
  succeededMessage,
  optional,
  declinedMessage,
}: {
  agreementType: AgreementType
  alreadyAgreed?: boolean
  label: string
  succeededMessage: string
  optional?: boolean
  declinedMessage?: string
}) {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [error, setError] = useState("")

  if (alreadyAgreed) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {succeededMessage}
        </p>
      </div>
    )
  }

  if (declined) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-muted-foreground">
          {declinedMessage ?? "同意しませんでした。"}
        </p>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!agreed) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreement_type: agreementType }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(json.detail ?? "同意の送信に失敗しました。もう一度お試しください。")
        return
      }

      router.refresh()
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。")
    } finally {
      setLoading(false)
    }
  }

  if (optional) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            size="lg"
            className="flex-1"
          >
            {loading ? "送信中…" : "同意する"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeclined(true)}
            disabled={loading}
            size="lg"
            className="flex-1"
          >
            同意しない
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <Checkbox
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-0.5"
          disabled={loading}
        />
        <span className="text-sm leading-relaxed text-foreground">
          {label}
        </span>
      </label>

      <Button
        onClick={handleSubmit}
        disabled={!agreed || loading}
        size="lg"
        className="w-full"
      >
        {loading ? "送信中…" : "同意して送信"}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
