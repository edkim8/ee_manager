/**
 * theme.client.ts — Restore saved color theme on page load
 *
 * Runs only on the client (*.client.ts suffix).
 * Reads localStorage and applies the saved theme before the first render
 * so there is no visible flash of the default (sky) color.
 */

import { defineNuxtPlugin } from '#imports'
import { useTheme } from '../composables/useTheme'

export default defineNuxtPlugin(() => {
  const { initTheme } = useTheme()
  initTheme()
})
