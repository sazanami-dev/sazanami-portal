import { createAdminClient } from '@/lib/supabase/server'
import type { TemplateSegment, DynamicToken } from './segments'
import { DEFAULT_DYNAMIC_FORMAT } from './segments'

const DYNAMIC_TOKENS: DynamicToken[] = ['year', 'month', 'date', 'datetime']

export type UploadTemplate = {
  id: string
  name: string
  description: string | null
  baseFolderId: string
  segments: TemplateSegment[]
  filenameFormat: string | null
  isActive: boolean
  managerOnly: boolean
  sortOrder: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

type TemplateRow = {
  id: string
  name: string
  description: string | null
  base_folder_id: string
  segments: unknown
  filename_format: string | null
  is_active: boolean
  manager_only: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

function rowToTemplate(row: TemplateRow): UploadTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    baseFolderId: row.base_folder_id,
    segments: (row.segments as TemplateSegment[]) ?? [],
    filenameFormat: row.filename_format,
    isActive: row.is_active,
    managerOnly: row.manager_only,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const SELECT =
  'id, name, description, base_folder_id, segments, filename_format, is_active, manager_only, sort_order, created_by, created_at, updated_at'

/** segments のバリデーション。問題なければ正規化した配列、不正なら null。 */
export function validateSegments(input: unknown): TemplateSegment[] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  const out: TemplateSegment[] = []
  for (const seg of input) {
    if (!seg || typeof seg !== 'object') return null
    const s = seg as Record<string, unknown>
    if (s.type === 'static') {
      if (typeof s.value !== 'string' || !s.value.trim()) return null
      out.push({ type: 'static', value: s.value.trim() })
    } else if (s.type === 'dynamic') {
      if (typeof s.token !== 'string' || !DYNAMIC_TOKENS.includes(s.token as DynamicToken)) {
        return null
      }
      const token = s.token as DynamicToken
      out.push({
        type: 'dynamic',
        token,
        format:
          typeof s.format === 'string' && s.format.trim()
            ? s.format.trim()
            : DEFAULT_DYNAMIC_FORMAT[token],
        default: 'current',
      })
    } else {
      return null
    }
  }
  return out
}

export async function listTemplates(options?: {
  activeOnly?: boolean
  /** false の場合 manager 専用テンプレートを除外する */
  includeManagerOnly?: boolean
}): Promise<UploadTemplate[]> {
  const admin = createAdminClient()
  let query = admin
    .from('upload_templates')
    .select(SELECT)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (options?.activeOnly) query = query.eq('is_active', true)
  if (options?.includeManagerOnly === false) query = query.eq('manager_only', false)
  const { data, error } = await query
  if (error || !data) return []
  return (data as TemplateRow[]).map(rowToTemplate)
}

export async function getTemplateById(id: string): Promise<UploadTemplate | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('upload_templates').select(SELECT).eq('id', id).maybeSingle()
  if (error || !data) return null
  return rowToTemplate(data as TemplateRow)
}

type CreateTemplateInput = {
  name: string
  description?: string | null
  baseFolderId: string
  segments: TemplateSegment[]
  filenameFormat?: string | null
  isActive?: boolean
  managerOnly?: boolean
  createdBy: string
}

export async function createTemplate(input: CreateTemplateInput): Promise<UploadTemplate | null> {
  const admin = createAdminClient()
  // 新規テンプレートは末尾に追加する
  const { data: last } = await admin
    .from('upload_templates')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sortOrder = last ? (last as { sort_order: number }).sort_order + 1 : 0

  const { data, error } = await admin
    .from('upload_templates')
    .insert({
      name: input.name,
      description: input.description ?? null,
      base_folder_id: input.baseFolderId,
      segments: input.segments,
      filename_format: input.filenameFormat ?? null,
      is_active: input.isActive ?? true,
      manager_only: input.managerOnly ?? false,
      sort_order: sortOrder,
      created_by: input.createdBy,
    })
    .select(SELECT)
    .single()
  if (error || !data) return null
  return rowToTemplate(data as TemplateRow)
}

type UpdateTemplatePatch = {
  name?: string
  description?: string | null
  baseFolderId?: string
  segments?: TemplateSegment[]
  filenameFormat?: string | null
  isActive?: boolean
  managerOnly?: boolean
}

export async function updateTemplate(id: string, patch: UpdateTemplatePatch): Promise<boolean> {
  const admin = createAdminClient()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.description !== undefined) update.description = patch.description
  if (patch.baseFolderId !== undefined) update.base_folder_id = patch.baseFolderId
  if (patch.segments !== undefined) update.segments = patch.segments
  if (patch.filenameFormat !== undefined) update.filename_format = patch.filenameFormat
  if (patch.isActive !== undefined) update.is_active = patch.isActive
  if (patch.managerOnly !== undefined) update.manager_only = patch.managerOnly

  const { error } = await admin.from('upload_templates').update(update).eq('id', id)
  return !error
}

/**
 * ids の並び順をそのまま sort_order として 1 トランザクションで保存する。
 * ids が全テンプレートと一致しない場合（古い一覧からの並べ替えなど）は 'mismatch'。
 */
export async function reorderTemplates(ids: string[]): Promise<'ok' | 'mismatch' | 'error'> {
  const admin = createAdminClient()
  const { error } = await admin.rpc('reorder_upload_templates', { p_ids: ids })
  if (!error) return 'ok'
  // 22023: 関数内の ID 不一致、22P02: uuid として不正な文字列
  if (error.code === '22023' || error.code === '22P02') return 'mismatch'
  return 'error'
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('upload_templates').delete().eq('id', id)
  return !error
}
