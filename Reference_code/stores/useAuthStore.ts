export const useAuthStore = defineStore('auth', () => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  
  // Use cookie for profile persistence to prevent hydration mismatch/flash
  const profileCookie = useCookie('user-profile', {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax'
  })
  
  // Use cookie for active property persistence
  const activePropertyCookie = useCookie('active-property', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax'
  })

  const profile = ref(profileCookie.value || null)
  const access_list = ref([])
  const active_property = ref(activePropertyCookie.value || null)
  
  // Watch active_property to update cookie
  watch(active_property, (newVal) => {
    if (newVal) {
      activePropertyCookie.value = newVal
    }
  })
  
  const fetchSession = async () => {
    if (!user.value) {
      console.log('[AuthStore] No user value')
      return
    }
    
    // Support both id and sub (JWT payload)
    const userId = user.value.id || user.value.sub
    
    if (!userId) {
      console.error('[AuthStore] User exists but has no ID or SUB:', user.value)
      return
    }
    
    console.log('[AuthStore] Fetching session for user:', userId)
    
    // Fetch Profile
    const { data: profileData, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (profileError) {
      console.error('[AuthStore] Profile fetch error:', profileError)
    } else {
      console.log('[AuthStore] Profile fetched:', profileData)
      // Update cookie and state
      profileCookie.value = profileData
      profile.value = profileData
    }
    
    // Fetch Access List
    const { data: accessData, error: accessError } = await client
      .from('user_property_access')
      .select('*')
      .eq('user_id', userId)
    
    if (accessError) {
      console.error('[AuthStore] Access list fetch error:', accessError)
    } else {
      console.log('[AuthStore] Access list fetched:', accessData)
    }
      
    access_list.value = accessData || []
    
    // Set default active property if none selected or if cookie value is invalid
    const isValidProperty = access_list.value.some(p => p.apt_code === active_property.value)
    
    if ((!active_property.value || !isValidProperty) && access_list.value.length > 0) {
      active_property.value = access_list.value[0].apt_code
    }
  }
  
  // Watch for user changes to hydrate session
  watch(user, async (newUser) => {
    // Check for id or sub
    if (newUser && (newUser.id || newUser.sub)) {
      console.log('[AuthStore] User authenticated, fetching session')
      await fetchSession()
    } else {
      console.log('[AuthStore] User logged out, clearing session')
      profile.value = null
      access_list.value = []
      active_property.value = null
    }
  }, { immediate: true })
  
  return {
    user,
    profile,
    access_list,
    active_property,
    fetchSession
  }
})
