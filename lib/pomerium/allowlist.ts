import { createAdminClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/members/permissions'

/**
 * Pomerium のポリシーに埋め込む部員メールアドレスの許可リスト。
 *
 * Pomerium 側の同期スクリプト（scripts/pomerium/sync-allowlist.py）が定期的に取得し、
 * 設定テンプレートの `email: { in: ... }` に埋め込む。
 *
 * NOTE: ポータル内の認可（getViewerRole）は active のみを有効とするが、
 *       こちらは年度更新の手続き中に外部サービスから締め出さないよう renewing も含める。
 */
const POMERIUM_ALLOWED_STATUSES = ['active', 'renewing'] as const

/** グループ名 → そのグループに含めるロール */
const GROUP_ROLES = {
  members: ['member', 'manager', 'admin', 'developer'],
  managers: ['manager', 'admin', 'developer'],
  admins: ['admin', 'developer'],
} as const satisfies Record<string, readonly AppRole[]>

export type PomeriumGroup = keyof typeof GROUP_ROLES

export type PomeriumAllowlist = {
  groups: Record<PomeriumGroup, string[]>
}

const PAGE_SIZE = 1000

type UserRow = { email: string | null; role: string }

/**
 * PostgREST は1回の応答件数に上限（max-rows）があり、超過分はエラーにならず黙って切り捨てる。
 * 切り捨てられた部員は Pomerium で締め出されるため、空のページが返るまで読み進めて全件を取る。
 * 上限が PAGE_SIZE より小さくても取りこぼさないよう、実際に返ってきた件数ぶん進める。
 */
async function fetchAllowedUsers(): Promise<UserRow[]> {
  const admin = createAdminClient()
  const rows: UserRow[] = []
  for (;;) {
    const { data, error } = await admin
      .from('users')
      .select('email, role')
      .in('status', POMERIUM_ALLOWED_STATUSES)
      .order('id')
      .range(rows.length, rows.length + PAGE_SIZE - 1)
    if (error) throw new Error(`failed to load users: ${error.message}`)
    if (!data || data.length === 0) return rows
    rows.push(...data)
  }
}

export async function buildPomeriumAllowlist(): Promise<PomeriumAllowlist> {
  const users = await fetchAllowedUsers()

  const groups = {} as Record<PomeriumGroup, string[]>
  for (const [group, roles] of Object.entries(GROUP_ROLES) as [PomeriumGroup, readonly AppRole[]][]) {
    const emails = new Set<string>()
    for (const row of users) {
      const email = String(row.email ?? '').trim().toLowerCase()
      if (!email) continue
      if (roles.includes(row.role as AppRole)) emails.add(email)
    }
    // 並びを固定して、中身が変わらない限り同期スクリプトが設定を書き換えないようにする
    groups[group] = [...emails].sort()
  }

  return { groups }
}
