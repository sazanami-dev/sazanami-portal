import type { AppRole } from '@/lib/members/permissions'

export const OFFICIAL_LINK_NAMESPACE = '_s'

export function canCreateOfficialLink(role: AppRole): boolean {
  return role === 'admin' || role === 'developer' || role === 'manager'
}

export function canCreateUserLink(role: AppRole): boolean {
  return role !== 'guest'
}

export function canManageLink(
  actorId: string,
  actorRole: AppRole,
  link: { createdBy: string | null }
): boolean {
  if (actorRole === 'admin' || actorRole === 'developer') return true
  return link.createdBy === actorId
}

export function canManageCollection(
  actorId: string,
  actorRole: AppRole,
  collection: { createdBy: string | null }
): boolean {
  if (actorRole === 'admin' || actorRole === 'developer') return true
  return collection.createdBy === actorId
}

export function canCreateCollection(role: AppRole): boolean {
  return role === 'admin' || role === 'developer' || role === 'manager'
}
