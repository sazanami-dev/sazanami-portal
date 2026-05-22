import { Resend } from 'resend'

export async function sendApprovalEmail(to: string, name: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.MAIL_FROM ?? 'noreply@mail.sazanami.dev'

  await resend.emails.send({
    from: `さざなみ開発 <${from}>`,
    to,
    subject: '【さざなみ開発】入会申請が承認されました',
    text: `${name} さん\n\nさざなみ開発への入会申請が承認されました。\nポータルにログインして、DiscordやGitHubへの参加手続きをお進めください。\n\nhttps://portal.sazanami.dev\n\nご不明な点がございましたら、担当者までお問い合わせください。\n\n──\nさざなみ ポータル`,
    html: `<p>${name} さん</p>
<p>さざなみ開発への入会申請が承認されました。<br>
ポータルにログインして、Discord や GitHub への参加手続きをお進めください。</p>
<p><a href="https://portal.sazanami.dev">https://portal.sazanami.dev</a></p>
<p>ご不明な点がございましたら、運営チームまでお問い合わせください。</p>
<hr>
<small>さざなみ ポータル</small>`,
  })
}
