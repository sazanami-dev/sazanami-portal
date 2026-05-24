import { createAdminClient } from '@/lib/supabase/server'
import { generateSlug, validateSlug, validateTargetUrl } from './slug'
import { hashPassword } from './password'
import { OFFICIAL_LINK_NAMESPACE } from './permissions'

export type ShortLink = {
  id: string
  namespace: string
  slug: string
  title: string | null
  targetUrl: string
  createdBy: string | null
  hasPassword: boolean
  inCollection: boolean
  createdAt: string
  updatedAt: string
}

type CreateLinkInput = {
  namespace: string
  slug?: string
  slugLength?: number
  title?: string
  targetUrl: string
  password?: string
  inCollection?: boolean
  createdBy: string
}

async function isSlugAvailable(
  admin: ReturnType<typeof createAdminClient>,
  namespace: string,
  slug: string
): Promise<boolean> {
  const { data } = await admin
    .from('short_links')
    .select('id')
    .eq('namespace', namespace)
    .eq('slug', slug)
    .maybeSingle()
  return !data
}

export async function createLink(input: CreateLinkInput): Promise<ShortLink | null> {
  if (!validateTargetUrl(input.targetUrl)) return null

  const admin = createAdminClient()
  const length = Math.min(10, Math.max(5, input.slugLength ?? 7))

  let slug = input.slug
  if (slug) {
    if (!validateSlug(slug)) return null
  } else {
    let attempts = 0
    do {
      slug = generateSlug(length)
      attempts++
      if (attempts > 3) return null
    } while (!(await isSlugAvailable(admin, input.namespace, slug)))
  }

  const passwordHash = input.password ? await hashPassword(input.password) : null

  const { data, error } = await admin
    .from('short_links')
    .insert({
      namespace: input.namespace,
      slug,
      title: input.title ?? null,
      target_url: input.targetUrl,
      created_by: input.createdBy,
      password_hash: passwordHash,
      in_collection: input.inCollection ?? false,
    })
    .select('id, namespace, slug, title, target_url, created_by, password_hash, in_collection, created_at, updated_at')
    .single()

  if (error || !data) return null
  return rowToLink(data)
}

export async function getLinkByNamespaceSlug(
  namespace: string,
  slug: string
): Promise<(ShortLink & { passwordHash: string | null }) | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('short_links')
    .select('id, namespace, slug, title, target_url, created_by, password_hash, in_collection, created_at, updated_at')
    .eq('namespace', namespace)
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return { ...rowToLink(data), passwordHash: data.password_hash }
}

export async function getLinkById(id: string): Promise<(ShortLink & { passwordHash: string | null }) | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('short_links')
    .select('id, namespace, slug, title, target_url, created_by, password_hash, in_collection, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return { ...rowToLink(data), passwordHash: data.password_hash }
}

export async function listLinks(options: {
  createdBy?: string
  adminView?: boolean
}): Promise<ShortLink[]> {
  const admin = createAdminClient()
  let query = admin
    .from('short_links')
    .select('id, namespace, slug, title, target_url, created_by, password_hash, in_collection, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (!options.adminView && options.createdBy) {
    query = query.eq('created_by', options.createdBy)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data.map(rowToLink)
}

export async function listCollectionLinks(): Promise<ShortLink[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('short_links')
    .select('id, namespace, slug, title, target_url, created_by, password_hash, in_collection, created_at, updated_at')
    .eq('namespace', OFFICIAL_LINK_NAMESPACE)
    .eq('in_collection', true)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map(rowToLink)
}

export async function updateLink(
  id: string,
  patch: {
    title?: string | null
    targetUrl?: string
    password?: string | null
    inCollection?: boolean
    slug?: string
  }
): Promise<boolean> {
  const admin = createAdminClient()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (patch.title !== undefined) update.title = patch.title
  if (patch.targetUrl !== undefined) {
    if (!validateTargetUrl(patch.targetUrl)) return false
    update.target_url = patch.targetUrl
  }
  if (patch.password !== undefined) {
    update.password_hash = patch.password ? await hashPassword(patch.password) : null
  }
  if (patch.inCollection !== undefined) update.in_collection = patch.inCollection
  if (patch.slug !== undefined) {
    if (!validateSlug(patch.slug)) return false
    update.slug = patch.slug
  }

  const { error } = await admin.from('short_links').update(update).eq('id', id)
  return !error
}

export async function deleteLink(id: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('short_links').delete().eq('id', id)
  return !error
}

function rowToLink(row: {
  id: string
  namespace: string
  slug: string
  title: string | null
  target_url: string
  created_by: string | null
  password_hash: string | null
  in_collection: boolean
  created_at: string
  updated_at: string
}): ShortLink {
  return {
    id: row.id,
    namespace: row.namespace,
    slug: row.slug,
    title: row.title,
    targetUrl: row.target_url,
    createdBy: row.created_by,
    hasPassword: !!row.password_hash,
    inCollection: row.in_collection,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export { OFFICIAL_LINK_NAMESPACE }
