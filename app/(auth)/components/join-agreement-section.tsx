'use client'

import { useState } from 'react'
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

export function JoinAgreementSection({
  tosAgreed,
  techTrainAgreed,
}: {
  tosAgreed: boolean
  techTrainAgreed: boolean
}) {
  const router = useRouter()
  const [tosChecked, setTosChecked] = useState(tosAgreed)
  const [techTrainChecked, setTechTrainChecked] = useState(techTrainAgreed)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!tosChecked) {
      setError('会則への同意は必須です。')
      return
    }

    const agreementTypes: ('terms_of_service' | 'tech_train')[] = []
    if (!tosAgreed && tosChecked) agreementTypes.push('terms_of_service')
    if (!techTrainAgreed && techTrainChecked) agreementTypes.push('tech_train')

    setLoading(true)
    setError('')

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
      <div>
        <h2 className="text-lg font-semibold">会則・情報共有への同意</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          活動に参加するには、会則への同意が必要です。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">さざなみ開発会則</CardTitle>
          <CardDescription>本会の運営に関する基本的な規約です</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[36rem] overflow-y-auto rounded-md border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">

            <h3 className="mb-3 text-sm font-bold text-foreground">第1章　総則</h3>
            <h4 className="mb-1 font-semibold text-foreground">第1条（名称）</h4>
            <p className="mb-3">本会は「さざなみ開発」（以下「本会」という）と称する。</p>
            <h4 className="mb-1 font-semibold text-foreground">第2条（目的）</h4>
            <p className="mb-3">本会は、メンバー相互の技術力向上、情報交換、作品制作を通じて、IT技術の探求と共有を目的とする。</p>
            <h4 className="mb-1 font-semibold text-foreground">第3条（活動内容）</h4>
            <p className="mb-1">本会は前条の目的を達成するため、以下の活動を行う。</p>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>勉強会やハンズオンの開催</li>
              <li>アプリ・Webサービス等の開発</li>
              <li>コンテストやハッカソンへの参加</li>
              <li>学園祭やオープンキャンパスでの展示</li>
              <li>その他、会の目的に資する活動</li>
            </ol>

            <h3 className="mb-3 mt-4 text-sm font-bold text-foreground">第2章　会員</h3>
            <h4 className="mb-1 font-semibold text-foreground">第4条（構成）</h4>
            <p className="mb-3">本会の会員は、会の趣旨に賛同し、入会を希望した学生によって構成される。</p>
            <h4 className="mb-1 font-semibold text-foreground">第5条（入退会）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>入会を希望する者は、代表に申し出ることで入会できる。</li>
              <li>退会を希望する者は、代表に申し出ることで退会できる。</li>
              <li>著しく会の秩序を乱す行為があった場合、幹部会議により除名処分とすることがある。</li>
            </ol>

            <h3 className="mb-3 mt-4 text-sm font-bold text-foreground">第3章　運営</h3>
            <h4 className="mb-1 font-semibold text-foreground">第6条（運営構成）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>運営は幹部と開発班によって構成される。</li>
              <li>幹部はサークルの円滑な活動を維持し、方針決定・企画立案・各種管理を行う。</li>
              <li>開発班は、インフラ・基盤システムの開発・保守、デザイン業務を行う。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第7条（幹部構成）</h4>
            <p className="mb-1">本会に以下の幹部を置く。</p>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>代表</li>
              <li>副代表</li>
              <li>会計</li>
              <li>その他、必要に応じて役職を設置できる。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第8条（幹部の役割）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>代表は会を統括し、対外的な責任を持つ。</li>
              <li>副代表は代表を補佐し、代表不在時にその職務を代行する。</li>
              <li>会計は会の会計管理を行う。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第9条（幹部の条件）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>次年度卒業でないこと。</li>
              <li>所属期間が十分であること。</li>
              <li>サークル活動への参加意欲が高く、責任を持って職務を遂行できること。</li>
              <li>他のメンバーとの円滑なコミュニケーションが取れること。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第10条（幹部の任命）</h4>
            <p className="mb-3">年度末に幹部全員で選任を行い、本人の承諾によって新幹部を任命する。</p>
            <h4 className="mb-1 font-semibold text-foreground">第11条（開発班構成）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>リーダー</li>
              <li>メンバー</li>
              <li>その他、必要に応じて役職を設置できる。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第12条（開発班の役割）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>リーダーは開発班全体を統括し、開発計画の策定、進捗管理、品質管理を行う。また、幹部との連携窓口となり、活動内容を定期的に報告する。</li>
              <li>メンバーは開発計画に沿って担当業務を遂行し、開発・デザイン・保守に必要な作業を分担して行う。また、必要に応じて技術的改善提案を行う。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第13条（開発班の条件）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>基本的な開発スキルまたはデザインスキルを有すること。</li>
              <li>定期的なミーティングや作業に参加できること。</li>
              <li>チーム開発に必要なコミュニケーションを行えること。</li>
              <li>サークルの開発活動に継続的に貢献できること。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第14条（開発班の任命）</h4>
            <p className="mb-3">必要に応じて選任を行い、運営メンバーからの推薦かつ運営全員の賛成、本人の承諾によって開発班を任命する。</p>

            <h3 className="mb-3 mt-4 text-sm font-bold text-foreground">第4章　会議</h3>
            <h4 className="mb-1 font-semibold text-foreground">第15条（定例会）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>本会は月に1回以上、定例会を開催する。必要に応じて臨時会議を招集できる。</li>
              <li>メンバーは原則として、月に1回以上定例会に参加しなければならない。</li>
              <li>定例会では個人または、チームでの1ヶ月間の活動を報告する。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第16条（意思決定）</h4>
            <p className="mb-3">会の重要事項は、出席者の過半数の賛成により決定する。</p>

            <h3 className="mb-3 mt-4 text-sm font-bold text-foreground">第5章　会計</h3>
            <h4 className="mb-1 font-semibold text-foreground">第17条（会費）</h4>
            <p className="mb-3">活動に必要な経費は、原則として会費または助成金、外部支援によって賄う。会費の金額および徴収方法は別途定める。</p>
            <h4 className="mb-1 font-semibold text-foreground">第18条（会計報告）</h4>
            <p className="mb-3">会計は、学期末または年度末に活動費の収支を報告する。</p>

            <h3 className="mb-3 mt-4 text-sm font-bold text-foreground">第6章　附則</h3>
            <h4 className="mb-1 font-semibold text-foreground">第19条（規約の改正）</h4>
            <ol className="mb-3 list-inside list-decimal space-y-0.5 pl-2">
              <li>本会則の改正は、会員の3分の2以上の同意をもって行う。</li>
              <li>会則改正の同意は回答期限を1週間とし、期限内に回答がない場合は棄権とみなす。</li>
            </ol>
            <h4 className="mb-1 font-semibold text-foreground">第20条（会則の施行）</h4>
            <ol className="list-inside list-decimal space-y-0.5 pl-2">
              <li>この会則は、制定日より施行する。</li>
              <li>会則を改正した場合、改正後の条文は運営会議が定める日より施行する。</li>
            </ol>

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
              disabled={loading || tosAgreed}
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
              disabled={loading || techTrainAgreed}
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
