import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('ownership_entities' as any)
    .select('*')
    .order('name')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data || []
})
