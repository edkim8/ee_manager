import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  const body = await readBody(event)

  // 1. Authorization Check (Simple for now: must be logged in, ideally check for 'admin' role)
  // TODO: Add robust role checking once roles are standardized
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const { email, password, first_name, last_name, department, phone, organization_name, is_super_admin } = body

  // 2. Validate input
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required'
    })
  }

  // 3. Create User in Supabase Auth
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for admin-created users
    user_metadata: {
      first_name,
      last_name,
      department,
      phone,
      organization_name,
      is_super_admin: !!is_super_admin
    }
  })

  if (authError) {
    throw createError({
      statusCode: 500,
      statusMessage: authError.message
    })
  }

  // 4. Update Profile with is_super_admin specifically
  // While triggers handle basic creation, we want to ensure the super admin flag is set if requested
  if (is_super_admin) {
    const { error: profileError } = await client
      .from('profiles')
      .update({ is_super_admin: true })
      .eq('id', authData.user.id)
    
    if (profileError) {
      console.warn('[API /api/users/create] Failed to set super admin flag:', profileError)
    }
  }

  return {
    user: authData.user,
    message: 'User created and confirmed successfully'
  }
})
