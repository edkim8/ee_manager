import { computed } from 'vue'
import { useCookie, useState } from '#imports'

const STORAGE_KEY = 'ee-manager-layout-width'

export function useLayoutWidth() {
  // Use a cookie to persist the preference. 
  // This allows the server to read the preference and render the correct width immediately.
  const layoutWidthCookie = useCookie<'standard' | 'wide'>(STORAGE_KEY, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    default: () => 'standard',
    sameSite: 'lax'
  })

  // We use useState to share the reactive state across components, 
  // initialized from the cookie (which is available on both server and client).
  const layoutWidth = useState<'standard' | 'wide'>('layout-width-state', () => layoutWidthCookie.value || 'standard')

  const isWide = computed(() => layoutWidth.value === 'wide')

  const toggleWidth = () => {
    const newVal = layoutWidth.value === 'standard' ? 'wide' : 'standard'
    layoutWidth.value = newVal
    layoutWidthCookie.value = newVal
  }

  const setWidth = (width: 'standard' | 'wide') => {
    layoutWidth.value = width
    layoutWidthCookie.value = width
  }

  return {
    layoutWidth,
    isWide,
    toggleWidth,
    setWidth,
  }
}
