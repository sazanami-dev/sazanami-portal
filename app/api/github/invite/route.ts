import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGitHubInstallationToken } from '@/lib/github'

export async function POST() {
  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const orgName = process.env.GITHUB_ORG_NAME
  if (!orgName) {
    return NextResponse.json({ error: 'github_env_missing' }, { status: 500 })
  }

  const ghIdentity = (userData.user.identities ?? []).find(
    (i) => i.provider === 'github'
  )
  if (!ghIdentity) {
    return NextResponse.json({ error: 'github_not_linked' }, { status: 400 })
  }

  const identityData = (ghIdentity.identity_data ?? {}) as Record<string, unknown>
  const username =
    (typeof identityData.user_name === 'string' && identityData.user_name) ||
    (typeof identityData.preferred_username === 'string' && identityData.preferred_username) ||
    null
  if (!username) {
    return NextResponse.json({ error: 'github_username_not_found' }, { status: 400 })
  }

  const token = await getGitHubInstallationToken()

  const res = await fetch(
    `https://api.github.com/orgs/${orgName}/memberships/${username}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ role: 'member' }),
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return NextResponse.json({ error: 'invite_failed', detail }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json({ state: data.state, username })
}