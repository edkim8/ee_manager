/**
 * colorUtils.ts
 *
 * Availability status color utilities.
 * app_constants stores hex codes (e.g. #F01C1C) directly as the source of truth.
 * These helpers validate and resolve hex values with safe fallbacks.
 */

/**
 * Returns true if the value looks like a valid CSS hex color (#rgb, #rrggbb, etc.)
 */
export const isValidHex = (val: unknown): boolean => {
  if (!val) return false
  return /^#[0-9A-Fa-f]{3,8}$/.test(String(val).trim())
}

/**
 * Resolves a color value to a hex code.
 * - If value is a valid hex string (starts with #) → return it
 * - Otherwise → return defaultHex
 *
 * Note: legacy word-based values ("red", "pink", etc.) are treated as
 * invalid and will fall through to the defaultHex. Run migration
 * 20260314000002 to upgrade production constants to hex before deploying.
 */
export const getColorCode = (value: unknown, defaultHex: string): string => {
  if (value === undefined || value === null || value === '') return defaultHex
  const str = String(value).trim()
  if (str.startsWith('#')) return str
  return defaultHex
}
