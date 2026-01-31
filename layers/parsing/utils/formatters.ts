import { format, isValid, parse } from 'date-fns'

/**
 * Yardi ID to Property Code mapping.
 * Used to convert Yardi system IDs (e.g., "azres422") to standard codes (e.g., "RS").
 */
const YARDI_TO_PROPERTY_CODE: Record<string, string> = {
  'azstoran': 'SB',  // Stonebridge
  'azres422': 'RS',  // Residences
  'caoceabr': 'OB',  // Ocean Breeze
  'cacitvie': 'CV',  // City View
  'cawhioak': 'WO',  // Whispering Oaks
}

/**
 * Parse currency strings to numbers.
 * "$1,234.56" → 1234.56
 * "(1,234.56)" → -1234.56 (accounting negative format)
 */
export function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value

  const str = String(value)

  // Handle accounting negative format: (1,234.56) → -1234.56
  const isNegative = str.includes('(') && str.includes(')')

  const clean = str.replace(/[^0-9.-]+/g, '')
  const num = parseFloat(clean)

  if (isNaN(num)) return null
  return isNegative ? -Math.abs(num) : num
}

/**
 * Format date values to strict yyyy-MM-dd format.
 * Strips any time/timezone information.
 *
 * Handles:
 * - Date objects (from Excel)
 * - Date-like objects (with getFullYear method - for Vue reactivity)
 * - JS Date strings ("Thu Sep 11 2025 00:00:00 GMT...")
 * - ISO strings ("2024-01-15T00:00:00.000Z")
 * - US format ("01/15/2024", "1/15/24")
 * - European format ("15/01/2024")
 * - Text dates ("January 15, 2024")
 * - Excel serial numbers (e.g., 45292 = 2024-01-15)
 */
export function formatDateForDB(value: any): string | null {
  if (!value) return null

  // If already a Date object OR date-like object (duck typing for Vue reactivity)
  // Check for getFullYear method to handle objects that lost their Date prototype
  if (value instanceof Date || (typeof value === 'object' && typeof value.getFullYear === 'function')) {
    const d = value instanceof Date ? value : new Date(value)
    if (!isValid(d)) return null
    // Format to yyyy-MM-dd string (strip time)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Handle Excel serial date numbers (days since 1900-01-01)
  if (typeof value === 'number' && value > 0 && value < 100000) {
    // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as leap year
    const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
    const d = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
    if (isValid(d)) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  const str = String(value).trim()
  if (!str) return null

  // Check if already in yyyy-MM-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  // Check for JS Date.toString() format: "Thu Sep 11 2025 00:00:00 GMT..."
  // This happens when Date objects are converted to strings
  const jsDateMatch = str.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/)
  if (jsDateMatch) {
    const monthNames: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    const monthStr = jsDateMatch[1]
    const month = monthNames[monthStr || '']
    const day = String(jsDateMatch[2]).padStart(2, '0')
    const year = jsDateMatch[3]
    if (month && day && year) {
      return `${year}-${month}-${day}`
    }
  }

  // Try parsing as ISO string first
  let d = new Date(str)

  // If invalid, try common date formats
  if (!isValid(d)) {
    const formats = [
      'MM/dd/yyyy',   // US: 01/15/2024
      'M/d/yyyy',     // US short: 1/5/2024
      'MM/dd/yy',     // US short year: 01/15/24
      'M/d/yy',       // US minimal: 1/5/24
      'dd/MM/yyyy',   // EU: 15/01/2024
      'yyyy-MM-dd',   // ISO: 2024-01-15
      'MMMM d, yyyy', // Long: January 15, 2024
      'MMM d, yyyy',  // Short: Jan 15, 2024
    ]

    for (const fmt of formats) {
      try {
        const parsed = parse(str, fmt, new Date())
        if (isValid(parsed)) {
          d = parsed
          break
        }
      } catch {
        // Continue to next format
      }
    }
  }

  if (!isValid(d)) return null

  // Output strict yyyy-MM-dd (no time component)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normalize name format - trim and clean whitespace.
 */
export function normalizeNameFormat(value: any): string {
  if (!value) return ''
  return String(value).trim().replace(/\s+/g, ' ')
}

/**
 * Convert Yardi ID to Property Code.
 * Simple dictionary lookup:
 *   "azstoran" → "SB"
 *   "azres422" → "RS"
 *   "caoceabr" → "OB"
 *   "cacitvie" → "CV"
 *   "cawhioak" → "WO"
 *
 * NOTE: This dictionary is sparse - expand as needed when new properties are added.
 * The lookup is case-insensitive.
 *
 * @returns Property code if found, null if not in dictionary
 */
export function yardiToPropertyCode(value: any): string | null {
  if (!value) return null

  const str = String(value).trim().toLowerCase()
  if (!str) return null

  // Simple dictionary lookup
  const code = YARDI_TO_PROPERTY_CODE[str]
  return code ?? null
}

/**
 * Get all valid property codes (for validation).
 */
export function getValidPropertyCodes(): string[] {
  return Object.values(YARDI_TO_PROPERTY_CODE)
}
