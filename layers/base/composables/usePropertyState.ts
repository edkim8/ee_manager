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

  // --- Context Override (super admin debug tool) ---
  const contextOverrideCookie = useCookie<{ dept: string | null; role: string | null } | null>('context-override', {
    maxAge: 60 * 60 * 24, // 1 day — intentionally short for a debug tool
    sameSite: 'lax',
  })

  const contextOverride = useState<{ dept: string | null; role: string | null }>('context-override', () =>
    contextOverrideCookie.value || { dept: null, role: null }
  )

  watch(contextOverride, (newVal) => {
    // Clear cookie when both fields are null; otherwise persist
    contextOverrideCookie.value = (newVal.dept || newVal.role) ? newVal : null
  }, { deep: true })

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

  // Role hierarchy for downshift filtering (highest → lowest)
  const ROLE_HIERARCHY = ['Owner', 'Asset', 'RPM', 'Manager', 'Staff'] as const

  // Roles available to downshift to: ranked BELOW the user's real role for the active
  // property. Always reads me.value (unpatched) so the current override never
  // influences what options are available.
  const availableDownshiftRoles = computed<string[]>(() => {
    if (!me.value) return []
    const actualRole = activeProperty.value
      ? (me.value.access.property_roles[activeProperty.value] ?? '')
      : ''
    const idx = ROLE_HIERARCHY.indexOf(actualRole as any)
    // Unknown role → show all; otherwise only ranks strictly below current
    return idx === -1
      ? [...ROLE_HIERARCHY]
      : (ROLE_HIERARCHY.slice(idx + 1) as unknown as string[])
  })

  // True when this user has at least one role to downshift to (eligibility gate)
  const canUseDevTools = computed(() =>
    !!(me.value && availableDownshiftRoles.value.length > 0)
  )

  // 6. Derived State - User Context with optional override patching
  // Eligible users: super admins AND any role with valid downshift options (Asset, RPM, Manager)
  const userContext = computed(() => {
    if (!me.value) return null

    const base = {
      ...me.value.user,
      access: me.value.access,
    }

    const { dept, role } = contextOverride.value
    if (!dept && !role) return base

    // Must have downshift options to be eligible for impersonation
    if (availableDownshiftRoles.value.length === 0) return base

    // Anti-upshift guard for non-admins: the requested role must exist in their
    // valid downshift list. Silently ignore invalid requests.
    if (role && !me.value.access.is_super_admin) {
      if (!availableDownshiftRoles.value.includes(role)) return base
    }

    // Deep-clone the mutable parts to avoid poisoning the cached API response
    const patchedPropertyRoles = { ...base.access.property_roles }
    if (role && activeProperty.value) {
      patchedPropertyRoles[activeProperty.value] = role
    }

    // If impersonating a non-Owner role, suppress is_super_admin so the Admin
    // menu and other admin-gated UI disappears as expected
    const patchedIsSuperAdmin = (!role || role === 'Owner')
      ? base.access.is_super_admin
      : false

    return {
      ...base,
      profile: dept ? { ...base.profile, department: dept } : base.profile,
      access: {
        ...base.access,
        is_super_admin: patchedIsSuperAdmin,
        property_roles: patchedPropertyRoles,
      },
    }
  })

  // 7. Derived State - Property Options
  const propertyOptions = computed(() => {
    if (!me.value) return []
    const access = me.value.access
    const allProps = me.value.properties
    const filtered = (allProps || []).filter((p: any) => !!access.property_roles[p.code])
    
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

  /**
   * Apply a context override. Available to any user with valid downshift options.
   * Non-admins are silently blocked from requesting roles above their own.
   */
  const setOverride = (dept: string | null, role: string | null) => {
    if (!canUseDevTools.value) return
    // Anti-upshift: non-admins may only request roles in their downshift list
    if (role && !me.value?.access?.is_super_admin) {
      if (!availableDownshiftRoles.value.includes(role)) return
    }
    contextOverride.value = { dept, role }
  }

  /** Remove all active overrides and clear the cookie. */
  const clearOverride = () => {
    contextOverride.value = { dept: null, role: null }
    contextOverrideCookie.value = null
  }

  return {
    activeProperty,
    propertyOptions, // Still reactive, but derived
    userContext,     // Still reactive, but derived
    contextOverride,
    availableDownshiftRoles,
    canUseDevTools,
    fetchProperties,
    setProperty,
    resetProperty,
    setOverride,
    clearOverride,
  }
}
