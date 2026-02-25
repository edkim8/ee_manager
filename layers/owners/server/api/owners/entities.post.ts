import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)

  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Entity name is required' })
  }

  const { id: _id, created_at: _created, updated_at: _updated, ...fields } = body

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('ownership_entities' as any)
    .insert({ ...fields })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
