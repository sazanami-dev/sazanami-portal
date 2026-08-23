import { LoginForm } from '@/app/(auth)/components/signin-form'
import { allowedEmailDomains } from '@/lib/auth/email-domain'

const ERROR_MESSAGES: Record<string, string> = {
  email_domain_not_allowed: '学校のアカウントでサインインしてください。',
  discord_no_email: 'Discord アカウントにメールアドレスが登録されていません。',
}

type Props = { searchParams: Promise<{ error?: string }> }

export default async function Page({ searchParams }: Props) {
  const { error } = await searchParams
  const message = error ? ERROR_MESSAGES[error] : null
  const domains = allowedEmailDomains()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        {message && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <p>{message}</p>
            {error === 'email_domain_not_allowed' && domains.length > 0 && (
              <p className="mt-1 text-red-700">
                利用できるドメイン: {domains.map((domain) => `@${domain}`).join(' / ')}
              </p>
            )}
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
