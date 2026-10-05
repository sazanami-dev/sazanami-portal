import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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

  const memberRes = await fetch(
    `https://api.github.com/orgs/${orgName}/members/${username}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (memberRes.status === 404) {
    return NextResponse.json({ joined: false }, { status: 200 })
  }
  if (memberRes.status !== 204) {
    const detail = await memberRes.text().catch(() => '')
    return NextResponse.json({ error: 'member_check_failed', detail }, { status: 502 })
  }

  const adminSupabase = createAdminClient()
  await adminSupabase
    .from('user_identities')
    .update({ is_server_joined: true })
    .eq('user_id', userData.user.id)
    .eq('provider', 'github')

  return NextResponse.json({ joined: true })
}