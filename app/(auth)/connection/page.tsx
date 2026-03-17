import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { LinkIdentityButton } from '@/app/(auth)/components/link-identity-button'
import { UnlinkIdentityButton } from '@/app/(auth)/components/unlink-identity-button'

import type { UserIdentity } from '@supabase/supabase-js'

function pickIdentity(
    identities: UserIdentity[] | undefined,
    provider: UserIdentity['provider']
): UserIdentity | undefined {
    return (identities ?? []).find((i) => i.provider === provider)
}

function getIdentityDisplay(identity: UserIdentity) {
    const d = (identity.identity_data ?? {}) as Record<string, unknown>

    // よくあるキー候補（providerによって違う）
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

export default async function ConnectionPage() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) redirect('/signin')

    const identities = data.user.identities ?? []

    const github = pickIdentity(identities, 'github')
    const discord = pickIdentity(identities, 'discord')

    return (
        <main className="mx-auto max-w-lg p-6 space-y-6">
            <h1 className="text-xl font-semibold">アカウント連携</h1>

            <section className="space-y-3 rounded border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">GitHub</div>
                        {github ? (
                            (() => {
                                const { username, avatarUrl } = getIdentityDisplay(github)
                                return (
                                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        {avatarUrl ? (
                                            // next/image を使ってもOK。まずは素の img が簡単です
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
                        <LinkIdentityButton provider="github" next="/connection">
                            GitHub を連携
                        </LinkIdentityButton>
                    )}
                </div>
            </section>

            <section className="space-y-3 rounded border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">Discord</div>
                        {discord ? (
                            (() => {
                                const { username, avatarUrl } = getIdentityDisplay(discord)
                                return (
                                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        {avatarUrl ? (
                                            // next/image を使ってもOK。まずは素の img が簡単です
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
                        <LinkIdentityButton provider="discord" next="/connection">
                            Discord を連携
                        </LinkIdentityButton>
                    )}
                </div>
            </section>

            <section className="rounded border p-4">
                <div className="text-sm font-medium">現在の連携一覧</div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {identities.length === 0 ? (
                        <li>なし</li>
                    ) : (
                        identities.map((i) => (
                            <li key={i.id}>
                                {i.provider} / {i.id}
                            </li>
                        ))
                    )}
                </ul>
            </section>
        </main>
    )
}