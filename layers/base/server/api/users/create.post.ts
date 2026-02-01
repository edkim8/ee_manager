export default defineEventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event)
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

  const { email, password, first_name, last_name, department, phone, organization_name } = body

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
      organization_name
    }
  })

  if (authError) {
    throw createError({
      statusCode: 500,
      statusMessage: authError.message
    })
  }

  // 4. Ensure Profile exists/updates (Supabase Trigger usually handles this, but we can fast-track or update extras)
  // The trigger on auth.users -> public.profiles might be async or limited.
  // We'll trust the metadata to flow to the trigger, OR updates specifically if needed.
  // For now, let's return the created user.
  
  // Note: If your trigger copies metadata to profile columns, this is sufficient.
  // If not, we might need to manually update the profile record here.

  return {
    user: authData.user,
    message: 'User created successfully'
  }
})
