/**
 * Extracts apartment/property code from various formats:
 * - "(ABC)" -> "ABC"
 * - "ABC - Property Name" -> "ABC"
 * - "ABC" (raw short code) -> "ABC"
 */
export function getApartmentCode(value: any): string | null {
  if (!value) return null
  const str = String(value).trim()

  // Pattern 1: (CODE) in parentheses
  const parenMatch = str.match(/\((.*?)\)/)
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim().toUpperCase()
  }

  // Pattern 2: "CODE - Description" format
  const dashMatch = str.match(/^([A-Za-z0-9]+)\s*-/)
  if (dashMatch && dashMatch[1]) {
    return dashMatch[1].trim().toUpperCase()
  }

  // Pattern 3: Raw short code (2-6 alphanumeric chars)
  if (/^[A-Za-z0-9]{2,6}$/.test(str)) {
    return str.toUpperCase()
  }

  return null
}

/**
 * Normalizes raw header strings for consistent matching.
 * "Prop. Code" -> "prop_code"
 * "Unit #" -> "unit"
 */
export function normalizeHeader(header: string): string {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}
