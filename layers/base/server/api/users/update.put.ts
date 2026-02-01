export default defineEventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event) // Use Service Role to allow Admin updates of ANY profile
  const user = await serverSupabaseUser(event)
  const body = await readBody(event)

  // 1. Authorization
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const { user_id, first_name, last_name, department } = body

  if (!user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required'
    })
  }

  // 2. Update Profile
  const { data, error } = await client
    .from('profiles')
    .update({ 
      first_name, 
      last_name, 
      department,
      // Add other fields as needed
    })
    .eq('id', user_id)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return {
    profile: data,
    message: 'Profile updated successfully'
  }
})
