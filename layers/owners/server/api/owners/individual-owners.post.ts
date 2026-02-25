import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const body = await readBody(event)

  const { profile_id, owner_id, equity_pct, role, distribution_gl, contribution_gl, notes } = body

  if (!profile_id) throw createError({ statusCode: 400, statusMessage: 'profile_id is required.' })
  if (!owner_id)   throw createError({ statusCode: 400, statusMessage: 'owner_id is required.' })

  const { data, error } = await client
    .from('owner_profile_mapping')
    .insert({
      profile_id,
      owner_id,
      equity_pct:      equity_pct ?? 0,
      role:            role || null,
      distribution_gl: distribution_gl || null,
      contribution_gl: contribution_gl || null,
      notes:           notes || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'This owner is already mapped to that entity.' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data
})
