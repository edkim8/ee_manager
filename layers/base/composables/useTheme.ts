/**
 * useTheme — App-wide color theme switcher
 *
 * 12 themes: Default · Named (1) · Sports (4) · Standard Tailwind (6)
 *
 * HOW COLORS WORK IN NUXT UI v3 + TAILWIND v4
 * ─────────────────────────────────────────────
 * Nuxt UI's colors.js plugin generates a reactive <style> tag via useHead():
 *
 *   @layer theme {
 *     :root, :host {
 *       --ui-color-primary-50:  var(--color-{name}-50,  <fallback>);
 *       --ui-color-primary-500: var(--color-{name}-500, <fallback>);
 *       ...
 *     }
 *     :root, .light { --ui-primary: var(--ui-color-primary-500); }
 *     .dark          { --ui-primary: var(--ui-color-primary-400); }
 *   }
 *
 * For built-in Tailwind names (sky, blue, violet…) the fallbacks are real hex
 * values, so the color applies immediately.
 *
 * For custom names (padres, diamondbacks…) the fallback is empty (""), so Nuxt
 * UI silently produces no color. The fix: set --ui-color-primary-* directly as
 * INLINE STYLES on <html>. Inline styles beat @layer rules in the cascade, so
 * they win regardless of when Nuxt UI's reactive <style> tag updates.
 *
 * For built-in themes we remove the inline overrides and let Nuxt UI take over.
 */

import { computed } from 'vue'
import { useState, useAppConfig } from '#imports'

export interface ThemeOption {
  id: string
  label: string
  swatch: string    // Primary display color (hex)
  swatch2?: string  // Optional secondary color for split swatch preview
}

export const THEMES: ThemeOption[] = [
  // ── Default ──────────────────────────────────────────────────────────────
  { id: 'sky',          label: 'Default',      swatch: '#0ea5e9' },
  // ── Named ────────────────────────────────────────────────────────────────
  { id: 'violet',       label: 'Madeline',     swatch: '#7c3aed' },
  // ── Sports ───────────────────────────────────────────────────────────────
  { id: 'padres',       label: 'Padres',       swatch: '#FFC425', swatch2: '#2F241D' },
  { id: 'diamondbacks', label: 'DiamondBacks', swatch: '#A71930', swatch2: '#E3D4AD' },
  { id: 'lilywhites',   label: 'Lilywhites',   swatch: '#132257' },
  { id: 'messi',        label: 'Messi',        swatch: '#EF3B5D', swatch2: '#f7b5cd' },
  // ── Standard Tailwind ────────────────────────────────────────────────────
  { id: 'blue',         label: 'Blue',         swatch: '#3b82f6' },
  { id: 'indigo',       label: 'Indigo',       swatch: '#6366f1' },
  { id: 'emerald',      label: 'Emerald',      swatch: '#10b981' },
  { id: 'rose',         label: 'Rose',         swatch: '#f43f5e' },
  { id: 'amber',        label: 'Amber',        swatch: '#f59e0b' },
  { id: 'teal',         label: 'Teal',         swatch: '#14b8a6' },
]

// ── Custom palette hex values ─────────────────────────────────────────────
// Mirror of app/assets/css/main.css @theme block.
// Used to inject --ui-color-primary-* as inline styles so they override
// Nuxt UI's @layer theme rules (which can't resolve unknown color names).
const CUSTOM_PALETTES: Record<string, Record<number, string>> = {
  padres: {
    50: '#FFFBEB', 100: '#FFF3C4', 200: '#FFE680', 300: '#FFD43B',
    400: '#FFCA2E', 500: '#FFC425', 600: '#D4A01E', 700: '#A97D17',
    800: '#7E5C11', 900: '#52390A', 950: '#2F241D',
  },
  diamondbacks: {
    50: '#FFF1F3', 100: '#FFE0E5', 200: '#FFC1CA', 300: '#FF8D9C',
    400: '#F55A70', 500: '#DE3050', 600: '#A71930', 700: '#8C1527',
    800: '#721221', 900: '#5C0E1A', 950: '#3D0810',
  },
  lilywhites: {
    50: '#EEF1F9', 100: '#D5DBF0', 200: '#AAB6E0', 300: '#7F91D0',
    400: '#546DBF', 500: '#3A52A9', 600: '#2E4394', 700: '#213379',
    800: '#132257', 900: '#0E1B46', 950: '#070E24',
  },
  messi: {
    50: '#FFF0F5', 100: '#FFD9E9', 200: '#F7B5CD', 300: '#F385AE',
    400: '#F05F8C', 500: '#EF3B5D', 600: '#D42B4A', 700: '#B01E39',
    800: '#8C152B', 900: '#6A0E1F', 950: '#231F20',
  },
}

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const STORAGE_KEY = 'ee-color-theme'

/**
 * Set --ui-color-primary-* as inline styles on <html>.
 * Inline styles override @layer rules → always wins, no timing issues.
 * Pass an empty/unknown id to CLEAR the overrides (built-in themes).
 */
function applyInlinePalette(themeId: string): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const palette = CUSTOM_PALETTES[themeId]

  if (palette) {
    SHADES.forEach(shade => {
      root.style.setProperty(`--ui-color-primary-${shade}`, palette[shade])
    })
  } else {
    // Remove overrides → Nuxt UI's generated <style> tag takes over
    SHADES.forEach(shade => {
      root.style.removeProperty(`--ui-color-primary-${shade}`)
    })
  }
}

const STORAGE_KEY_CONST = STORAGE_KEY

export function useTheme() {
  const currentThemeId = useState<string>('ee-theme-id', () => 'sky')
  const appConfig = useAppConfig()

  const setTheme = (themeId: string) => {
    if (!THEMES.find(t => t.id === themeId)) return
    currentThemeId.value = themeId

    // Always update appConfig so Nuxt UI's reactive plugin runs and generates
    // its <style> tag (needed for built-in themes; harmless for custom ones).
    appConfig.ui.colors = { ...appConfig.ui.colors, primary: themeId }

    // For custom palettes: override --ui-color-primary-* with inline styles.
    // For built-in themes: clear overrides so Nuxt UI's generated CSS takes over.
    applyInlinePalette(themeId)

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CONST, themeId)
    }
  }

  /** Restore saved theme on client mount. */
  const initTheme = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CONST)
      if (saved && THEMES.find(t => t.id === saved)) {
        setTheme(saved)
      }
    }
  }

  const currentTheme = computed(
    () => THEMES.find(t => t.id === currentThemeId.value) ?? THEMES[0]
  )

  return { THEMES, currentThemeId, currentTheme, setTheme, initTheme }
}
