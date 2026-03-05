import { describe, it, expect } from 'vitest'
import {
  buildTenancyPriorityMap,
  classifyStaleAvailabilities,
  type TenancyRecord,
  type ActiveAvail
} from '../../../../layers/admin/utils/availabilityUtils'

describe('availabilityUtils', () => {
  describe('buildTenancyPriorityMap', () => {
    it('prioritizes Current > Future > Applicant', () => {
      const tenancies: TenancyRecord[] = [
        { id: '1', unit_id: 'A', status: 'Applicant' },
        { id: '2', unit_id: 'A', status: 'Current' },
        { id: '3', unit_id: 'A', status: 'Future' },
        { id: '4', unit_id: 'B', status: 'Future' },
        { id: '5', unit_id: 'B', status: 'Applicant' }
      ]

      const map = buildTenancyPriorityMap(tenancies)

      expect(map.get('A')?.status).toBe('Current')
      expect(map.get('A')?.id).toBe('2')
      expect(map.get('B')?.status).toBe('Future')
      expect(map.get('B')?.id).toBe('4')
    })

    it('returns the same record if only one exists for a unit', () => {
      const tenancies: TenancyRecord[] = [
        { id: '1', unit_id: 'A', status: 'Future' }
      ]
      const map = buildTenancyPriorityMap(tenancies)
      expect(map.get('A')?.id).toBe('1')
    })

    it('handles empty input', () => {
      const map = buildTenancyPriorityMap([])
      expect(map.size).toBe(0)
    })
  })

  describe('classifyStaleAvailabilities', () => {
    it('deactivates any status if unit is Current (Occupied)', () => {
      const activeAvails: ActiveAvail[] = [
        { id: 'avail1', unit_id: 'A', property_code: 'CV', status: 'Available' },
        { id: 'avail2', unit_id: 'B', property_code: 'CV', status: 'Leased' }
      ]
      const tenancyMap = new Map<string, TenancyRecord>([
        ['A', { id: 't1', unit_id: 'A', status: 'Current' }],
        ['B', { id: 't2', unit_id: 'B', status: 'Current' }]
      ])

      const result = classifyStaleAvailabilities(activeAvails, tenancyMap)

      expect(result.toDeactivate).toContain('avail1')
      expect(result.toDeactivate).toContain('avail2')
      expect(result.toUpdateStatus).toHaveLength(0)
    })

    it('updates to Leased if tenancy is Future', () => {
      const activeAvails: ActiveAvail[] = [
        { id: 'avail1', unit_id: 'A', property_code: 'CV', status: 'Available' }
      ]
      const tenancyMap = new Map<string, TenancyRecord>([
        ['A', { id: 't1', unit_id: 'A', status: 'Future' }]
      ])

      const result = classifyStaleAvailabilities(activeAvails, tenancyMap)

      expect(result.toDeactivate).toHaveLength(0)
      expect(result.toUpdateStatus).toContainEqual({
        id: 'avail1',
        unit_id: 'A',
        property_code: 'CV',
        status: 'Leased',
        future_tenancy_id: 't1'
      })
    })

    it('updates to Applied if tenancy is Applicant', () => {
      const activeAvails: ActiveAvail[] = [
        { id: 'avail1', unit_id: 'A', property_code: 'CV', status: 'Available' }
      ]
      const tenancyMap = new Map<string, TenancyRecord>([
        ['A', { id: 't1', unit_id: 'A', status: 'Applicant' }]
      ])

      const result = classifyStaleAvailabilities(activeAvails, tenancyMap)

      expect(result.toDeactivate).toHaveLength(0)
      expect(result.toUpdateStatus).toContainEqual({
        id: 'avail1',
        unit_id: 'A',
        property_code: 'CV',
        status: 'Applied',
        future_tenancy_id: 't1'
      })
    })

    it('skips updates if status already matches', () => {
      const activeAvails: ActiveAvail[] = [
        { id: 'avail1', unit_id: 'A', property_code: 'CV', status: 'Leased' },
        { id: 'avail2', unit_id: 'B', property_code: 'CV', status: 'Applied' }
      ]
      const tenancyMap = new Map<string, TenancyRecord>([
        ['A', { id: 't1', unit_id: 'A', status: 'Future' }],
        ['B', { id: 't2', unit_id: 'B', status: 'Applicant' }]
      ])

      const result = classifyStaleAvailabilities(activeAvails, tenancyMap)

      expect(result.toDeactivate).toHaveLength(0)
      expect(result.toUpdateStatus).toHaveLength(0)
    })

    it('ignores units with no tenancy data', () => {
      const activeAvails: ActiveAvail[] = [
        { id: 'avail1', unit_id: 'A', property_code: 'CV', status: 'Available' }
      ]
      const tenancyMap = new Map<string, TenancyRecord>()

      const result = classifyStaleAvailabilities(activeAvails, tenancyMap)

      expect(result.toDeactivate).toHaveLength(0)
      expect(result.toUpdateStatus).toHaveLength(0)
    })
  })
})
