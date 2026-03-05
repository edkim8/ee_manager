/**
 * PATCH /api/renewal-templates/:code
 *
 * Upserts community_name, manager_name, manager_phone, letterhead_url,
 * and/or docx_template_url for the given property_code.
 *
 * Page-level access (Asset / RPM / Manager / super admin) is enforced by
 * the renewal-templates middleware. This route only verifies authentication.
 *
 * Body: Partial<{
 *   community_name: string
 *   manager_name: string
 *   manager_phone: string
 *   letterhead_url: string | null
 *   docx_template_url: string | null
 * }>
 */

import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const ALLOWED_FIELDS = new Set([
  'community_name',
  'manager_name',
  'manager_phone',
  'letterhead_url',
  'docx_template_url',
])

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const code = getRouterParam(event, 'code')?.toUpperCase()
  if (!code) throw createError({ statusCode: 400, statusMessage: 'Missing property code' })

  const body = await readBody<Record<string, unknown>>(event)
  if (!body || typeof body !== 'object')
    throw createError({ statusCode: 400, statusMessage: 'Missing body' })

  // Whitelist allowed fields
  const updates: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) updates[key] = val
  }
  if (Object.keys(updates).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('renewal_letter_templates')
    .upsert(
      { property_code: code, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'property_code' }
    )
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
