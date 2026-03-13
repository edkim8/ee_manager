import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../../../types/supabase'

/**
 * POST /api/note-categories/:type/rename
 * Renames a category value in the config array.
 * Optionally updates all existing notes that use the old value.
 * Body: { from: string, to: string, updateNotes: boolean }
 */
export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole<Database>(event)
  const recordType = getRouterParam(event, 'type')!
  const body = await readBody<{ from: string; to: string; updateNotes: boolean }>(event)

  const { from, to, updateNotes } = body ?? {}

  if (!from || !to) {
    throw createError({ statusCode: 400, message: 'from and to are required' })
  }
  if (from === to) {
    throw createError({ statusCode: 400, message: 'from and to must be different' })
  }

  // 1. Load current config
  const { data: config, error: fetchError } = await client
    .from('note_category_configs')
    .select('categories')
    .eq('record_type', recordType)
    .single()

  if (fetchError || !config) {
    throw createError({ statusCode: 404, message: `No config found for record_type '${recordType}'` })
  }

  const currentCategories = config.categories as string[]

  if (!currentCategories.includes(from)) {
    throw createError({ statusCode: 400, message: `Category '${from}' not found in config` })
  }
  if (currentCategories.includes(to)) {
    throw createError({ statusCode: 400, message: `Category '${to}' already exists` })
  }

  // 2. Update config array (preserve order)
  const updatedCategories = currentCategories.map(c => (c === from ? to : c))

  const { data: user } = await client.auth.getUser()

  const { error: updateConfigError } = await client
    .from('note_category_configs')
    .update({
      categories: updatedCategories,
      updated_at: new Date().toISOString(),
      updated_by: user?.user?.id ?? null,
    })
    .eq('record_type', recordType)

  if (updateConfigError) throw createError({ statusCode: 500, message: updateConfigError.message })

  // 3. Optionally migrate existing notes
  let notesUpdated = 0
  if (updateNotes) {
    const { count, error: noteUpdateError } = await client
      .from('notes')
      .update({ category: to })
      .eq('record_type', recordType)
      .eq('category', from)
      .select('id', { count: 'exact' })

    if (noteUpdateError) throw createError({ statusCode: 500, message: noteUpdateError.message })
    notesUpdated = count ?? 0
  }

  return { ok: true, notesUpdated }
})
