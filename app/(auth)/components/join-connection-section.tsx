import type { User, UserIdentity } from '@supabase/supabase-js'
import { LinkIdentityButton } from '@/app/(auth)/components/link-identity-button'
import { UnlinkIdentityButton } from '@/app/(auth)/components/unlink-identity-button'
import { DiscordServerActions } from '@/app/(auth)/components/discord-server-actions'
import { GitHubOrgActions } from '@/app/(auth)/components/github-org-action'


function pickIdentity(
  identities: UserIdentity[] | undefined,
  provider: UserIdentity['provider']
): UserIdentity | undefined {
  return (identities ?? []).find((i) => i.provider === provider)
}

function getIdentityDisplay(identity: UserIdentity) {
  const d = (identity.identity_data ?? {}) as Record<string, unknown>

  const username =
    (typeof d.user_name === 'string' && d.user_name) ||
    (typeof d.preferred_username === 'string' && d.preferred_username) ||
    (typeof d.name === 'string' && d.name) ||
    (typeof d.full_name === 'string' && d.full_name) ||
    (typeof d.login === 'string' && d.login) ||
    null

  const avatarUrl =
    (typeof d.avatar_url === 'string' && d.avatar_url) ||
    (typeof d.picture === 'string' && d.picture) ||
    null

  return { username, avatarUrl }
}

export function JoinConnectionSection({
  authUser,
  canJoinOrg
}: {
  authUser: User
  canJoinOrg: boolean
}) {
  const identities = authUser.identities ?? []
  const github = pickIdentity(identities, 'github')
  const discord = pickIdentity(identities, 'discord')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">アカウント連携</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GitHub・Discord を連携すると、承認後すぐにすべての機能を利用できます。
        </p>
      </div>

      {/* GitHub */}
      <div className="flex items-center justify-between rounded border p-4">
        <div>
          <div className="font-medium">GitHub</div>
          {github ? (
            (() => {
              const { username, avatarUrl } = getIdentityDisplay(github)
              return (
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-6 w-6 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted" />
                  )}
                  <span>{username ?? '（ユーザー名不明）'}</span>
                </div>
              )
            })()
          ) : (
            <div className="text-xs text-muted-foreground">未連携</div>
          )}
        </div>
        {github ? (
          <UnlinkIdentityButton identity={github} />
        ) : (
          <LinkIdentityButton provider="github" next="/join">
            GitHub を連携
          </LinkIdentityButton>
        )}
      </div>

      {/* Discord */}
      <div className="flex items-center justify-between rounded border p-4">
        <div>
          <div className="font-medium">Discord</div>
          {discord ? (
            (() => {
              const { username, avatarUrl } = getIdentityDisplay(discord)
              return (
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-6 w-6 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted" />
                  )}
                  <span>{username ?? '（ユーザー名不明）'}</span>
                </div>
              )
            })()
          ) : (
            <div className="text-xs text-muted-foreground">未連携</div>
          )}
        </div>
        {discord ? (
          <UnlinkIdentityButton identity={discord} />
        ) : (
          <LinkIdentityButton provider="discord" next="/join">
            Discord を連携
          </LinkIdentityButton>
        )}
      </div>
      {discord && (
        <DiscordServerActions disabled={!canJoinOrg} />
      )}
      {github &&(
        <GitHubOrgActions disabled={!canJoinOrg} />
      )}
    </div>
  )
}