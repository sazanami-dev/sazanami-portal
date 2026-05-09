type InviteCreateSuccess = {
  ok: true
  inviteUrl: string
}

type InviteCreateFailure = {
  ok: false
  detail: string
}

export type InviteCreateResult = InviteCreateSuccess | InviteCreateFailure

export async function createDiscordInvite({
  botToken,
  channelId,
  maxAge,
}: {
  botToken: string
  channelId: string
  maxAge?: string
}): Promise<InviteCreateResult> {
  const maxAgeSeconds = maxAge ? parseInt(maxAge, 10) : 86400
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://sazanami-portal.vercel.app, 1.0)',
    },
    body: JSON.stringify({
      max_age: Number.isFinite(maxAgeSeconds) ? maxAgeSeconds : 86400,
      max_uses: 1,
      temporary: false,
      unique: true,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const detail = json != null ? JSON.stringify(json) : String(res.status)
    return { ok: false, detail }
  }

  const code =
    json &&
    typeof json === 'object' &&
    typeof (json as { code?: unknown }).code === 'string'
      ? (json as { code: string }).code
      : null

  if (!code) {
    return { ok: false, detail: 'invite code missing in response' }
  }

  return { ok: true, inviteUrl: `https://discord.gg/${code}` }
}
