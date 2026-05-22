export async function sendPendingApprovalNotification({
  userId,
  email,
  name,
  studentId,
  className,
}: {
  userId: string
  email: string
  name: string
  studentId: string | null
  className: string | null
}) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_NOTIFY_CHANNEL_ID
  if (!botToken || !channelId) return

  const lines = [
    '📋 **入会申請が届きました**',
    `- 名前: ${name}`,
    `- メール: ${email}`,
    `- 学籍番号: ${studentId ?? '—'}`,
    `- クラス: ${className ?? '—'}`,
  ]

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://sazanami-portal.vercel.app, 1.0)',
    },
    body: JSON.stringify({
      content: lines.join('\n'),
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: '承認する',
              custom_id: `approve_member:${userId}`,
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`discord notify failed: ${res.status} ${detail}`)
  }
}
