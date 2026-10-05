'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/app/(auth)/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import MarkdownPreview from '@/app/(main)/term/components/MarkdownPreview'

export type AgreementSubmitData = {
  tosAgreed: boolean
  techTrainAgreed: boolean
}

export function JoinAgreementSection({
  tosAgreed,
  techTrainAgreed,
  onSubmit,
  onBack,
}: {
  tosAgreed: boolean
  techTrainAgreed: boolean
  /** 提供された場合、API 呼び出しの代わりにこのコールバックを呼ぶ */
  onSubmit?: (data: AgreementSubmitData) => Promise<void> | void
  /** 前のステップへ戻る場合に指定 */
  onBack?: () => void
}) {
  const router = useRouter()
  const [tosChecked, setTosChecked] = useState(tosAgreed)
  const [techTrainChecked, setTechTrainChecked] = useState(techTrainAgreed)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isWizardMode = Boolean(onSubmit)

  const [termContent, setTermContent] = useState<string | null>(null)
  const [termLoading, setTermLoading] = useState(true)
  const [termError, setTermError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchTerms = async () => {
      try {
        const res = await fetch('/api/term/export', { credentials: 'same-origin' })
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const j: { content: string | null } = await res.json()
        if (cancelled) return
        setTermContent(j.content ?? null)
      } catch (err) {
        if (cancelled) return
        console.error('会則データの取得に失敗しました:', err)
        setTermError('会則の取得に失敗しました')
      } finally {
        if (!cancelled) setTermLoading(false)
      }
    }
    fetchTerms()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async () => {
    if (!tosChecked) {
      setError('会則への同意は必須です。')
      return
    }

    setLoading(true)
    setError('')

    if (onSubmit) {
      try {
        await onSubmit({ tosAgreed: tosChecked, techTrainAgreed: techTrainChecked })
      } catch (err) {
        setError(err instanceof Error ? err.message : '同意の送信に失敗しました')
      } finally {
        setLoading(false)
      }
      return
    }

    const agreementTypes: ('terms_of_service' | 'tech_train')[] = []
    if (!tosAgreed && tosChecked) agreementTypes.push('terms_of_service')
    if (!techTrainAgreed && techTrainChecked) agreementTypes.push('tech_train')

    try {
      if (agreementTypes.length > 0) {
        const res = await fetch('/api/agreement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agreement_types: agreementTypes }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json.detail ?? '同意の送信に失敗しました。もう一度お試しください。')
          return
        }
      }
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={loading}
          className="-ml-2"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          戻る
        </Button>
      )}
      <div>
        <h2 className="text-lg font-semibold">会則・情報共有への同意</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          活動に参加するには、会則への同意が必要です。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">さざなみ開発会則</CardTitle>
          <CardDescription>さざなみ開発の会則です</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[36rem] flex-col rounded-md border bg-muted/30">
            {termLoading ? (
              <div className="p-5 text-sm text-muted-foreground">読み込み中…</div>
            ) : termError ? (
              <div className="p-5 text-sm text-destructive">{termError}</div>
            ) : (
              <MarkdownPreview
                text={termContent ?? '会則を取得できませんでした。'}
                className="p-5 text-sm leading-relaxed text-muted-foreground
                  [&_h1]:mt-4 [&_h1]:mb-3 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-foreground
                  [&_h2]:mt-4 [&_h2]:mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-foreground
                  [&_h3]:mt-4 [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground
                  [&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:font-semibold [&_h4]:text-foreground
                  [&_p]:mb-3
                  [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6
                  [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6
                  [&_li]:my-1
                  [&_li>p]:m-0 [&_li>p]:inline"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">TechTrain への情報共有</CardTitle>
          <CardDescription>学習支援サービスとの連携について（任意）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            さざなみ開発では、メンバーの技術力向上を支援するため、学習プラットフォーム
            <a href="https://techtrain.dev" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4"> TechTrain </a>
            と提携しています。
          </p>
          <p>サービスを無償で利用させて頂くにあたり、以下の情報を TechTrain に共有します。</p>
          <div className="rounded-md border bg-muted/30 p-3">
            <ul className="list-inside list-disc space-y-1">
              <li><span className="font-medium text-foreground">学校名</span></li>
              <li><span className="font-medium text-foreground">氏名</span></li>
              <li><span className="font-medium text-foreground">メールアドレス</span></li>
            </ul>
          </div>
          <p>
            同意は任意ですが、同意いただけない場合は TechTrain を無償で利用することはできません。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">同意確認</CardTitle>
          <CardDescription>同意するものにチェックしてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              checked={tosChecked}
              onCheckedChange={(checked) => setTosChecked(checked === true)}
              disabled={loading || (!isWizardMode && tosAgreed)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed text-foreground">
              上記の会則を確認し、内容に同意します。（必須）
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              checked={techTrainChecked}
              onCheckedChange={(checked) => setTechTrainChecked(checked === true)}
              disabled={loading || (!isWizardMode && techTrainAgreed)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed text-foreground">
              TechTrain への情報共有に同意します。（任意）
            </span>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={loading || !tosChecked}
            size="lg"
            className="w-full"
          >
            {loading ? '送信中…' : '会則に同意する'}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
