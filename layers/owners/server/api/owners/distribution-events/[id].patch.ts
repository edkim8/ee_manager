import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  const client = serverSupabaseServiceRole(event)

  const patch: Record<string, any> = {}
  if (body.title             !== undefined) patch.title             = body.title
  if (body.distribution_date !== undefined) patch.distribution_date = body.distribution_date
  if (body.total_amount      !== undefined) patch.total_amount      = Number(body.total_amount)
  if (body.type              !== undefined) patch.type              = body.type || null
  if (body.status            !== undefined) patch.status            = body.status
  if (body.notes             !== undefined) patch.notes             = body.notes || null

  const { error } = await client
    .from('distribution_events' as any)
    .update(patch)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
