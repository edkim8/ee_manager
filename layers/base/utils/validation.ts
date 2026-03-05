/**
 * Pure validation logic for barcodes and asset tags.
 * No dependencies on Nuxt, #imports, or Supabase.
 */

/**
 * Validates if a string is a valid EE Asset Tag.
 * Pattern: [PROPERTY]-[CATEGORY]-[ID]
 * Example: EE-AP-1234
 */
export function isValidAssetTag(tag: string | null | undefined): boolean {
  if (!tag) return false
  const regex = /^EE-[A-Z]{2,}-\d{3,6}$/i
  return regex.test(tag.trim())
}

/**
 * Sanitizes and validates a barcode value from the scanner.
 * Ensures it's not empty and meets basic barcode criteria.
 */
export function isSanitizedBarcode(barcode: string | null | undefined): boolean {
  if (!barcode) return false
  const sanitized = barcode.trim()
  return sanitized.length >= 4 && /^[A-Z0-9-]+$/i.test(sanitized)
}
