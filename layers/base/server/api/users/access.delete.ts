import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id as string

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Access ID is required'
    })
  }

  const client = serverSupabaseServiceRole(event)

  const { error } = await client
    .from('user_property_access')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[API Access Revoke] Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return { success: true }
})
