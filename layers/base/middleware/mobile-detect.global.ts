import { defineNuxtRouteMiddleware, useCookie, navigateTo, useRequestHeaders } from '#imports'

const PHONE_UA_REGEX = /iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS/i
const TABLET_UA_REGEX = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Kindle|Silk|Maestro/i

export default defineNuxtRouteMiddleware((to) => {
  // Never interfere with auth pages
  if (to.path.startsWith('/auth')) {
    return
  }

  const appModeCookie = useCookie<string>('app-mode')
  const mode = appModeCookie.value

  // Rule 0a: web mode + /mobile/ path → redirect home
  if (mode === 'web' && to.path.startsWith('/mobile')) {
    return navigateTo('/')
  }

  // Rule 0b: web mode + /tour/ path → redirect home
  if (mode === 'web' && to.path.startsWith('/tour')) {
    return navigateTo('/')
  }

  // Rule 0c: app mode + /tour/ path → redirect to app home
  if (mode === 'app' && to.path.startsWith('/tour')) {
    return navigateTo('/mobile/dashboard')
  }

  // Rule 0d: tour mode + /mobile/ path → redirect to tour home
  if (mode === 'tour' && to.path.startsWith('/mobile')) {
    return navigateTo('/tour/dashboard')
  }

  // SSR-safe UA detection
  let ua = ''
  if (import.meta.server) {
    const headers = useRequestHeaders(['user-agent'])
    ua = headers['user-agent'] || ''
  } else {
    ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  }

  const isPhone  = PHONE_UA_REGEX.test(ua)
  const isTablet = TABLET_UA_REGEX.test(ua)
    || (import.meta.client && navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))

  // Rule 1a: phone UA + no cookie → set 'app', redirect to app dashboard
  if (isPhone && !mode) {
    appModeCookie.value = 'app'
    return navigateTo('/mobile/dashboard')
  }

  // Rule 1b: tablet UA + no cookie → set 'tour', redirect to tour dashboard
  if (isTablet && !mode) {
    appModeCookie.value = 'tour'
    return navigateTo('/tour/dashboard')
  }

  // Rule 2a: app mode + root '/' → redirect to app dashboard
  if (mode === 'app' && to.path === '/') {
    return navigateTo('/mobile/dashboard')
  }

  // Rule 2b: tour mode + root '/' → redirect to tour dashboard
  if (mode === 'tour' && to.path === '/') {
    return navigateTo('/tour/dashboard')
  }
})
