import { defineNuxtRouteMiddleware, useSupabaseClient, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  
  // Use getUser() for a reliable async auth check on both client and server
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[Auth Middleware] Unauthorized - Redirecting to login')
    return navigateTo('/auth/login')
  }
})
