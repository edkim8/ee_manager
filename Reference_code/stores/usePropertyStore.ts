import { defineStore } from 'pinia'

export const usePropertyStore = defineStore('property', () => {
  const authStore = useAuthStore()
  
  // Cookie for persistence (30 days)
  const selectedPropertyCookie = useCookie<string | null>('selected-property', {
    default: () => null,
    watch: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax'
  })
  
  // Reactive state
  const selectedProperty = ref<string | null>(selectedPropertyCookie.value)
  
  // Sync to cookie
  watch(selectedProperty, (newVal) => {
    selectedPropertyCookie.value = newVal
  })
  
  // Auto-select from access list
  watchEffect(() => {
    const { access_list } = authStore
    
    if (access_list && access_list.length > 0) {
      // If current selection is valid, keep it
      const isValid = access_list.some(a => a.apt_code === selectedProperty.value)
      
      if (isValid) return
      
      // Otherwise, select first property
      selectedProperty.value = access_list[0].apt_code
    } else {
      selectedProperty.value = null
    }
  })
  
  // Get full access details for selected property
  const selectedPropertyAccess = computed(() => {
    if (!selectedProperty.value) return null
    return authStore.access_list.find(a => a.apt_code === selectedProperty.value)
  })
  
  return {
    selectedProperty,
    selectedPropertyAccess
  }
}, {
  persist: true
})
