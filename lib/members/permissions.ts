export type AppRole = 'admin' | 'developer' | 'manager' | 'member' | 'guest'

export function canAccessMembersDirectory(role: AppRole): boolean {
  return role !== 'guest'
}

export function canViewFullProfiles(role: AppRole): boolean {
  return role === 'manager' || role === 'admin' || role === 'developer'
}

export function canExportCsv(role: AppRole): boolean {
  return role === 'manager' || role === 'admin' || role === 'developer'
}

export function canPromoteMemberToManager(actor: AppRole): boolean {
  return actor === 'manager' || actor === 'admin' || actor === 'developer'
}

export function canEditUsers(role: AppRole): boolean {
  return role === 'admin' || role === 'developer'
}

export function canDeleteUsers(role: AppRole): boolean {
  return role === 'admin' || role === 'developer'
}

export function canChangeRoles(actor: AppRole): boolean {
  return actor === 'admin' || actor === 'developer'
}

/** 年度切替（renewing化）は admin のみ */
export function canRunAnnualRollover(role: AppRole): boolean {
  return role === 'admin'
}

/** 承認待ち（pending）の承認・却下（削除）: manager 以上 */
export const PENDING_APPROVER_ROLES: readonly AppRole[] = [
  'manager',
  'admin',
  'developer',
] as const

export const canManagePendingMembers = (role: AppRole): boolean =>
  (PENDING_APPROVER_ROLES as readonly string[]).includes(role)

export function canBulkGrantDrive(role: AppRole): boolean {
  return role === 'admin'
}

/** developer のみ admin ロールを付与可能（admin は developer へは昇格可とする） */
export function canAssignRole(actor: AppRole, targetRole: AppRole): boolean {
  if (!canChangeRoles(actor)) return false
  if (targetRole === 'admin' && actor !== 'developer') return false
  return true
}
