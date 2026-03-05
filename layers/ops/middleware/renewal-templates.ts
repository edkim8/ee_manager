/**
 * Middleware: renewal-templates
 *
 * Allows access to the Renewal Letter Templates page for:
 *  - Super admins (is_super_admin flag)
 *  - Users with the 'Asset' property role on any property
 *  - Users with the 'Manager' property role on any property
 *
 * All other authenticated users are redirected to /.
 */
import { defineNuxtRouteMiddleware, useSupabaseClient, navigateTo } from '#imports'

const ALLOWED_ROLES = ['Asset', 'RPM', 'Manager'] as const

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return navigateTo('/auth/login')

  // Super admin always allowed
  if (user.user_metadata?.is_super_admin === true) return

  // Fallback: check profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_super_admin === true) return

  // Check for Asset, RPM, or Manager role on any property
  const { data: accessData } = await supabase
    .from('user_property_access' as any)
    .select('role')
    .eq('user_id', user.id)

  const hasAllowedRole = (accessData || []).some((a: any) =>
    (ALLOWED_ROLES as readonly string[]).includes(a.role)
  )
  if (hasAllowedRole) return

  return navigateTo('/')
})
