import { createAppAuth } from '@octokit/auth-app'

export async function getGitHubInstallationToken(): Promise<string> {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    installationId: Number(process.env.GITHUB_APP_INSTALLATION_ID!),
  })
  const { token } = await auth({ type: 'installation' })
  return token
}