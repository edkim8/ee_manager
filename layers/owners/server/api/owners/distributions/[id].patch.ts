import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)

  const client = serverSupabaseServiceRole(event)

  const patch: Record<string, any> = {}
  if (body.owner_id          !== undefined) patch.owner_id          = body.owner_id
  if (body.property_id       !== undefined) patch.property_id       = body.property_id || null
  if (body.title             !== undefined) patch.title             = body.title        || null
  if (body.amount            !== undefined) patch.amount            = Number(body.amount)
  if (body.distribution_date !== undefined) patch.distribution_date = body.distribution_date
  if (body.type              !== undefined) patch.type              = body.type          || null
  if (body.status            !== undefined) patch.status            = body.status
  if (body.notes             !== undefined) patch.notes             = body.notes         || null

  const { error } = await client
    .from('distributions' as any)
    .update(patch)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
