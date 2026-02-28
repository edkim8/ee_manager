import { computed, watch } from 'vue'
import { useCookie, useState, useRequestHeaders } from '#imports'

export type AppMode = 'web' | 'app' | 'tour'

// Phone: narrow mobile devices
const PHONE_UA_REGEX = /iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS/i
// Tablet: wide touch devices
const TABLET_UA_REGEX = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Kindle|Silk|Maestro/i

export const useAppMode = () => {
  // Capture User-Agent at composable call time (setup context) for SSR
  const headers = useRequestHeaders(['user-agent'])
  const serverUA = headers['user-agent'] || ''

  // Persistent state via cookie (1 year)
  const appModeCookie = useCookie<AppMode>('app-mode', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // Runtime state, initialized from cookie
  const appMode = useState<AppMode>('app-mode', () => appModeCookie.value || 'web')

  // Keep cookie in sync when state changes
  watch(appMode, (newVal) => {
    appModeCookie.value = newVal
  })

  // SSR-safe UA detection helpers
  const _getUA = () => import.meta.server
    ? serverUA
    : (typeof navigator !== 'undefined' ? navigator.userAgent : '')

  const isPhoneDevice = computed<boolean>(() => {
    return PHONE_UA_REGEX.test(_getUA())
  })

  const isTabletDevice = computed<boolean>(() => {
    const ua = _getUA()
    if (TABLET_UA_REGEX.test(ua)) return true
    // iPadOS reports as Macintosh — detect via touch points (client only)
    if (import.meta.client && navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true
    return false
  })

  // Backward-compat: phone OR tablet
  const isMobileDevice = computed(() => isPhoneDevice.value || isTabletDevice.value)

  const isAppMode  = computed(() => appMode.value === 'app')
  const isTourMode = computed(() => appMode.value === 'tour')
  const isWebMode  = computed(() => appMode.value === 'web')

  const setMode = (mode: AppMode) => {
    appMode.value = mode
    appModeCookie.value = mode
  }

  /**
   * Toggle between web and device-appropriate mode.
   * Web → tablet: tour mode at /tour/dashboard
   * Web → phone:  app mode  at /mobile/dashboard
   * Any other → web at /
   */
  const toggleMode = () => {
    if (isWebMode.value) {
      const target = isTabletDevice.value ? 'tour' : 'app'
      setMode(target)
      if (import.meta.client)
        window.location.href = target === 'tour' ? '/tour/dashboard' : '/mobile/dashboard'
    } else {
      setMode('web')
      if (import.meta.client) window.location.href = '/'
    }
  }

  return {
    appMode,
    isMobileDevice,
    isPhoneDevice,
    isTabletDevice,
    isAppMode,
    isTourMode,
    isWebMode,
    toggleMode,
    setMode,
  }
}
