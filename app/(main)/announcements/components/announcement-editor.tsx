'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  formatAnnouncementDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '@/lib/announcements/format'
import {
  CONTENT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '@/lib/announcements/validation'
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  DISCORD_NOTIFICATION_STATUS_LABELS,
  isScheduled,
  type AnnouncementCategory,
  type AnnouncementDiscord,
  type AnnouncementListItem,
} from '@/lib/announcements/types'
import { buildAnnouncementMessage } from '@/lib/discord/announcement-message'

import { AnnouncementMarkdown } from './announcement-markdown'

type PublishMode = 'now' | 'scheduled'

type AnnounceChannel = { key: string; id: string; name: string }

type ChannelsResponse = {
  channels: AnnounceChannel[]
  defaultByCategory: Record<AnnouncementCategory, string | null>
  guildId: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_title: 'タイトルを入力してください',
  title_too_long: `タイトルは ${TITLE_MAX_LENGTH} 文字以内で入力してください`,
  invalid_content: '本文を入力してください',
  content_too_long: `本文は ${CONTENT_MAX_LENGTH.toLocaleString()} 文字以内で入力してください`,
  invalid_category: 'カテゴリの指定が不正です',
  invalid_status: 'ステータスの指定が不正です',
  invalid_publish_at: '公開日時の指定が不正です',
  invalid_discord_channel: '通知先チャンネルの指定が不正です',
  discord_channel_locked: '送信済みのお知らせは通知先チャンネルを変更できません',
  sending_in_progress: '送信処理中です。しばらくしてから再度お試しください',
  not_resendable: 'このお知らせは再送信の対象ではありません',
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
  announcement?: AnnouncementListItem | null
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

  // Discord 関連
  const [channels, setChannels] = useState<ChannelsResponse | null>(null)
  const [discordEnabled, setDiscordEnabled] = useState(true)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [mentionEveryone, setMentionEveryone] = useState(false)
  /** 手動でチャンネルを変えたら、以降はカテゴリ変更で上書きしない */
  const [channelTouched, setChannelTouched] = useState(false)
  const [showDiscordPreview, setShowDiscordPreview] = useState(false)
  const [discord, setDiscord] = useState<AnnouncementDiscord | null>(null)
  const [resending, setResending] = useState(false)

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

    setShowDiscordPreview(false)
    setResending(false)
    setDiscord(announcement?.discord ?? null)
    if (announcement) {
      // 保存済みの設定を尊重し、カテゴリ変更で上書きしない
      setDiscordEnabled(announcement.discord?.channelId != null)
      setChannelId(announcement.discord?.channelId ?? null)
      setMentionEveryone(announcement.discord?.mentionEveryone ?? false)
      setChannelTouched(true)
    } else {
      setDiscordEnabled(true)
      setChannelId(null)
      setMentionEveryone(false)
      setChannelTouched(false)
    }
  }, [open, announcement])

  // 選択肢は開くたびに取り直す（環境変数の変更が即反映される）
  useEffect(() => {
    if (!open) return
    let aborted = false
    void (async () => {
      try {
        const res = await fetch('/api/announcements/discord/channels')
        if (!res.ok) return
        const data = (await res.json()) as ChannelsResponse
        if (!aborted) setChannels(data)
      } catch {
        // 取得できなければ Discord セクションを無効表示にするだけでよい
      }
    })()
    return () => {
      aborted = true
    }
  }, [open])

  // カテゴリに応じて通知先を切り替える（手動変更後は追従しない）
  useEffect(() => {
    if (!open || !channels || channelTouched) return
    setChannelId(channels.defaultByCategory[category] ?? null)
  }, [open, channels, channelTouched, category])

  const canProceed = useMemo(
    () => title.trim().length > 0 && content.trim().length > 0,
    [title, content]
  )

  const hasChannels = (channels?.channels.length ?? 0) > 0
  /** 送信済みのメッセージは別チャンネルへ移動できないため、変更させない */
  const channelLocked = Boolean(discord?.messageId)

  const channelNameOf = useCallback(
    (id: string | null) => channels?.channels.find((c) => c.id === id)?.name ?? id ?? '',
    [channels]
  )

  const discordMessageUrl =
    channels?.guildId && discord?.channelId && discord?.messageId
      ? `https://discord.com/channels/${channels.guildId}/${discord.channelId}/${discord.messageId}`
      : null

  // 送信処理と同じ関数で組み立てるので、実際に届く文面と一致する
  const discordPreview = useMemo(
    () =>
      buildAnnouncementMessage({
        title: title.trim() || '（タイトル未入力）',
        content,
        category,
        isImportant,
        publishAt:
          publishMode === 'scheduled'
            ? (fromDateTimeLocalValue(publishAtLocal) ?? new Date().toISOString())
            : (announcement?.publishAt ?? new Date().toISOString()),
        mentionEveryone: discordEnabled && mentionEveryone,
        portalUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      }),
    [
      title,
      content,
      category,
      isImportant,
      publishMode,
      publishAtLocal,
      announcement,
      discordEnabled,
      mentionEveryone,
    ]
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

  /**
   * 画面1 の入力チェック。超過したまま次の画面に進めないようにする。
   * 文言は API から返るエラーと揃える。
   */
  function stepOneError(): string | null {
    if (title.trim().length > TITLE_MAX_LENGTH) return ERROR_MESSAGES.title_too_long
    if (content.trim().length > CONTENT_MAX_LENGTH) return ERROR_MESSAGES.content_too_long
    return null
  }

  function goToSettings() {
    const message = stepOneError()
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setStep(2)
  }

  /** 公開日時の入力値を API に渡す形にする。即時公開なら現在時刻 */
  function resolvePublishAt(): string | null | 'invalid' {
    if (!canChooseSchedule) return null
    if (publishMode === 'now') return new Date().toISOString()
    const iso = fromDateTimeLocalValue(publishAtLocal)
    return iso ?? 'invalid'
  }

  /** Discord 設定。下書きでも保存しておき、公開時にそのまま使う */
  function discordPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      discordMentionEveryone: discordEnabled && mentionEveryone,
    }
    // 送信済みのチャンネルは変更できないため、そもそも送らない
    if (!discord?.messageId) {
      payload.discordChannelId = discordEnabled ? channelId : null
    }
    return payload
  }

  function saveDraft() {
    const message = stepOneError()
    if (message) {
      setError(message)
      return
    }
    void submit({
      title,
      content,
      category,
      isImportant,
      status: 'draft',
      ...discordPayload(),
    })
  }

  function publish() {
    if (!canChooseSchedule) {
      // 公開済み・アーカイブ済みの編集では、ステータスと公開日時は変更しない
      void submit({ title, content, category, isImportant, ...discordPayload() })
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
      ...discordPayload(),
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

  async function resend() {
    if (!announcement) return
    setResending(true)
    setError(null)
    try {
      const res = await fetch(`/api/announcements/${announcement.id}/discord/resend`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(errorMessageOf(body?.error))
        return
      }
      setDiscord(body.discord as AnnouncementDiscord)
      if ((body.discord as AnnouncementDiscord).status === 'failed') {
        setError('再送信しましたが、まだ失敗しています')
      }
      onSaved()
    } catch {
      setError('通信に失敗しました')
    } finally {
      setResending(false)
    }
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
          <DialogDescription>
            {step === 1
              ? 'タイトルと本文を入力します。本文には Markdown が使えます。'
              : '公開タイミングやカテゴリなどを設定します。'}
          </DialogDescription>
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
              {/* 上限は API 側で検証し、超えたらエラーを出す（入力は切り詰めない） */}
              <Input
                id="announcement-title"
                value={title}
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
              <Button type="button" disabled={!canProceed} onClick={goToSettings}>
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
                    アーカイブすると一般ユーザーの画面から見えなくなります（Discord
                    の投稿は削除されません）
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Discord</h3>

              {!hasChannels ? (
                <p className="text-sm text-muted-foreground">
                  Discord 連携が未設定です
                </p>
              ) : (
                <>
                  {isEdit && discord && discord.status !== 'not_sent' && (
                    <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2">
                      <p className="text-sm font-medium">
                        {discord.status === 'sent' && '✅ '}
                        {discord.status === 'failed' && '⚠️ '}
                        {discord.status === 'pending' && '🕐 '}
                        {DISCORD_NOTIFICATION_STATUS_LABELS[discord.status]}
                        {discord.channelId && `（${channelNameOf(discord.channelId)}）`}
                      </p>
                      {discord.status === 'pending' && (
                        <p className="text-xs text-muted-foreground">
                          公開時刻に到達したら送信されます
                        </p>
                      )}
                      {discord.notifiedAt && (
                        <p className="text-xs text-muted-foreground">
                          最終送信: {formatAnnouncementDateTime(discord.notifiedAt)}
                        </p>
                      )}
                      {discordMessageUrl && (
                        <a
                          href={discordMessageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs underline underline-offset-2"
                        >
                          Discord で開く
                        </a>
                      )}
                      {discord.error && (
                        <details className="text-xs text-destructive">
                          <summary className="cursor-pointer">エラー内容</summary>
                          <p className="mt-1 break-all">{discord.error}</p>
                        </details>
                      )}
                      {discord.status === 'failed' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-1"
                          disabled={resending || submitting}
                          onClick={() => void resend()}
                        >
                          {resending ? '再送信中...' : '再送信'}
                        </Button>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={discordEnabled}
                      disabled={channelLocked}
                      onCheckedChange={(checked) => setDiscordEnabled(checked === true)}
                    />
                    Discord に通知する
                  </label>

                  <div
                    className={
                      discordEnabled
                        ? 'space-y-3'
                        : 'pointer-events-none space-y-3 opacity-50'
                    }
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={mentionEveryone}
                        disabled={!discordEnabled}
                        onCheckedChange={(checked) => setMentionEveryone(checked === true)}
                      />
                      @everyone を付ける
                    </label>
                    {channelLocked && (
                      <p className="-mt-2 text-xs text-muted-foreground">
                        送信済みのため、変更しても再通知はされません
                      </p>
                    )}

                    <div className="max-w-xs space-y-1">
                      <p className="text-sm font-medium">通知先チャンネル</p>
                      <Select
                        value={channelId ?? ''}
                        disabled={!discordEnabled || channelLocked}
                        onValueChange={(value) => {
                          setChannelId(value)
                          // 以降はカテゴリを変えても上書きしない
                          setChannelTouched(true)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="チャンネルを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels?.channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              {channel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {channelLocked
                          ? '送信済みのため変更できません'
                          : 'カテゴリに合わせて自動で選ばれます（変更可）'}
                      </p>
                    </div>

                    {discordPreview.hasTable && (
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        テーブルは Discord では崩れて表示されます
                      </p>
                    )}
                    {discordPreview.truncated && (
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        本文が長いため、Discord では途中まで表示されます
                      </p>
                    )}

                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDiscordPreview((v) => !v)}
                      >
                        {showDiscordPreview
                          ? 'Discord プレビューを閉じる'
                          : 'Discord プレビュー'}
                      </Button>
                      {showDiscordPreview && (
                        <pre className="mt-1 max-h-60 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                          {discordPreview.content}
                        </pre>
                      )}
                    </div>
                  </div>
                </>
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
            <p className="text-sm">
              {/* 送信済みなら投稿を編集、未送信なら新規投稿になる */}
              {discord?.messageId ? (
                <>
                  Discord の投稿（{channelNameOf(discord.channelId)}）も同じ内容に
                  <span className="font-semibold">更新されます</span>。
                </>
              ) : discordEnabled && channelId ? (
                <>
                  <span className="font-semibold">{channelNameOf(channelId)}</span> へ
                  {mentionEveryone ? '@everyone 付きで' : ''}投稿します。
                </>
              ) : (
                <>Discord には投稿されません。</>
              )}
            </p>
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
