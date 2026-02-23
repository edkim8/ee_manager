import { format, isValid, parse } from 'date-fns'
import { parseDateString } from '../../../layers/base/utils/date-helpers'

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
 * Format date values to strict yyyy-MM-dd format WITHOUT timezone conversion.
 *
 * IMPORTANT: This function treats dates as calendar dates, not timestamps.
 * NO timezone conversion is applied - the date you pass is the date you get.
 *
 * Handles:
 * - Simple date strings: "01/15/2024", "1/5/24" → "2024-01-15"
 * - ISO strings: "2024-01-15" → "2024-01-15" (no change)
 * - Date objects (from Excel) → extracts date in UTC to avoid timezone shift
 * - Excel serial numbers (e.g., 45292 = 2024-01-15)
 * - null/empty values → null
 *
 * For Yardi CSV dates (simple date strings), use this function.
 * It will parse them as calendar dates without timezone conversion.
 */
export function formatDateForDB(value: any): string | null {
  if (!value) return null

  // Handle Excel serial date numbers FIRST (before string conversion)
  if (typeof value === 'number' && value > 0 && value < 100000) {
    // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as leap year
    // Use UTC to avoid timezone issues
    const excelEpoch = Date.UTC(1899, 11, 30) // Dec 30, 1899
    const ms = excelEpoch + (value * 24 * 60 * 60 * 1000)
    const d = new Date(ms)

    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // If Date object, extract date in UTC to avoid timezone shift
  if (value instanceof Date || (typeof value === 'object' && typeof value.getFullYear === 'function')) {
    const d = value instanceof Date ? value : new Date(value)
    if (!isValid(d)) return null

    // Use UTC methods to avoid timezone conversion
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // For string values, use the timezone-agnostic parser
  const str = String(value).trim()
  if (!str) return null

  // Use parseDateString for simple date strings (most common case)
  const parsed = parseDateString(str)
  if (parsed) return parsed

  // Fallback: Handle JS Date.toString() format: "Thu Sep 11 2025 00:00:00 GMT..."
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

  // If it looks like an ISO timestamp (Date object serialized to JSON), extract UTC date
  // e.g. "2026-01-14T00:00:00.000Z" → "2026-01-14"
  if (str.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear()
      const month = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  // Fallback: Try date-fns parsing (for complex formats)
  const formats = [
    'MM/dd/yyyy',   // US: 01/15/2024
    'M/d/yyyy',     // US short: 1/5/2024
    'MM/dd/yy',     // US short year: 01/15/24
    'M/d/yy',       // US minimal: 1/5/24
    'MMMM d, yyyy', // Long: January 15, 2024
    'MMM d, yyyy',  // Short: Jan 15, 2024
  ]

  for (const fmt of formats) {
    try {
      const refDate = new Date(Date.UTC(2000, 0, 1))
      const parsed = parse(str, fmt, refDate)
      if (isValid(parsed)) {
        // Use UTC methods to avoid PST/local-timezone off-by-one day errors
        const year = parsed.getUTCFullYear()
        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
        const day = String(parsed.getUTCDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    } catch {
      // Continue to next format
    }
  }

  return null
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
