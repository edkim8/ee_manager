import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../../types/supabase'

/**
 * PUT /api/note-categories/:type
 * Saves an updated categories array for a record_type (add / reorder use cases).
 * Body: { categories: string[] }
 */
export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole<Database>(event)
  const recordType = getRouterParam(event, 'type')!
  const body = await readBody<{ categories: string[] }>(event)

  if (!Array.isArray(body?.categories)) {
    throw createError({ statusCode: 400, message: 'categories must be an array' })
  }

  const { data: user } = await client.auth.getUser()

  const { error } = await client
    .from('note_category_configs')
    .upsert({
      record_type: recordType,
      categories: body.categories,
      updated_at: new Date().toISOString(),
      updated_by: user?.user?.id ?? null,
    }, { onConflict: 'record_type' })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
