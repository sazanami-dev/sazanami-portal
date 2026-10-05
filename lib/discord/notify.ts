/**
 * Discord Markdown の特殊文字をエスケープする。
 * @everyone, @here, ユーザーメンション(<@...>)、ロールメンション(<@&...>)
 * および書式記号(*, _, ~, `, |, >) を無効化する。
 */
function escapeDiscordMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/\|/g, '\\|')
    .replace(/>/g, '\\>')
    .replace(/@everyone/gi, '@\u200Beveryone')
    .replace(/@here/gi, '@\u200Bhere')
    .replace(/<@/g, '<\u200B@')
}

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

  const safeName = escapeDiscordMarkdown(name)
  const safeEmail = escapeDiscordMarkdown(email)
  const safeStudentId = escapeDiscordMarkdown(studentId ?? '—')
  const safeClassName = escapeDiscordMarkdown(className ?? '—')

  const lines = [
    '📋 **入会申請が届きました**',
    `- 名前: ${safeName}`,
    `- メール: ${safeEmail}`,
    `- 学籍番号: ${safeStudentId}`,
    `- クラス: ${safeClassName}`,
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

