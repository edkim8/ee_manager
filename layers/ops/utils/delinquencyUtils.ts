/**
 * Pure utility functions for the Delinquencies Dashboard.
 * All functions are side-effect-free and fully unit-testable.
 */

export interface AgingResidentCounts {
  total: number
  days_0_30: number
  days_31_60: number
  days_61_90: number
  days_90_plus: number
}

export interface DateOption {
  value: string  // YYYY-MM-DD
  label: string
}

export interface MonthGroup {
  month: string
  dates: DateOption[]
  count: number
}

export interface SnapshotSummary {
  totalUnpaid: number
  totalBalance: number
  days0_30: number
  days31_60: number
  days61_90: number
  days90Plus: number
  count: number
}

/**
 * Returns a safe CSS width percentage string for an aging bar segment.
 * Guards against division-by-zero and negative values.
 */
export function getSafeWidth(part: number, total: number): string {
  if (!total || total <= 0) return '0%'
  return `${Math.max(0, (part / total) * 100)}%`
}

/**
 * Formats a dollar value as a short abbreviated string.
 * e.g. 1234 → "$1.2k", 999 → "$999"
 */
export function formatCurrencyShort(val: number): string {
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(1)}k`
  }
  return `$${Math.round(val)}`
}

/**
 * Groups an array of date options by calendar month.
 * Uses T12:00:00 to avoid timezone day-boundary shifts where
 * `new Date('YYYY-MM-DD')` (UTC midnight) can fall into the prior
 * local month for US time zones.
 */
export function computeDatesByMonth(dates: DateOption[]): MonthGroup[] {
  const grouped = new Map<string, DateOption[]>()

  dates.forEach(date => {
    // Append T12:00:00 so the date is interpreted in local time, avoiding the
    // UTC-midnight → previous-day shift that causes wrong month grouping.
    const monthKey = new Date(`${date.value}T12:00:00`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, [])
    }
    grouped.get(monthKey)!.push(date)
  })

  return Array.from(grouped.entries()).map(([month, dates]) => ({
    month,
    dates,
    count: dates.length,
  }))
}

/**
 * Counts how many residents have a non-zero balance in each aging bucket.
 */
export function computeAgingResidentCounts(residents: Array<{
  days_0_30?: number | null
  days_31_60?: number | null
  days_61_90?: number | null
  days_90_plus?: number | null
}>): AgingResidentCounts {
  return {
    total: residents.length,
    days_0_30:    residents.filter(r => (r.days_0_30   ?? 0) > 0).length,
    days_31_60:   residents.filter(r => (r.days_31_60  ?? 0) > 0).length,
    days_61_90:   residents.filter(r => (r.days_61_90  ?? 0) > 0).length,
    days_90_plus: residents.filter(r => (r.days_90_plus ?? 0) > 0).length,
  }
}

/**
 * Computes aggregate summary stats from an array of raw delinquency records.
 * Accepts numeric or string values (Supabase numeric columns may arrive as strings).
 */
export function computeSnapshotSummary(delinquencies: Array<{
  total_unpaid?: number | string | null
  balance?: number | string | null
  days_0_30?: number | string | null
  days_31_60?: number | string | null
  days_61_90?: number | string | null
  days_90_plus?: number | string | null
}>): SnapshotSummary {
  return {
    totalUnpaid:  delinquencies.reduce((sum, d) => sum + Number(d.total_unpaid  ?? 0), 0),
    totalBalance: delinquencies.reduce((sum, d) => sum + Number(d.balance       ?? 0), 0),
    days0_30:     delinquencies.reduce((sum, d) => sum + Number(d.days_0_30     ?? 0), 0),
    days31_60:    delinquencies.reduce((sum, d) => sum + Number(d.days_31_60    ?? 0), 0),
    days61_90:    delinquencies.reduce((sum, d) => sum + Number(d.days_61_90    ?? 0), 0),
    days90Plus:   delinquencies.reduce((sum, d) => sum + Number(d.days_90_plus  ?? 0), 0),
    count: delinquencies.length,
  }
}
