import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  const client = serverSupabaseServiceRole(event)

  // Fetch current status before deleting
  const { data: evt, error: fetchError } = await client
    .from('distribution_events' as any)
    .select('status, title')
    .eq('id', id)
    .single()

  if (fetchError || !evt) throw createError({ statusCode: 404, statusMessage: 'Distribution event not found' })

  if (evt.status === 'Complete') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Cannot delete a Complete distribution. All transfers have been confirmed — this record is permanent. Contact your administrator if a correction is needed.',
    })
  }

  // Draft → freely deletable
  // Processing → allowed (admin-only route, some transfers confirmed but not all)
  const { error } = await client
    .from('distribution_events' as any)
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
