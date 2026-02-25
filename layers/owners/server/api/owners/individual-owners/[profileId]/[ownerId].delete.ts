import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const { profileId, ownerId } = event.context.params as { profileId: string; ownerId: string }

  const { error } = await client
    .from('owner_profile_mapping')
    .delete()
    .eq('profile_id', profileId)
    .eq('owner_id', ownerId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
