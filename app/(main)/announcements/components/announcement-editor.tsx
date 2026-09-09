'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '@/lib/announcements/format'
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  isScheduled,
  type Announcement,
  type AnnouncementCategory,
} from '@/lib/announcements/types'

import { AnnouncementMarkdown } from './announcement-markdown'

type PublishMode = 'now' | 'scheduled'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_title: 'タイトルを 255 文字以内で入力してください',
  invalid_content: '本文を入力してください',
  invalid_category: 'カテゴリの指定が不正です',
  invalid_status: 'ステータスの指定が不正です',
  invalid_publish_at: '公開日時の指定が不正です',
  forbidden: 'この操作を行う権限がありません',
}

function errorMessageOf(code: string | undefined): string {
  return (code && ERROR_MESSAGES[code]) || '保存に失敗しました。時間をおいて再度お試しください'
}

/**
 * 予約投稿の既定値は現在時刻。
 * 下書きの publishAt は作成時刻（＝過去）なので、そのまま出すと
 * 予約投稿を選んだ瞬間に古い日時が入ってしまう。
 */
function defaultScheduledLocal(): string {
  return toDateTimeLocalValue(new Date().toISOString())
}

/**
 * 過去日時かどうか。datetime-local は分までしか持たないので、
 * 現在時刻も分に切り捨てて比べる。秒単位で比べると、初期値の
 * 「現在時刻」がその場で過去扱いになってしまう。
 */
function isPastLocalValue(value: string): boolean {
  const iso = fromDateTimeLocalValue(value)
  if (!iso) return true
  return new Date(iso).getTime() < currentMinuteTime()
}

/**
 * 指定時刻が未来の分かどうか。現在の分ちょうどは「未来ではない」＝
 * 実質その場で公開されるので、即時公開と同じ扱いにする。
 */
function isFutureLocalValue(value: string): boolean {
  const iso = fromDateTimeLocalValue(value)
  if (!iso) return false
  return new Date(iso).getTime() > currentMinuteTime()
}

function currentMinuteTime(): number {
  const date = new Date()
  date.setSeconds(0, 0)
  return date.getTime()
}

export function AnnouncementEditor({
  open,
  announcement,
  onClose,
  onSaved,
}: {
  open: boolean
  /** 未指定なら新規作成 */
  announcement?: Announcement | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!announcement
  // 予約投稿（公開予定だが未到達）は、公開日時を後から変更できる
  const isScheduledPost = !!announcement && isScheduled(announcement)
  const isDraft = announcement?.status === 'draft'
  const isArchived = announcement?.status === 'archived'
  /** 公開日時をこの画面で決められるか（新規・下書き・予約投稿） */
  const canChooseSchedule = !isEdit || isDraft || isScheduledPost

  const [step, setStep] = useState<1 | 2>(1)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [category, setCategory] = useState<AnnouncementCategory>('info')
  const [isImportant, setIsImportant] = useState(false)
  const [publishMode, setPublishMode] = useState<PublishMode>('now')
  const [publishAtLocal, setPublishAtLocal] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // モーダルを開くたびに対象のお知らせで初期化する
  useEffect(() => {
    if (!open) return
    setStep(1)
    setShowPreview(false)
    setConfirming(false)
    setError(null)
    setTitle(announcement?.title ?? '')
    setContent(announcement?.content ?? '')
    setCategory(announcement?.category ?? 'info')
    setIsImportant(announcement?.isImportant ?? false)
    const scheduled = announcement ? isScheduled(announcement) : false
    setPublishMode(scheduled ? 'scheduled' : 'now')
    setPublishAtLocal(
      announcement ? toDateTimeLocalValue(announcement.publishAt) : ''
    )
  }, [open, announcement])

  const canProceed = useMemo(
    () => title.trim().length > 0 && content.trim().length > 0,
    [title, content]
  )

  async function submit(payload: Record<string, unknown>) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        isEdit ? `/api/announcements/${announcement!.id}` : '/api/announcements',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(errorMessageOf(body?.error))
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('通信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  /** 公開日時の入力値を API に渡す形にする。即時公開なら現在時刻 */
  function resolvePublishAt(): string | null | 'invalid' {
    if (!canChooseSchedule) return null
    if (publishMode === 'now') return new Date().toISOString()
    const iso = fromDateTimeLocalValue(publishAtLocal)
    return iso ?? 'invalid'
  }

  function saveDraft() {
    void submit({ title, content, category, isImportant, status: 'draft' })
  }

  function publish() {
    if (!canChooseSchedule) {
      // 公開済み・アーカイブ済みの編集では、ステータスと公開日時は変更しない
      void submit({ title, content, category, isImportant })
      return
    }

    const publishAt = resolvePublishAt()
    if (publishAt === 'invalid') {
      setError('公開日時を指定してください')
      return
    }
    // 過去日時での予約は受け付けない（即時公開したいなら「即時公開」を選ぶ）
    if (publishMode === 'scheduled' && isPastLocalValue(publishAtLocal)) {
      setError('公開日時には未来の日時を指定してください')
      return
    }
    void submit({
      title,
      content,
      category,
      isImportant,
      status: 'published',
      ...(publishAt ? { publishAt } : {}),
    })
  }

  function handlePublishClick() {
    // 即時公開は取り消せないため確認を挟む。
    // 予約投稿でも、指定時刻が現在の分なら実質その場で公開されるので確認する。
    if (canChooseSchedule && publishMode === 'scheduled' && isFutureLocalValue(publishAtLocal)) {
      publish()
      return
    }
    setConfirming(true)
  }

  function toggleArchive() {
    void submit({ status: isArchived ? 'published' : 'archived' })
  }

  const heading = isEdit
    ? isDraft
      ? '下書きを編集'
      : 'お知らせを編集'
    : 'お知らせを作成'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {heading}（{step}/2）
          </DialogTitle>
        </DialogHeader>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="announcement-title">
                タイトル
              </label>
              <Input
                id="announcement-title"
                value={title}
                maxLength={255}
                placeholder="タイトルを入力"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="announcement-content">
                  本文（Markdown）
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? 'プレビューを閉じる' : 'プレビュー'}
                </Button>
              </div>
              <div className={showPreview ? 'grid gap-3 md:grid-cols-2' : ''}>
                <textarea
                  id="announcement-content"
                  rows={12}
                  value={content}
                  placeholder="お知らせの内容を入力してください..."
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  onChange={(e) => setContent(e.target.value)}
                />
                {showPreview && (
                  <div className="max-h-[18rem] overflow-y-auto rounded-lg border bg-muted/30 p-3">
                    {content.trim() ? (
                      <AnnouncementMarkdown content={content} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        プレビューする内容がありません
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              {/* 公開済みのお知らせは下書きに戻せない */}
              {canChooseSchedule ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canProceed || submitting}
                  onClick={saveDraft}
                >
                  {isScheduledPost ? '下書きにする' : '下書きを保存'}
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" disabled={!canProceed} onClick={() => setStep(2)}>
                次へ
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && !confirming && (
          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">全般</h3>

              {canChooseSchedule && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">公開タイミング</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="publish-mode"
                      checked={publishMode === 'now'}
                      onChange={() => setPublishMode('now')}
                    />
                    即時公開
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="publish-mode"
                      checked={publishMode === 'scheduled'}
                      onChange={() => {
                        setPublishMode('scheduled')
                        // 過去日時（下書きの作成時刻など）が残っていたら入れ直す
                        if (isPastLocalValue(publishAtLocal)) {
                          setPublishAtLocal(defaultScheduledLocal())
                        }
                      }}
                    />
                    予約投稿
                  </label>
                  {publishMode === 'scheduled' && (
                    <Input
                      type="datetime-local"
                      className="max-w-xs"
                      // ピッカー上でも過去を選べないようにする
                      min={defaultScheduledLocal()}
                      value={publishAtLocal}
                      onChange={(e) => setPublishAtLocal(e.target.value)}
                    />
                  )}
                </div>
              )}

              <div className="max-w-xs space-y-1">
                <p className="text-sm font-medium">カテゴリ</p>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as AnnouncementCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_CATEGORIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ANNOUNCEMENT_CATEGORY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isImportant}
                  onCheckedChange={(checked) => setIsImportant(checked === true)}
                />
                「重要」タグをつける
              </label>

              {isEdit && !isDraft && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant={isArchived ? 'outline' : 'destructive'}
                    disabled={submitting}
                    onClick={toggleArchive}
                  >
                    {isArchived ? 'アーカイブを解除' : 'アーカイブする'}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    アーカイブすると一般ユーザーの画面から見えなくなります
                  </p>
                </div>
              )}
            </section>

            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                戻る
              </Button>
              <Button type="button" disabled={!canProceed || submitting} onClick={handlePublishClick}>
                {isEdit && !isDraft ? '更新' : '投稿'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && confirming && (
          <div className="space-y-4">
            <p className="text-sm">
              {canChooseSchedule ? (
                <>
                  このお知らせを<span className="font-semibold">即時公開</span>します。よろしいですか？
                </>
              ) : (
                <>公開中のお知らせの内容を更新します。よろしいですか？</>
              )}
            </p>
            <p className="text-sm text-muted-foreground">「{title}」</p>
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setConfirming(false)}
              >
                戻る
              </Button>
              <Button type="button" disabled={submitting} onClick={publish}>
                {submitting ? '送信中...' : canChooseSchedule ? '公開する' : '更新する'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
