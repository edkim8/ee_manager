import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)

  if (!body?.owner_entity_id) throw createError({ statusCode: 400, statusMessage: 'owner_entity_id is required' })
  if (!body?.owned_entity_id) throw createError({ statusCode: 400, statusMessage: 'owned_entity_id is required' })
  if (body.owner_entity_id === body.owned_entity_id)
    throw createError({ statusCode: 400, statusMessage: 'An entity cannot own itself' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('entity_entity_ownership' as any)
    .insert({
      owner_entity_id: body.owner_entity_id,
      owned_entity_id: body.owned_entity_id,
      equity_pct:      body.equity_pct ?? 0,
      notes:           body.notes      || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505')
      throw createError({ statusCode: 409, statusMessage: 'This entity interest already exists' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data
})
