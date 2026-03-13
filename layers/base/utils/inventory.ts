/**
 * Pure inventory management logic.
 * No dependencies on Nuxt, #imports, or Supabase.
 */

/**
 * Formats a pre-printed Asset Tag from its two components.
 * Pattern: [PROPERTY]-[6-digit sequence]
 * Example: SB-000001, CV-000452
 *
 * @param propertyCode - 2-char property code, e.g. 'SB', 'CV', 'WO'
 * @param sequence - sequential number (will be zero-padded to 6 digits)
 * @returns Formatted Asset Tag
 */
export function formatAssetTag(propertyCode: string, sequence: number): string {
  const p = propertyCode.toUpperCase().trim()
  const seq = String(sequence).padStart(6, '0')
  return `${p}-${seq}`
}

/**
 * Generates a placeholder Asset Tag for testing or UI previews.
 */
export function generatePlaceholderTag(): string {
  return 'XX-000000'
}
