type NicknameUpdateSuccess = {
  updated: true
  reason: null
}

type NicknameUpdateFailure = {
  updated: false
  reason: 'nickname_empty' | 'nickname_update_failed'
  detail?: string
}

export type NicknameUpdateResult = NicknameUpdateSuccess | NicknameUpdateFailure

export type DiscordApiResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; detail: string }

async function discordApiRequest({
  botToken,
  path,
  method = 'GET',
  body,
}: {
  botToken: string
  path: string
  method?: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE'
  body?: unknown
}): Promise<DiscordApiResult> {
  const headers: Record<string, string> = {
    Authorization: `Bot ${botToken}`,
    'User-Agent': 'DiscordBot (https://sazanami-portal.vercel.app, 1.0)',
  }
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })

  const text = await res.text().catch(() => '')
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // 204 No Content etc.
  }

  if (!res.ok) {
    const detail = text || String(res.status)
    return { ok: false, status: res.status, detail }
  }
  return { ok: true, status: res.status, body: json }
}

export function pickDiscordUserId(identities: unknown[] | undefined): string | null {
  const discord = (identities ?? []).find((i) => {
    const x = i as Record<string, unknown>
    return x.provider === 'discord'
  }) as Record<string, unknown> | undefined

  if (!discord) return null

  const d = (discord.identity_data ?? {}) as Record<string, unknown>
  const cands = [d.sub, d.user_id, discord.provider_id].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  )
  return cands[0] ?? null
}

export function buildDiscordNickname(className: string | null, fullName: string | null): string {
  const normalized = (fullName ?? '').trim().replace(/\s+/g, ' ')
  const parts = normalized.split(' ').filter(Boolean)
  const last = parts[0] ?? ''
  const first = parts.slice(1).join(' ')
  const nick = [className ?? '', last, first].filter(Boolean).join(' ').trim()
  return nick.slice(0, 32)
}

export async function getGuildMember({
  botToken,
  guildId,
  discordUserId,
}: {
  botToken: string
  guildId: string
  discordUserId: string
}): Promise<
  | { found: false; notFound: true }
  | { found: false; notFound: false; detail: string }
  | { found: true; roles: string[] }
> {
  const result = await discordApiRequest({
    botToken,
    path: `/guilds/${guildId}/members/${discordUserId}`,
  })

  if (!result.ok) {
    if (result.status === 404) {
      return { found: false, notFound: true }
    }
    return { found: false, notFound: false, detail: result.detail }
  }

  const member = result.body as { roles?: string[] } | null
  return { found: true, roles: member?.roles ?? [] }
}

export async function addRoleToMember({
  botToken,
  guildId,
  discordUserId,
  roleId,
}: {
  botToken: string
  guildId: string
  discordUserId: string
  roleId: string
}): Promise<{ ok: true } | { ok: false; detail: string }> {
  const result = await discordApiRequest({
    botToken,
    path: `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    method: 'PUT',
  })
  if (!result.ok) return { ok: false, detail: result.detail }
  return { ok: true }
}

export async function removeRoleFromMember({
  botToken,
  guildId,
  discordUserId,
  roleId,
}: {
  botToken: string
  guildId: string
  discordUserId: string
  roleId: string
}): Promise<{ ok: true } | { ok: false; detail: string }> {
  const result = await discordApiRequest({
    botToken,
    path: `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    method: 'DELETE',
  })
  if (!result.ok) return { ok: false, detail: result.detail }
  return { ok: true }
}

export async function updateDiscordNickname({
  botToken,
  guildId,
  discordUserId,
  className,
  fullName,
}: {
  botToken: string
  guildId: string
  discordUserId: string
  className: string | null
  fullName: string | null
}): Promise<NicknameUpdateResult> {
  const nick = buildDiscordNickname(className, fullName)
  if (!nick) {
    return { updated: false, reason: 'nickname_empty' }
  }

  const result = await discordApiRequest({
    botToken,
    path: `/guilds/${guildId}/members/${discordUserId}`,
    method: 'PATCH',
    body: { nick },
  })
  if (!result.ok) {
    return { updated: false, reason: 'nickname_update_failed', detail: result.detail }
  }

  return { updated: true, reason: null }
}
