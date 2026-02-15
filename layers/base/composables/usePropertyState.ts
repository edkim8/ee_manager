import { ref, watch, computed } from 'vue'
import { useSupabaseClient, useSupabaseUser, useState, useCookie, useFetch, useRequestFetch, useAsyncData } from '#imports'

export const usePropertyState = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  // 1. Persistent State (Cookie)
  const activePropertyCookie = useCookie<string | null>('selected-property', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    default: () => null
  })

  // 2. Runtime State - Initialize from cookie immediately
  const activeProperty = useState<string | null>('active-property', () => {
    return activePropertyCookie.value
  })
  // 4. Sync state to cookie
  watch(activeProperty, (newVal: any) => {
    activePropertyCookie.value = newVal
  })

  // 5. SSR-friendly Fetch
  // We use useAsyncData to fetch the user context. This is awaited on the server.
  const { data: me, refresh: fetchProperties } = useAsyncData('user-me-context', async () => {
    if (!user.value) return null
    try {
      const fetchWithContext = useRequestFetch()
      return await fetchWithContext('/api/me')
    } catch (e) {
      console.error('[usePropertyState] API Error:', e)
      return null
    }
  }, {
    watch: [user],
    immediate: true
  })

  // 6. Derived State - User Context
  // Instead of a separate useState + watch, we compute this directly from 'me'
  // This ensures that as soon as 'me' is hydrated from the server, userContext is ready.
  const userContext = computed(() => {
    if (!me.value) return null
    return {
      ...me.value.user,
      access: me.value.access
    }
  })

  // 7. Derived State - Property Options
  const propertyOptions = computed(() => {
    if (!me.value) return []
    const access = me.value.access
    const allProps = me.value.properties
    const filtered = (allProps || []).filter((p: any) => access.allowed_codes.includes(p.code))
    
    return filtered.map((p: any) => ({
      label: `${p.code} - ${p.name}`,
      value: p.code
    }))
  })

  // 8. Auto-select logic moved to a watch, but the options themselves are stable
  // IMPORTANT: Don't overwrite property from cookie until options are loaded and validated
  watch(propertyOptions, (newOptions) => {
    if (newOptions.length > 0) {
      // Options are loaded, now validate and set property
      const currentVal = activeProperty.value || activePropertyCookie.value
      const isValid = newOptions.some((o: any) => o.value === currentVal)

      if (!currentVal || !isValid) {
        // No valid property, select first option
        activeProperty.value = newOptions[0].value
      } else if (activeProperty.value !== currentVal) {
        // Property from cookie is valid, ensure it's set
        activeProperty.value = currentVal
      }
    }
    // Don't set to null when options are empty - preserve cookie value until validated
    // This prevents race conditions on page load/reload
  }, { immediate: true })

  // 9. Methods
  const setProperty = (code: string) => {
    activeProperty.value = code
  }

  const resetProperty = () => {
    activeProperty.value = null
    activePropertyCookie.value = null
    me.value = null
  }

  return {
    activeProperty,
    propertyOptions, // Still reactive, but derived
    userContext,     // Still reactive, but derived
    fetchProperties,
    setProperty,
    resetProperty
  }
}
