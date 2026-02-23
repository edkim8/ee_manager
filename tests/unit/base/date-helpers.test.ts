import { describe, it, expect } from 'vitest'
import {
  parseDateString,
  formatDateForDisplay,
  daysBetween,
  addDays,
} from '../../../layers/base/utils/date-helpers'

// ─── parseDateString ──────────────────────────────────────────────────────────

describe('parseDateString', () => {
  it('returns null for null/undefined/empty', () => {
    expect(parseDateString(null)).toBeNull()
    expect(parseDateString(undefined)).toBeNull()
    expect(parseDateString('')).toBeNull()
    expect(parseDateString('N/A')).toBeNull()
  })

  it('passes through YYYY-MM-DD unchanged', () => {
    expect(parseDateString('2024-01-15')).toBe('2024-01-15')
    expect(parseDateString('2026-02-23')).toBe('2026-02-23')
  })

  it('parses MM/DD/YYYY', () => {
    expect(parseDateString('01/15/2024')).toBe('2024-01-15')
    expect(parseDateString('12/31/2025')).toBe('2025-12-31')
  })

  it('parses M/D/YYYY without leading zeros', () => {
    expect(parseDateString('1/5/2024')).toBe('2024-01-05')
    expect(parseDateString('3/7/2026')).toBe('2026-03-07')
  })

  it('parses short year MM/DD/YY as 20xx (years 00–50)', () => {
    expect(parseDateString('01/14/26')).toBe('2026-01-14')
    expect(parseDateString('12/31/00')).toBe('2000-12-31')
    expect(parseDateString('06/15/50')).toBe('2050-06-15')
  })

  it('parses short year MM/DD/YY as 19xx (years 51–99)', () => {
    expect(parseDateString('01/15/60')).toBe('1960-01-15')
    expect(parseDateString('12/31/99')).toBe('1999-12-31')
    expect(parseDateString('01/01/51')).toBe('1951-01-01')
  })

  it('returns null for unrecognized formats', () => {
    expect(parseDateString('January 15, 2024')).toBeNull()
    expect(parseDateString('2024/01/15')).toBeNull()
    expect(parseDateString('not-a-date')).toBeNull()
  })
})

// ─── formatDateForDisplay ─────────────────────────────────────────────────────

describe('formatDateForDisplay', () => {
  it('returns N/A for null/undefined/empty', () => {
    expect(formatDateForDisplay(null)).toBe('N/A')
    expect(formatDateForDisplay(undefined)).toBe('N/A')
    expect(formatDateForDisplay('')).toBe('N/A')
  })

  it('converts YYYY-MM-DD to MM/DD/YYYY', () => {
    expect(formatDateForDisplay('2024-01-15')).toBe('01/15/2024')
    expect(formatDateForDisplay('2026-02-23')).toBe('02/23/2026')
    expect(formatDateForDisplay('2025-12-01')).toBe('12/01/2025')
  })

  it('returns input as-is for unexpected formats', () => {
    expect(formatDateForDisplay('not-a-date')).toBe('not-a-date')
  })
})

// ─── daysBetween ──────────────────────────────────────────────────────────────

describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetween('2024-01-15', '2024-01-15')).toBe(0)
  })

  it('returns positive when toDate is after fromDate', () => {
    expect(daysBetween('2024-01-15', '2024-01-20')).toBe(5)
    expect(daysBetween('2024-01-01', '2024-01-31')).toBe(30)
  })

  it('returns negative when toDate is before fromDate', () => {
    expect(daysBetween('2024-01-20', '2024-01-15')).toBe(-5)
  })

  it('handles month boundaries', () => {
    expect(daysBetween('2024-01-31', '2024-02-01')).toBe(1)
    expect(daysBetween('2024-02-29', '2024-03-01')).toBe(1) // 2024 is leap year
  })

  it('handles year boundaries', () => {
    expect(daysBetween('2023-12-31', '2024-01-01')).toBe(1)
    expect(daysBetween('2023-01-01', '2024-01-01')).toBe(365) // 2023 is not leap year
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366) // 2024 is leap year
  })
})

// ─── addDays ──────────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2024-01-15', 5)).toBe('2024-01-20')
    expect(addDays('2024-01-01', 30)).toBe('2024-01-31')
  })

  it('subtracts days with negative value', () => {
    expect(addDays('2024-01-15', -5)).toBe('2024-01-10')
    expect(addDays('2024-01-01', -1)).toBe('2023-12-31')
  })

  it('handles adding 0 days (identity)', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15')
  })

  it('handles month boundaries', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
    expect(addDays('2024-03-31', 1)).toBe('2024-04-01')
  })

  it('handles leap year correctly', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // 2024 is leap year
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01') // 2025 is not leap year
  })

  it('handles year boundaries', () => {
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01')
    expect(addDays('2024-01-01', -1)).toBe('2023-12-31')
  })
})
