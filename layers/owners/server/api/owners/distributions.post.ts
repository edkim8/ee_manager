import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { owner_id, property_id, title, amount, distribution_date, type, status, notes } = body

  if (!owner_id)          throw createError({ statusCode: 400, statusMessage: 'owner_id is required' })
  if (amount === undefined || amount === null) throw createError({ statusCode: 400, statusMessage: 'amount is required' })
  if (!distribution_date) throw createError({ statusCode: 400, statusMessage: 'distribution_date is required' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('distributions' as any)
    .insert({
      owner_id,
      property_id:       property_id || null,
      title:             title       || null,
      amount:            Number(amount),
      distribution_date,
      type:              type        || null,
      status:            status      || 'Processed',
      notes:             notes       || null,
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
