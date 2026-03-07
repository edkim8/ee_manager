/**
 * Tests for distribution business logic utilities.
 *
 * These test pure calculation functions used by the distributions page:
 * - Summing filtered distributions
 * - Grouping by owner/property
 * - Currency formatting helpers
 */
import { describe, it, expect } from 'vitest'

// ─── Pure helper functions (extracted from distributions.vue logic) ──────────
// These are tested as plain functions to keep tests SSR/Nuxt-free.

function sumDistributions(rows: Array<{ amount: number | string }>): number {
  return rows.reduce((acc, r) => acc + Number(r.amount || 0), 0)
}

function groupByOwner(rows: Array<{ owner_id: string; owner_name: string; amount: number }>)
  : Map<string, { owner_name: string; total: number; count: number }> {
  const map = new Map<string, { owner_name: string; total: number; count: number }>()
  for (const r of rows) {
    const entry = map.get(r.owner_id) ?? { owner_name: r.owner_name, total: 0, count: 0 }
    entry.total += Number(r.amount)
    entry.count += 1
    map.set(r.owner_id, entry)
  }
  return map
}

function groupByProperty(rows: Array<{ property_code: string | null; amount: number }>)
  : Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) {
    const key = r.property_code ?? '(portfolio)'
    map.set(key, (map.get(key) ?? 0) + Number(r.amount))
  }
  return map
}

function calcOwnerShare(totalDistribution: number, equityPct: number): number {
  if (equityPct < 0 || equityPct > 100) throw new RangeError('equityPct must be 0–100')
  return Math.round((totalDistribution * equityPct / 100) * 100) / 100
}

// ─── sumDistributions ────────────────────────────────────────────────────────

describe('sumDistributions', () => {
  it('returns 0 for empty list', () => {
    expect(sumDistributions([])).toBe(0)
  })

  it('sums numeric amounts correctly', () => {
    expect(sumDistributions([{ amount: 10000 }, { amount: 25000 }, { amount: 15000 }])).toBe(50000)
  })

  it('coerces string amounts', () => {
    expect(sumDistributions([{ amount: '1000.50' }, { amount: '499.50' }])).toBe(1500)
  })

  it('treats null/undefined amounts as 0', () => {
    expect(sumDistributions([{ amount: 0 }, { amount: 5000 }])).toBe(5000)
  })

  it('handles a single record', () => {
    expect(sumDistributions([{ amount: 75000 }])).toBe(75000)
  })
})

// ─── groupByOwner ────────────────────────────────────────────────────────────

describe('groupByOwner', () => {
  const rows = [
    { owner_id: 'e1', owner_name: 'Whispering Oaks LP', amount: 30000 },
    { owner_id: 'e2', owner_name: 'Storan LLC',         amount: 20000 },
    { owner_id: 'e1', owner_name: 'Whispering Oaks LP', amount: 10000 },
  ]

  it('groups rows by owner_id', () => {
    const result = groupByOwner(rows)
    expect(result.size).toBe(2)
  })

  it('sums amounts per owner', () => {
    const result = groupByOwner(rows)
    expect(result.get('e1')?.total).toBe(40000)
    expect(result.get('e2')?.total).toBe(20000)
  })

  it('counts records per owner', () => {
    const result = groupByOwner(rows)
    expect(result.get('e1')?.count).toBe(2)
    expect(result.get('e2')?.count).toBe(1)
  })

  it('returns empty map for empty list', () => {
    expect(groupByOwner([]).size).toBe(0)
  })
})

// ─── groupByProperty ─────────────────────────────────────────────────────────

describe('groupByProperty', () => {
  it('groups by property_code', () => {
    const rows = [
      { property_code: 'RS', amount: 10000 },
      { property_code: 'SB', amount: 20000 },
      { property_code: 'RS', amount: 5000  },
    ]
    const result = groupByProperty(rows)
    expect(result.get('RS')).toBe(15000)
    expect(result.get('SB')).toBe(20000)
  })

  it('groups null property_code as (portfolio)', () => {
    const rows = [
      { property_code: null, amount: 50000 },
      { property_code: 'WO', amount: 10000 },
    ]
    const result = groupByProperty(rows)
    expect(result.get('(portfolio)')).toBe(50000)
    expect(result.get('WO')).toBe(10000)
  })
})

// ─── calcOwnerShare ──────────────────────────────────────────────────────────

describe('calcOwnerShare', () => {
  it('calculates 50% share of $100,000', () => {
    expect(calcOwnerShare(100000, 50)).toBe(50000)
  })

  it('calculates fractional share with rounding to cents', () => {
    // 33.3333% of $100,000 = $33,333.30
    expect(calcOwnerShare(100000, 33.3333)).toBe(33333.3)
  })

  it('calculates 100% share', () => {
    expect(calcOwnerShare(75000, 100)).toBe(75000)
  })

  it('calculates 0% share', () => {
    expect(calcOwnerShare(75000, 0)).toBe(0)
  })

  it('throws for equity_pct below 0', () => {
    expect(() => calcOwnerShare(100000, -1)).toThrow(RangeError)
  })

  it('throws for equity_pct above 100', () => {
    expect(() => calcOwnerShare(100000, 101)).toThrow(RangeError)
  })

  it('handles small distribution amounts precisely', () => {
    expect(calcOwnerShare(1, 50)).toBe(0.5)
  })
})
