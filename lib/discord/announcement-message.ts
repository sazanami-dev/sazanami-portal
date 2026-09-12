/**
 * お知らせを Discord のメッセージ本文に整形する。
 *
 * 送信処理からも作成画面のプレビューからも同じ結果を出したいので、
 * 環境依存の処理を持たない純粋関数として切り出している。
 */

import { formatAnnouncementDateTime } from '@/lib/announcements/format'
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from '@/lib/announcements/types'

/** Discord のメッセージ本文（content）の上限 */
export const DISCORD_CONTENT_MAX_LENGTH = 2000

/** 本文に割り当てる上限。残りはタイトル行とフッタに使う */
export const DISCORD_BODY_MAX_LENGTH = 1700

export type AnnouncementMessageInput = {
  title: string
  /** ポータル側の Markdown 本文 */
  content: string
  category: AnnouncementCategory
  isImportant: boolean
  /** 公開日時（ISO 文字列） */
  publishAt: string
  mentionEveryone: boolean
  /** ポータルの URL（NEXT_PUBLIC_SITE_URL）。未設定ならリンクを出さない */
  portalUrl?: string | null
}

export type AnnouncementMessage = {
  /** Discord に送る content */
  content: string
  /** 本文が長すぎて切り詰められたか */
  truncated: boolean
  /** Discord では崩れるテーブル記法を含むか */
  hasTable: boolean
}

/**
 * ポータル（GFM）と Discord の記法差を埋める。
 * 見出し・リスト・引用・コードブロック・太字はそのまま通す。
 */
export function toDiscordMarkdown(markdown: string): string {
  return (
    markdown
      // 画像は表示されないので URL だけ残す（Discord 側でプレビューになる）
      .replace(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g, '$1')
      // プレーンメッセージではリンク記法が効かないため展開する
      .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, '$1 ($2)')
      // Discord の見出しは ### までなので丸める
      .replace(/^(\s{0,3})#{4,6}(\s+)/gm, '$1###$2')
  )
}

/** テーブル記法（|---|---|の区切り行）を含むか */
export function hasMarkdownTable(markdown: string): boolean {
  return /^\s*\|?[\s:-]*\|[\s:|-]*$/m.test(markdown) && /\|.*\|/m.test(markdown)
}

function truncate(text: string, maxLength: number): { text: string; truncated: boolean } {
  if (text.length <= maxLength) return { text, truncated: false }
  // 末尾に付ける「…」も maxLength に含める
  const body = text.slice(0, Math.max(0, maxLength - 1)).trimEnd()
  return { text: `${body}…`, truncated: true }
}

/** Discord に送るメッセージを組み立てる */
export function buildAnnouncementMessage(
  input: AnnouncementMessageInput
): AnnouncementMessage {
  const heading = `## ${input.isImportant ? '🔴 ' : ''}【${input.title.trim()}】`
  const mention = input.mentionEveryone ? '@everyone\n' : ''

  const portalLink = input.portalUrl
    ? `${input.portalUrl.replace(/\/+$/, '')}/announcements`
    : null

  const meta = [
    ANNOUNCEMENT_CATEGORY_LABELS[input.category],
    formatAnnouncementDateTime(input.publishAt),
  ].filter(Boolean)

  const body = toDiscordMarkdown(input.content).trim()

  /** フッタは切り詰めの有無で文言が変わるため、両方の長さを見て余白を決める */
  const buildFooter = (isTruncated: boolean): string => {
    if (!portalLink) return `-# ${meta.join(' ・ ')}`
    const label = isTruncated ? '続きをポータルで読む' : 'ポータルで読む'
    return `-# ${[...meta, `${label}: ${portalLink}`].join(' ・ ')}`
  }

  // タイトル行・フッタ・区切りの改行を確保したうえで本文に使える文字数を求める
  const fixedLength =
    mention.length + heading.length + buildFooter(true).length + '\n\n\n\n'.length
  const bodyLimit = Math.max(
    0,
    Math.min(DISCORD_BODY_MAX_LENGTH, DISCORD_CONTENT_MAX_LENGTH - fixedLength)
  )

  const { text, truncated } = truncate(body, bodyLimit)
  const content = [`${mention}${heading}`, text, buildFooter(truncated)]
    .filter((part) => part.length > 0)
    .join('\n\n')

  return {
    content,
    truncated,
    hasTable: hasMarkdownTable(input.content),
  }
}
