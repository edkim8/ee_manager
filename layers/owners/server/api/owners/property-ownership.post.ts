import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)

  if (!body?.entity_id)   throw createError({ statusCode: 400, statusMessage: 'entity_id is required' })
  if (!body?.property_id) throw createError({ statusCode: 400, statusMessage: 'property_id is required' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('entity_property_ownership' as any)
    .insert({
      entity_id:   body.entity_id,
      property_id: body.property_id,
      equity_pct:  body.equity_pct  ?? 0,
      notes:       body.notes       || null,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
