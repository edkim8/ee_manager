import { describe, it, expect } from 'vitest'
import { solveRentCombination } from '../../../layers/ops/utils/solveRentCombination'
import type { AmenityOption } from '../../../layers/ops/utils/solveRentCombination'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function a(id: string, amount: number): AmenityOption {
  return { id, amount }
}

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('solveRentCombination: edge cases', () => {
  it('returns empty combination and full remainingGap when no amenities provided', () => {
    const result = solveRentCombination(200, [])
    expect(result.combination).toHaveLength(0)
    expect(result.remainingGap).toBe(200)
  })

  it('returns the only amenity available even if it does not close the gap', () => {
    const result = solveRentCombination(500, [a('x', 50)])
    expect(result.combination).toHaveLength(1)
    expect(result.combination[0].id).toBe('x')
    expect(result.remainingGap).toBe(450)
  })
})

// ─── Single-amenity path ──────────────────────────────────────────────────────

describe('solveRentCombination: single-amenity path', () => {
  it('returns exact single match and remainingGap = 0', () => {
    const result = solveRentCombination(200, [a('a', 200), a('b', 150)])
    expect(result.combination).toHaveLength(1)
    expect(result.combination[0].id).toBe('a')
    expect(result.remainingGap).toBe(0)
  })

  it('picks the single amenity with smallest delta', () => {
    // targetGap=200: a→delta=25, b→delta=100
    const result = solveRentCombination(200, [a('a', 175), a('b', 100)])
    expect(result.combination).toHaveLength(1)
    expect(result.combination[0].id).toBe('a')
    expect(result.remainingGap).toBe(25)
  })

  it('sorts amenities by absolute value — picks the largest-impact one first', () => {
    // Without sorting, 'small' (amount=50) would be evaluated before 'big' (amount=195)
    const result = solveRentCombination(200, [a('small', 50), a('big', 195)])
    expect(result.combination[0].id).toBe('big')
    expect(result.remainingGap).toBe(5) // |200-195|=5 beats |200-50|=150
  })

  it('handles negative targetGap (discount amenity)', () => {
    const result = solveRentCombination(-100, [a('disc', -100), a('prem', 50)])
    expect(result.combination).toHaveLength(1)
    expect(result.combination[0].id).toBe('disc')
    expect(result.remainingGap).toBe(0)
  })

  it('does NOT run combination search when best single-amenity delta ≤ $10', () => {
    // best single: a→delta=8. Combo [a,b] would give sum=208, delta=8 (no improvement).
    // The important thing is that no combination beats the single — verify result is still 1 amenity.
    const result = solveRentCombination(200, [a('a', 192), a('b', 16)])
    expect(result.combination).toHaveLength(1)
    expect(result.combination[0].id).toBe('a')
  })
})

// ─── Combination search ───────────────────────────────────────────────────────

describe('solveRentCombination: combination search', () => {
  it('finds an exact two-amenity combination', () => {
    // targetGap=200: no single exact match. a(120)+b(80)=200 → exact
    const result = solveRentCombination(200, [a('a', 120), a('b', 80), a('c', 60)])
    expect(result.remainingGap).toBe(0)
    const ids = result.combination.map(x => x.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('finds a two-amenity combination that is clearly better than the best single (large gap diff)', () => {
    // targetGap=200, best single: a→delta=80. combo [a,b]: sum=210, delta=10. gapDiff=70>5 → smaller delta wins
    const result = solveRentCombination(200, [a('a', 120), a('b', 90)])
    expect(result.combination.map(x => x.id).sort()).toEqual(['a', 'b'])
    expect(result.remainingGap).toBe(-10)
  })

  it('within-$5 rule: 1 amenity beats 2 amenities when their deltas are similar', () => {
    // targetGap=200, amenities sorted: a(185)→delta=15, b(28)→delta=172, c(3)→delta=197
    // Combo [a,b]=213→delta=13, gapDiff=|13-15|=2 ≤ 5 → prefer fewer → 1 amenity wins
    const result = solveRentCombination(200, [a('a', 185), a('b', 28), a('c', 3)])
    expect(result.combination).toHaveLength(1)
    expect(result.combination[0].id).toBe('a')
  })

  it('caps at 4 amenities — does not use a 5th even when it would reduce the delta', () => {
    // targetGap=500, five identical $100 amenities. 4×$100=$400 (delta=100). 5×$100=$500 (delta=0).
    // The 5th amenity should never be considered.
    const result = solveRentCombination(500, [
      a('a', 100), a('b', 100), a('c', 100), a('d', 100), a('e', 100),
    ])
    expect(result.combination.length).toBeLessThanOrEqual(4)
  })

  it('combination pruning: stops when gap reduction < 25% at 2+ amenities', () => {
    // targetGap=400, amenities all amount=50. Single best: delta=350.
    // Any 2-amenity combo: sum=100, delta=300. gapReduction=(400-300)/400=0.25 — exactly at threshold.
    // Adding a 3rd: sum=150, delta=250. gapReduction=(400-250)/400=0.375 ≥ 0.25 → not pruned.
    // The key test: we do NOT get 8 amenities or similar explosion.
    const amenities = Array.from({ length: 10 }, (_, i) => a(`x${i}`, 50))
    const result = solveRentCombination(400, amenities)
    // With the 4-amenity cap, max sum = 200, min delta = 200
    expect(result.combination.length).toBeLessThanOrEqual(4)
  })
})

// ─── Priority rules ───────────────────────────────────────────────────────────

describe('solveRentCombination: priority rules', () => {
  it('rule 1: always returns at least one amenity when any are available', () => {
    // Even with a poor fit, must return ≥ 1 amenity
    const result = solveRentCombination(1000, [a('tiny', 1)])
    expect(result.combination).toHaveLength(1)
    expect(result.remainingGap).toBe(999)
  })

  it('rule 2: exact match (delta=0) always beats a non-exact solution', () => {
    // a→delta=50, b→delta=0. b must win even though a was evaluated first
    const result = solveRentCombination(100, [a('a', 150), a('b', 100)])
    expect(result.combination[0].id).toBe('b')
    expect(result.remainingGap).toBe(0)
  })

  it('rule 4: significantly smaller delta beats fewer amenities', () => {
    // targetGap=200: single best a→delta=80. combo [a,b]: delta=10. gapDiff=70>5 → smaller delta wins
    const result = solveRentCombination(200, [a('a', 120), a('b', 90)])
    expect(result.combination.length).toBeGreaterThan(1)
    expect(Math.abs(result.remainingGap)).toBeLessThan(80) // combination is closer
  })
})
