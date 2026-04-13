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
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      max_age: maxAge,
      max_uses: 1,
      temporary: false,
      unique: true,
    }),
  })

  const json = await res.json().catch(() => null)
  const code =
    json &&
    typeof json === 'object' &&
    'code' in json &&
    typeof (json as { code?: unknown }).code === 'string'
      ? (json as { code: string }).code
      : null

  if (!res.ok || !code) {
    const detail = json != null ? JSON.stringify(json) : String(res.status)
    return { ok: false, detail }
  }

  return { ok: true, inviteUrl: `https://discord.gg/${code}` }
}
