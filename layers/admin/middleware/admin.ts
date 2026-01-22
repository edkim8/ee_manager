export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  // First check if user is authenticated
  if (!user.value) {
    return navigateTo('/auth/login')
  }

  // Check for super admin status in user metadata
  const isSuperAdminMeta = user.value.user_metadata?.is_super_admin === true

  if (isSuperAdminMeta) {
    return // Allow access
  }

  // Fallback: Check profiles table for is_super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.value.id)
    .single()

  if (profile?.is_super_admin === true) {
    return // Allow access
  }

  // Not a super admin - redirect to home with error
  return navigateTo('/')
})
