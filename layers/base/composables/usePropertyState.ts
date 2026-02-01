import { ref, watch } from 'vue'
import { useSupabaseClient, useSupabaseUser, useState, useCookie, useFetch } from '#imports'

export const usePropertyState = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  // 1. Persistent State (Cookie)
  const activePropertyCookie = useCookie<string | null>('selected-property', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    default: () => null
  })

  // 2. Runtime State
  const activeProperty = useState<string | null>('active-property', () => activePropertyCookie.value)
  const propertyOptions = useState<{ label: string; value: string }[]>('property-options', () => [])

  // 3. User Context (Profile + Permissions)
  const userContext = useState<any>('user-context', () => null)

  // 4. Sync state to cookie
  watch(activeProperty, (newVal: any) => {
    console.log('[usePropertyState] State changed -> updating cookie:', newVal)
    activePropertyCookie.value = newVal
  })

  // 5. Fetch Properties & Context
  const fetchProperties = async () => {
    if (!user.value) {
      console.warn('[usePropertyState] No user found, skipping fetch')
      return
    }

    try {
      console.log('[usePropertyState] Fetching user context and properties from /api/me...')
      
      const data: any = await $fetch('/api/me')
      
      if (!data) {
        console.warn('[usePropertyState] No data returned from /api/me')
        return
      }

      userContext.value = data.user
      const access = data.access
      const allProps = data.properties

      // Filter properties by allowed codes from the server
      const filtered = (allProps || []).filter((p: any) => access.allowed_codes.includes(p.code))
      console.log(`[usePropertyState] Found ${filtered.length} accessible properties`)

      if (filtered.length > 0) {
        const newOptions = filtered.map((p: any) => ({
          label: `${p.code} - ${p.name}`,
          value: p.code
        }))
        
        propertyOptions.value = newOptions
        console.log('[usePropertyState] Updated propertyOptions:', newOptions.map(o => o.value))

        // Auto-select logic
        const currentVal = activeProperty.value || activePropertyCookie.value
        const isValid = newOptions.some(o => o.value === currentVal)
        
        console.log(`[usePropertyState] State: "${activeProperty.value}", Cookie: "${activePropertyCookie.value}", isValid: ${isValid}`)

        if (!currentVal || !isValid) {
          console.log('[usePropertyState] Selection invalid or missing. Defaulting to:', newOptions[0].value)
          activeProperty.value = newOptions[0].value
        } else if (activeProperty.value !== currentVal) {
          console.log('[usePropertyState] Restoring selection from cookie:', currentVal)
          activeProperty.value = currentVal
        } else {
          console.log('[usePropertyState] Maintaining current valid selection:', currentVal)
        }
      } else {
        console.warn('[usePropertyState] No properties matched for user')
        propertyOptions.value = []
        activeProperty.value = null
      }
    } catch (error) {
      console.error('[usePropertyState] Critical context fetch error:', error)
    }
  }

  // 6. Select Property
  const setProperty = (code: string) => {
    activeProperty.value = code
  }

  // 7. Reset
  const resetProperty = () => {
    activeProperty.value = null
    userContext.value = null
    propertyOptions.value = []
  }

  return {
    activeProperty,
    propertyOptions,
    userContext,
    fetchProperties,
    setProperty,
    resetProperty
  }
}
