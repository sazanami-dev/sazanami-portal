/**
 * お知らせの Discord 通知先チャンネル定義。
 *
 * チャンネル ID はコードに埋め込まず、環境変数から解決する。
 * DB には ID だけを保存し、表示名はここで解決する（環境変数が変わって
 * 解決できない場合は ID をそのまま表示する）。
 */

import type { AnnouncementCategory } from '@/lib/announcements/types'

export type AnnounceChannelKey = 'news' | 'internalEvent' | 'externalEvent'

export type AnnounceChannel = {
  key: AnnounceChannelKey
  id: string
  /** 表示名。環境変数に名前が無ければ ID を出す */
  name: string
}

/** チャンネルキー → 環境変数のサフィックス */
const ENV_SUFFIX: Record<AnnounceChannelKey, string> = {
  news: 'NEWS',
  internalEvent: 'INTERNALEVENT',
  externalEvent: 'EXTERNALEVENT',
}

/** プルダウンに出す順序 */
const CHANNEL_ORDER: readonly AnnounceChannelKey[] = [
  'news',
  'internalEvent',
  'externalEvent',
] as const

/**
 * カテゴリごとの既定の通知先。
 * 「システム」は専用チャンネルを持たないため広報掲示板へ送る。
 * UI ではカテゴリ変更時にここへ追従させる（手動変更後は追従しない）。
 */
export const DEFAULT_ANNOUNCE_CHANNEL_BY_CATEGORY: Record<
  AnnouncementCategory,
  AnnounceChannelKey
> = {
  info: 'news',
  system: 'news',
  internal_event: 'internalEvent',
  external_event: 'externalEvent',
}

function readChannel(key: AnnounceChannelKey): AnnounceChannel | null {
  const suffix = ENV_SUFFIX[key]
  const id = process.env[`DISCORD_ANNOUNCE_CHANNEL_${suffix}_ID`]?.trim()
  if (!id) return null
  const name = process.env[`DISCORD_ANNOUNCE_CHANNEL_${suffix}_NAME`]?.trim()
  return { key, id, name: name || id }
}

/** 環境変数に ID が設定されているチャンネルだけを返す */
export function listAnnounceChannels(): AnnounceChannel[] {
  return CHANNEL_ORDER.map(readChannel).filter((c): c is AnnounceChannel => c !== null)
}

/** 指定 ID が設定済みチャンネルのものか（クライアントから任意の ID を受け取らないため） */
export function isAllowedAnnounceChannelId(id: string): boolean {
  return listAnnounceChannels().some((channel) => channel.id === id)
}

/** ID から表示名を解決する。未設定のチャンネルだった場合は ID をそのまま返す */
export function resolveAnnounceChannelName(id: string): string {
  return listAnnounceChannels().find((channel) => channel.id === id)?.name ?? id
}

/** カテゴリの既定チャンネル ID。未設定なら null（＝チャンネル未選択で開く） */
export function defaultAnnounceChannelId(category: AnnouncementCategory): string | null {
  const key = DEFAULT_ANNOUNCE_CHANNEL_BY_CATEGORY[category]
  return readChannel(key)?.id ?? null
}

/** カテゴリ → 既定チャンネル ID の対応表。未設定のカテゴリは null */
export function defaultAnnounceChannelIdByCategory(): Record<
  AnnouncementCategory,
  string | null
> {
  const entries = Object.entries(DEFAULT_ANNOUNCE_CHANNEL_BY_CATEGORY) as [
    AnnouncementCategory,
    AnnounceChannelKey,
  ][]
  return Object.fromEntries(
    entries.map(([category, key]) => [category, readChannel(key)?.id ?? null])
  ) as Record<AnnouncementCategory, string | null>
}

/** Discord 上のメッセージへのリンク。guild ID が未設定なら null */
export function discordMessageUrl(channelId: string, messageId: string): string | null {
  const guildId = process.env.DISCORD_GUILD_ID?.trim()
  if (!guildId) return null
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
}
