import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../../../types/supabase'

/**
 * POST /api/note-categories/:type/delete-category
 * Removes a category value from the config array.
 * Optionally deletes all notes that use this category value.
 * Body: { value: string, deleteNotes: boolean }
 */
export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole<Database>(event)
  const recordType = getRouterParam(event, 'type')!
  const body = await readBody<{ value: string; deleteNotes: boolean }>(event)

  const { value, deleteNotes } = body ?? {}

  if (!value) {
    throw createError({ statusCode: 400, message: 'value is required' })
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

  // 2. Remove from config array
  const updatedCategories = currentCategories.filter(c => c !== value)

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

  // 3. Optionally delete orphaned notes
  let notesDeleted = 0
  if (deleteNotes) {
    const { count, error: noteDeleteError } = await client
      .from('notes')
      .delete()
      .eq('record_type', recordType)
      .eq('category', value)
      .select('id', { count: 'exact' })

    if (noteDeleteError) throw createError({ statusCode: 500, message: noteDeleteError.message })
    notesDeleted = count ?? 0
  }

  return { ok: true, notesDeleted }
})
