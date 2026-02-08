import { defineNuxtRouteMiddleware, useSupabaseClient, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  
  // Use getUser() instead of useSupabaseUser() for more reliable async check in middleware
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // 1. Check if user is authenticated
  if (authError || !user) {
    console.warn('[Admin Middleware] Unauthorized - No session found')
    return navigateTo('/auth/login')
  }

  // 2. Check for super admin status in user metadata
  const isSuperAdminMeta = user.user_metadata?.is_super_admin === true

  if (isSuperAdminMeta) {
    return // Allow access
  }

  // 3. Fallback: Check profiles table for is_super_admin
  // Use service role if needed? No, the user should be able to read their own profile via RLS.
  // However, we can use the .single() and check for data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[Admin Middleware] Profile fetch error:', profileError)
  }

  if (profile?.is_super_admin === true) {
    return // Allow access
  }

  // 4. Not a super admin - redirect to home
  console.warn('[Admin Middleware] Forbidden - User is not a super admin')
  return navigateTo('/')
})
