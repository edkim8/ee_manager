/**
 * Timezone-agnostic date utilities for EE Manager
 *
 * IMPORTANT: All properties are in PST/MST timezones (California and Arizona).
 * Yardi dates are simple date strings (YYYY-MM-DD) without time components.
 * These utilities ensure dates are handled as calendar dates, not timestamps.
 */

/**
 * Get today's date in PST timezone as YYYY-MM-DD string.
 *
 * This is the ONLY function that should be used for "today" comparisons
 * in the Solver engine and anywhere dates are compared.
 *
 * Uses America/Los_Angeles timezone which handles:
 * - PST (UTC-8) during standard time
 * - PDT (UTC-7) during daylight savings
 * - Arizona properties are effectively PST when CA is on PDT
 *
 * @returns Today's date in YYYY-MM-DD format (e.g., "2026-02-10")
 */
export function getTodayPST(): string {
  const now = new Date()

  // Convert to PST/PDT using Los Angeles timezone
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))

  const year = pstDate.getFullYear()
  const month = String(pstDate.getMonth() + 1).padStart(2, '0')
  const day = String(pstDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Get current timestamp in PST timezone as ISO string.
 * Use this for created_at, updated_at, resolved_at fields.
 *
 * @returns ISO timestamp string (e.g., "2026-02-10T14:30:00.000Z")
 */
export function getNowPST(): string {
  return new Date().toISOString()
}

/**
 * Parse a date string to YYYY-MM-DD format WITHOUT timezone conversion.
 *
 * This function treats dates as calendar dates, not timestamps.
 * NO timezone conversion is applied - the date you pass is the date you get.
 *
 * Handles:
 * - MM/DD/YYYY (US format from Yardi)
 * - M/D/YYYY (US format without leading zeros)
 * - YYYY-MM-DD (ISO format)
 * - null/empty/undefined
 *
 * @param dateStr Date string from Yardi or user input
 * @returns YYYY-MM-DD string or null
 */
export function parseDateString(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  const cleaned = String(dateStr).trim()
  if (!cleaned || cleaned === 'N/A' || cleaned === '') return null

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned
  }

  // Handle MM/DD/YYYY or M/D/YYYY format
  const usFormatMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usFormatMatch) {
    const [_, month, day, year] = usFormatMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Handle short year: MM/DD/YY or M/D/YY
  const shortYearMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (shortYearMatch) {
    const [_, month, day, shortYear] = shortYearMatch
    // Assume 20xx for years 00-50, 19xx for 51-99
    const year = parseInt(shortYear) <= 50 ? `20${shortYear}` : `19${shortYear}`
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

/**
 * Format a date string for display (MM/DD/YYYY).
 *
 * @param dateStr YYYY-MM-DD string
 * @returns MM/DD/YYYY string or 'N/A'
 */
export function formatDateForDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return dateStr // Return as-is if not in expected format

  const [_, year, month, day] = match
  return `${month}/${day}/${year}`
}

/**
 * Calculate days between two date strings.
 *
 * @param fromDate YYYY-MM-DD string
 * @param toDate YYYY-MM-DD string (defaults to today PST)
 * @returns Number of days (positive if toDate is after fromDate)
 */
export function daysBetween(fromDate: string, toDate?: string): number {
  const to = toDate || getTodayPST()

  const fromParts = fromDate.split('-').map(Number)
  const toParts = to.split('-').map(Number)

  // Create Date objects in UTC to avoid timezone issues
  const fromUTC = Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2])
  const toUTC = Date.UTC(toParts[0], toParts[1] - 1, toParts[2])

  const diffMs = toUTC - fromUTC
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Add days to a date string.
 *
 * @param dateStr YYYY-MM-DD string
 * @param days Number of days to add (can be negative)
 * @returns YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  date.setUTCDate(date.getUTCDate() + days)

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
