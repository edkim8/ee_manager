import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const { profileId, ownerId } = event.context.params as { profileId: string; ownerId: string }
  const body = await readBody(event)

  const { equity_pct, role, distribution_gl, contribution_gl, notes } = body

  const { data, error } = await client
    .from('owner_profile_mapping')
    .update({
      equity_pct:      equity_pct ?? 0,
      role:            role || null,
      distribution_gl: distribution_gl || null,
      contribution_gl: contribution_gl || null,
      notes:           notes || null,
    })
    .eq('profile_id', profileId)
    .eq('owner_id', ownerId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data)  throw createError({ statusCode: 404, statusMessage: 'Mapping not found.' })

  return data
})
