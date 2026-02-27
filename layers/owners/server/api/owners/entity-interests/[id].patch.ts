import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('entity_entity_ownership' as any)
    .update({
      equity_pct: body.equity_pct ?? 0,
      notes:      body.notes      || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
