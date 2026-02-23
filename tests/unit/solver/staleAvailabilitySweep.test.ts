import { describe, it, expect } from 'vitest'
import {
  buildTenancyPriorityMap,
  classifyStaleAvailabilities,
  type ActiveAvail,
  type TenancyRecord,
} from '../../../layers/admin/utils/availabilityUtils'

// ─── buildTenancyPriorityMap ─────────────────────────────────────────────────

describe('buildTenancyPriorityMap', () => {
  it('returns empty map for empty input', () => {
    expect(buildTenancyPriorityMap([]).size).toBe(0)
  })

  it('maps a single tenancy by unit_id', () => {
    const t: TenancyRecord = { id: 't1', unit_id: 'u1', status: 'Current' }
    const map = buildTenancyPriorityMap([t])
    expect(map.get('u1')).toEqual(t)
  })

  it('prefers Current over Future when same unit', () => {
    const tenancies: TenancyRecord[] = [
      { id: 't1', unit_id: 'u1', status: 'Future' },
      { id: 't2', unit_id: 'u1', status: 'Current' },
    ]
    expect(buildTenancyPriorityMap(tenancies).get('u1')?.id).toBe('t2')
  })

  it('prefers Current over Applicant', () => {
    const tenancies: TenancyRecord[] = [
      { id: 't1', unit_id: 'u1', status: 'Applicant' },
      { id: 't2', unit_id: 'u1', status: 'Current' },
    ]
    expect(buildTenancyPriorityMap(tenancies).get('u1')?.id).toBe('t2')
  })

  it('prefers Future over Applicant', () => {
    const tenancies: TenancyRecord[] = [
      { id: 't1', unit_id: 'u1', status: 'Applicant' },
      { id: 't2', unit_id: 'u1', status: 'Future' },
    ]
    expect(buildTenancyPriorityMap(tenancies).get('u1')?.id).toBe('t2')
  })

  it('keeps each unit as a separate entry', () => {
    const tenancies: TenancyRecord[] = [
      { id: 't1', unit_id: 'u1', status: 'Current' },
      { id: 't2', unit_id: 'u2', status: 'Future' },
    ]
    const map = buildTenancyPriorityMap(tenancies)
    expect(map.size).toBe(2)
    expect(map.get('u1')?.id).toBe('t1')
    expect(map.get('u2')?.id).toBe('t2')
  })

  it('processes in-order: first occurrence wins if equal priority', () => {
    const tenancies: TenancyRecord[] = [
      { id: 't1', unit_id: 'u1', status: 'Future' },
      { id: 't2', unit_id: 'u1', status: 'Future' },
    ]
    expect(buildTenancyPriorityMap(tenancies).get('u1')?.id).toBe('t1')
  })
})

// ─── classifyStaleAvailabilities ─────────────────────────────────────────────

describe('classifyStaleAvailabilities', () => {
  const avail = (id: string, unit_id: string, status: string): ActiveAvail => ({
    id,
    unit_id,
    property_code: 'SB',
    status,
  })

  it('returns empty arrays when no active avails', () => {
    const map = buildTenancyPriorityMap([])
    const result = classifyStaleAvailabilities([], map)
    expect(result.toDeactivate).toHaveLength(0)
    expect(result.toUpdateStatus).toHaveLength(0)
  })

  it('skips avails with no matching tenancy', () => {
    const avails = [avail('a1', 'u1', 'Available')]
    const map = buildTenancyPriorityMap([]) // no tenancies
    const result = classifyStaleAvailabilities(avails, map)
    expect(result.toDeactivate).toHaveLength(0)
    expect(result.toUpdateStatus).toHaveLength(0)
  })

  describe('Current tenancy → deactivate', () => {
    it('deactivates an Available unit with Current tenancy (regression: unit 1032)', () => {
      const avails = [avail('a1', 'u1', 'Available')]
      const map = buildTenancyPriorityMap([{ id: 't1', unit_id: 'u1', status: 'Current' }])
      const { toDeactivate, toUpdateStatus } = classifyStaleAvailabilities(avails, map)
      expect(toDeactivate).toEqual(['a1'])
      expect(toUpdateStatus).toHaveLength(0)
    })

    it('deactivates Applied/Leased units with Current tenancy', () => {
      const avails = [
        avail('a1', 'u1', 'Applied'),
        avail('a2', 'u2', 'Leased'),
      ]
      const map = buildTenancyPriorityMap([
        { id: 't1', unit_id: 'u1', status: 'Current' },
        { id: 't2', unit_id: 'u2', status: 'Current' },
      ])
      const { toDeactivate } = classifyStaleAvailabilities(avails, map)
      expect(toDeactivate).toContain('a1')
      expect(toDeactivate).toContain('a2')
    })
  })

  describe('Future tenancy → Leased', () => {
    it('updates Available to Leased when Future tenancy exists', () => {
      const avails = [avail('a1', 'u1', 'Available')]
      const map = buildTenancyPriorityMap([{ id: 't1', unit_id: 'u1', status: 'Future' }])
      const { toUpdateStatus } = classifyStaleAvailabilities(avails, map)
      expect(toUpdateStatus).toHaveLength(1)
      expect(toUpdateStatus[0]).toMatchObject({
        id: 'a1',
        status: 'Leased',
        future_tenancy_id: 't1',
      })
    })

    it('skips avail already at Leased (no redundant update)', () => {
      const avails = [avail('a1', 'u1', 'Leased')]
      const map = buildTenancyPriorityMap([{ id: 't1', unit_id: 'u1', status: 'Future' }])
      const { toUpdateStatus } = classifyStaleAvailabilities(avails, map)
      expect(toUpdateStatus).toHaveLength(0)
    })
  })

  describe('Applicant tenancy → Applied', () => {
    it('updates Available to Applied when Applicant tenancy exists', () => {
      const avails = [avail('a1', 'u1', 'Available')]
      const map = buildTenancyPriorityMap([{ id: 't1', unit_id: 'u1', status: 'Applicant' }])
      const { toUpdateStatus } = classifyStaleAvailabilities(avails, map)
      expect(toUpdateStatus).toHaveLength(1)
      expect(toUpdateStatus[0]).toMatchObject({
        id: 'a1',
        status: 'Applied',
        future_tenancy_id: 't1',
      })
    })

    it('skips avail already at Applied (no redundant update)', () => {
      const avails = [avail('a1', 'u1', 'Applied')]
      const map = buildTenancyPriorityMap([{ id: 't1', unit_id: 'u1', status: 'Applicant' }])
      const { toUpdateStatus } = classifyStaleAvailabilities(avails, map)
      expect(toUpdateStatus).toHaveLength(0)
    })
  })

  describe('priority: Current wins over Future/Applicant', () => {
    it('deactivates rather than updates when Current beats Future', () => {
      const avails = [avail('a1', 'u1', 'Available')]
      const map = buildTenancyPriorityMap([
        { id: 't1', unit_id: 'u1', status: 'Future' },
        { id: 't2', unit_id: 'u1', status: 'Current' },
      ])
      const { toDeactivate, toUpdateStatus } = classifyStaleAvailabilities(avails, map)
      expect(toDeactivate).toContain('a1')
      expect(toUpdateStatus).toHaveLength(0)
    })
  })

  describe('mixed scenarios', () => {
    it('handles multiple units with different tenancy states', () => {
      const avails = [
        avail('a1', 'u1', 'Available'),  // no tenancy → skip
        avail('a2', 'u2', 'Available'),  // Current   → deactivate
        avail('a3', 'u3', 'Available'),  // Future    → Leased
        avail('a4', 'u4', 'Available'),  // Applicant → Applied
        avail('a5', 'u5', 'Leased'),     // Future    → skip (already Leased)
      ]
      const map = buildTenancyPriorityMap([
        { id: 't2', unit_id: 'u2', status: 'Current' },
        { id: 't3', unit_id: 'u3', status: 'Future' },
        { id: 't4', unit_id: 'u4', status: 'Applicant' },
        { id: 't5', unit_id: 'u5', status: 'Future' },
      ])

      const { toDeactivate, toUpdateStatus } = classifyStaleAvailabilities(avails, map)

      expect(toDeactivate).toEqual(['a2'])
      expect(toUpdateStatus).toHaveLength(2)
      expect(toUpdateStatus.find(u => u.id === 'a3')?.status).toBe('Leased')
      expect(toUpdateStatus.find(u => u.id === 'a4')?.status).toBe('Applied')
    })
  })
})
