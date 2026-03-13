/**
 * Pure validation logic for barcodes and asset tags.
 * No dependencies on Nuxt, #imports, or Supabase.
 */

/**
 * Validates if a string is a valid pre-printed Asset Tag.
 * Format: [2-char property code]-[6-digit sequence]
 * Example: SB-000001, WO-000042, CV-000452
 */
export function isValidAssetTag(tag: string | null | undefined): boolean {
  if (!tag) return false
  const regex = /^[A-Z]{2}-\d{6}$/i
  return regex.test(tag.trim())
}

/**
 * Sanitizes and validates a barcode value from the scanner.
 * Accepts any non-empty string of uppercase letters, digits, and hyphens.
 * Valid asset tags (e.g. SB-000001) pass this check automatically.
 */
export function isSanitizedBarcode(barcode: string | null | undefined): boolean {
  if (!barcode) return false
  const sanitized = barcode.trim()
  return sanitized.length >= 4 && /^[A-Z0-9-]+$/i.test(sanitized)
}
