/**
 * Pure inventory management logic.
 * No dependencies on Nuxt, #imports, or Supabase.
 */

/**
 * Formats a new asset tag based on property, item category, and serial/id.
 * Pattern: EE-[PROP]-[CAT]-[SERIAL]
 * Example: EE-AP-HV-101
 * 
 * @param propertyCode - e.g. 'CV', 'AP', 'RS'
 * @param categoryCode - e.g. 'HVAC' -> 'HV', 'APPL' -> 'AP'
 * @param identifier - e.g. '101', 'SN1234'
 * @returns Formatted Asset Tag
 */
export function formatAssetTag(
  propertyCode: string,
  categoryCode: string,
  identifier: string
): string {
  const p = propertyCode.toUpperCase().trim()
  const c = categoryCode.toUpperCase().trim()
  const i = identifier.toUpperCase().trim()
  
  return `EE-${p}-${c}-${i}`
}

/**
 * Generates a mock Asset Tag for testing or placeholders.
 */
export function generatePlaceholderTag(): string {
  const randomId = Math.floor(1000 + Math.random() * 9000)
  return `EE-XX-YY-${randomId}`
}
