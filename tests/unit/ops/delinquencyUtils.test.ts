import { describe, it, expect } from 'vitest'
import {
  getSafeWidth,
  formatCurrencyShort,
  computeDatesByMonth,
  computeAgingResidentCounts,
  computeSnapshotSummary,
} from '../../../layers/ops/utils/delinquencyUtils'

// ─── getSafeWidth ────────────────────────────────────────────────────────────

describe('getSafeWidth', () => {
  it('returns correct percentage for a partial value', () => {
    expect(getSafeWidth(500, 1000)).toBe('50%')
  })

  it('returns 100% when part equals total', () => {
    expect(getSafeWidth(800, 800)).toBe('100%')
  })

  it('returns 0% when total is zero', () => {
    expect(getSafeWidth(100, 0)).toBe('0%')
  })

  it('returns 0% when total is negative', () => {
    expect(getSafeWidth(100, -500)).toBe('0%')
  })

  it('clamps to 0% when part is negative', () => {
    expect(getSafeWidth(-200, 1000)).toBe('0%')
  })

  it('returns 0% when both part and total are zero', () => {
    expect(getSafeWidth(0, 0)).toBe('0%')
  })

  it('handles fractional percentages', () => {
    expect(getSafeWidth(1, 3)).toBe(`${(1 / 3) * 100}%`)
  })
})

// ─── formatCurrencyShort ─────────────────────────────────────────────────────

describe('formatCurrencyShort', () => {
  it('formats values >= 1000 with k suffix', () => {
    expect(formatCurrencyShort(1000)).toBe('$1.0k')
    expect(formatCurrencyShort(1500)).toBe('$1.5k')
    expect(formatCurrencyShort(12345)).toBe('$12.3k')
  })

  it('formats values < 1000 as whole dollar', () => {
    expect(formatCurrencyShort(999)).toBe('$999')
    expect(formatCurrencyShort(0)).toBe('$0')
    expect(formatCurrencyShort(500)).toBe('$500')
  })

  it('rounds sub-thousand values to nearest dollar', () => {
    expect(formatCurrencyShort(499.7)).toBe('$500')
    expect(formatCurrencyShort(499.2)).toBe('$499')
  })

  it('handles exactly 1000', () => {
    expect(formatCurrencyShort(1000)).toBe('$1.0k')
  })

  it('handles large values', () => {
    expect(formatCurrencyShort(100000)).toBe('$100.0k')
  })
})

// ─── computeDatesByMonth ─────────────────────────────────────────────────────

describe('computeDatesByMonth', () => {
  it('returns empty array for empty input', () => {
    expect(computeDatesByMonth([])).toEqual([])
  })

  it('groups dates by month correctly', () => {
    const dates = [
      { value: '2026-03-01', label: 'Sat, Mar 1, 2026' },
      { value: '2026-03-15', label: 'Sun, Mar 15, 2026' },
      { value: '2026-02-28', label: 'Sat, Feb 28, 2026' },
    ]
    const groups = computeDatesByMonth(dates)
    expect(groups).toHaveLength(2)
    const march = groups.find(g => g.month.includes('March'))
    expect(march?.count).toBe(2)
    const feb = groups.find(g => g.month.includes('February'))
    expect(feb?.count).toBe(1)
  })

  it('each group has month, dates array, and count', () => {
    const dates = [{ value: '2026-03-10', label: 'Tue, Mar 10, 2026' }]
    const groups = computeDatesByMonth(dates)
    expect(groups[0]).toHaveProperty('month')
    expect(groups[0]).toHaveProperty('dates')
    expect(groups[0]).toHaveProperty('count', 1)
  })

  it('uses T12:00:00 anchor — Mar 1 is NOT grouped into February', () => {
    // new Date('2026-03-01') is UTC midnight; in UTC-5 it would be Feb 28.
    // With T12:00:00 anchor it should always be March regardless of timezone.
    const dates = [{ value: '2026-03-01', label: 'Sun, Mar 1, 2026' }]
    const groups = computeDatesByMonth(dates)
    expect(groups[0].month).toContain('March')
  })

  it('single month with multiple dates', () => {
    const dates = [
      { value: '2026-01-05', label: 'Mon, Jan 5, 2026' },
      { value: '2026-01-20', label: 'Tue, Jan 20, 2026' },
      { value: '2026-01-31', label: 'Sat, Jan 31, 2026' },
    ]
    const groups = computeDatesByMonth(dates)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(3)
  })
})

// ─── computeAgingResidentCounts ──────────────────────────────────────────────

describe('computeAgingResidentCounts', () => {
  it('returns all zeros for empty array', () => {
    const result = computeAgingResidentCounts([])
    expect(result).toEqual({ total: 0, days_0_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 })
  })

  it('counts total correctly', () => {
    const result = computeAgingResidentCounts([
      { days_0_30: 500, days_31_60: 0, days_61_90: 0, days_90_plus: 0 },
      { days_0_30: 0,   days_31_60: 200, days_61_90: 0, days_90_plus: 0 },
    ])
    expect(result.total).toBe(2)
  })

  it('counts bucket residents with non-zero balances', () => {
    const residents = [
      { days_0_30: 300, days_31_60: 0,   days_61_90: 0,   days_90_plus: 0   },
      { days_0_30: 0,   days_31_60: 500, days_61_90: 0,   days_90_plus: 0   },
      { days_0_30: 0,   days_31_60: 0,   days_61_90: 800, days_90_plus: 0   },
      { days_0_30: 0,   days_31_60: 0,   days_61_90: 0,   days_90_plus: 1200 },
    ]
    const result = computeAgingResidentCounts(residents)
    expect(result.days_0_30).toBe(1)
    expect(result.days_31_60).toBe(1)
    expect(result.days_61_90).toBe(1)
    expect(result.days_90_plus).toBe(1)
  })

  it('handles null values as zero (not counted)', () => {
    const result = computeAgingResidentCounts([
      { days_0_30: null, days_31_60: null, days_61_90: null, days_90_plus: null },
    ])
    expect(result.days_0_30).toBe(0)
    expect(result.days_90_plus).toBe(0)
  })

  it('handles undefined bucket fields', () => {
    const result = computeAgingResidentCounts([{}])
    expect(result.days_0_30).toBe(0)
    expect(result.total).toBe(1)
  })

  it('a resident with amounts in multiple buckets is counted in each', () => {
    const result = computeAgingResidentCounts([
      { days_0_30: 200, days_31_60: 300, days_61_90: 400, days_90_plus: 500 },
    ])
    expect(result.days_0_30).toBe(1)
    expect(result.days_31_60).toBe(1)
    expect(result.days_61_90).toBe(1)
    expect(result.days_90_plus).toBe(1)
  })
})

// ─── computeSnapshotSummary ───────────────────────────────────────────────────

describe('computeSnapshotSummary', () => {
  it('returns all-zero summary for empty array', () => {
    const result = computeSnapshotSummary([])
    expect(result).toEqual({
      totalUnpaid: 0, totalBalance: 0,
      days0_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0,
      count: 0,
    })
  })

  it('sums numeric values across records', () => {
    const records = [
      { total_unpaid: 1000, balance: 900, days_0_30: 1000, days_31_60: 0, days_61_90: 0, days_90_plus: 0 },
      { total_unpaid: 500,  balance: 500, days_0_30: 200,  days_31_60: 300, days_61_90: 0, days_90_plus: 0 },
    ]
    const result = computeSnapshotSummary(records)
    expect(result.totalUnpaid).toBe(1500)
    expect(result.totalBalance).toBe(1400)
    expect(result.days0_30).toBe(1200)
    expect(result.days31_60).toBe(300)
    expect(result.count).toBe(2)
  })

  it('handles string values from Supabase numeric columns', () => {
    const records = [
      { total_unpaid: '750', balance: '700', days_0_30: '750', days_31_60: '0', days_61_90: '0', days_90_plus: '0' },
    ]
    const result = computeSnapshotSummary(records)
    expect(result.totalUnpaid).toBe(750)
    expect(result.totalBalance).toBe(700)
  })

  it('handles null values as zero', () => {
    const records = [
      { total_unpaid: null, balance: null, days_0_30: null, days_31_60: null, days_61_90: null, days_90_plus: null },
    ]
    const result = computeSnapshotSummary(records)
    expect(result.totalUnpaid).toBe(0)
    expect(result.totalBalance).toBe(0)
    expect(result.count).toBe(1)
  })

  it('correctly sums days_61_90 and days_90_plus for high-risk total', () => {
    const records = [
      { total_unpaid: 2000, balance: 2000, days_0_30: 500, days_31_60: 300, days_61_90: 700, days_90_plus: 500 },
    ]
    const result = computeSnapshotSummary(records)
    expect(result.days61_90 + result.days90Plus).toBe(1200)
  })

  it('sets count to the number of records', () => {
    const records = Array(7).fill({ total_unpaid: 100, balance: 100, days_0_30: 100, days_31_60: 0, days_61_90: 0, days_90_plus: 0 })
    expect(computeSnapshotSummary(records).count).toBe(7)
  })
})
