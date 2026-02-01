import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { user_id, property_code, role } = body

  if (!user_id || !property_code || !role) {
    throw createError({
      statusCode: 400,
      message: 'user_id, property_code, and role are required'
    })
  }

  const client = serverSupabaseServiceRole(event)

  // Insert or Upsert into user_property_access
  const { data, error } = await client
    .from('user_property_access')
    .upsert({
      user_id,
      property_code,
      role
    })
    .select()
    .single()

  if (error) {
    console.error('[API Access Grant] Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return { success: true, data }
})
