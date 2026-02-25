import { defineNuxtRouteMiddleware, useSupabaseClient, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return navigateTo('/auth/login')
  }

  // Super admin always allowed
  if (user.user_metadata?.is_super_admin === true) return

  // Check profiles table for super_admin or Asset role
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_super_admin === true) return

  // Check for Asset role on any property
  const { data: accessData } = await supabase
    .from('user_property_access' as any)
    .select('role')
    .eq('user_id', user.id)

  const hasAssetRole = (accessData || []).some((a: any) => a.role === 'Asset')
  if (hasAssetRole) return

  return navigateTo('/')
})
