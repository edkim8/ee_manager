import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../../types/supabase'

/**
 * GET /api/note-categories
 * Returns all note_category_configs with per-category usage counts from the notes table.
 * Usage counts include any "orphaned" category values (exist in notes but not in config).
 */
export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole<Database>(event)

  // Load all configs
  const { data: configs, error: configError } = await client
    .from('note_category_configs')
    .select('record_type, categories, updated_at, updated_by')
    .order('record_type')

  if (configError) throw createError({ statusCode: 500, message: configError.message })

  // Load all note (record_type, category) pairs to build usage counts.
  // Fetching only two text columns — small payload even with many notes.
  const { data: notes, error: notesError } = await client
    .from('notes')
    .select('record_type, category')

  if (notesError) throw createError({ statusCode: 500, message: notesError.message })

  // Aggregate counts: usage[record_type][category] = count
  const usage: Record<string, Record<string, number>> = {}
  for (const note of notes ?? []) {
    if (!usage[note.record_type]) usage[note.record_type] = {}
    usage[note.record_type][note.category] = (usage[note.record_type][note.category] ?? 0) + 1
  }

  return { configs, usage }
})
