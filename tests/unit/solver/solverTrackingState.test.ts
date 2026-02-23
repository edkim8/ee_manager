import { describe, it, expect, beforeEach } from 'vitest'
import { createSolverTrackingState } from '../../../layers/admin/utils/solverTrackingState'

// ─── Shared state fixture ─────────────────────────────────────────────────────

let tracker: ReturnType<typeof createSolverTrackingState>

beforeEach(() => {
  tracker = createSolverTrackingState()
})

// ─── initProperty ─────────────────────────────────────────────────────────────

describe('initProperty', () => {
  it('creates a zeroed summary for a new property', () => {
    tracker.initProperty('SB')
    const summary = tracker.propertySummaries['SB']
    expect(summary).toBeDefined()
    expect(summary.tenanciesNew).toBe(0)
    expect(summary.leasesRenewed).toBe(0)
    expect(summary.statusAutoFixes).toEqual([])
  })

  it('is idempotent — does not overwrite existing summary', () => {
    tracker.initProperty('SB')
    tracker.propertySummaries['SB'].tenanciesNew = 5
    tracker.initProperty('SB') // call again
    expect(tracker.propertySummaries['SB'].tenanciesNew).toBe(5)
  })
})

// ─── reset ────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears events and summaries', () => {
    tracker.trackTenancyUpdates('SB', 3)
    tracker.trackNewTenancy('SB', { tenancy_id: 't1', resident_name: 'Alice', unit_name: '101', unit_id: 'u1', status: 'Current', source: 'test' })
    expect(tracker.events).toHaveLength(1)
    expect(tracker.propertySummaries['SB']).toBeDefined()

    tracker.reset()

    expect(tracker.events).toHaveLength(0)
    expect(Object.keys(tracker.propertySummaries)).toHaveLength(0)
  })
})

// ─── trackNewTenancy ──────────────────────────────────────────────────────────

describe('trackNewTenancy', () => {
  it('increments tenanciesNew', () => {
    tracker.trackNewTenancy('SB', { tenancy_id: 't1', resident_name: 'Alice', unit_name: '101', unit_id: 'u1', status: 'Current', source: 'test' })
    expect(tracker.propertySummaries['SB'].tenanciesNew).toBe(1)
  })

  it('pushes a new_tenancy event', () => {
    tracker.trackNewTenancy('SB', { tenancy_id: 't1', resident_name: 'Alice', unit_name: '101', unit_id: 'u1', status: 'Current', source: 'test' })
    expect(tracker.events).toHaveLength(1)
    expect(tracker.events[0].event_type).toBe('new_tenancy')
    expect(tracker.events[0].property_code).toBe('SB')
  })

  it('auto-initializes property if not yet seen', () => {
    tracker.trackNewTenancy('RS', { tenancy_id: 't1', resident_name: 'Bob', unit_name: '205', unit_id: 'u2', status: 'Future', source: 'test' })
    expect(tracker.propertySummaries['RS']).toBeDefined()
  })
})

// ─── trackTenancyUpdates ──────────────────────────────────────────────────────

describe('trackTenancyUpdates', () => {
  it('accumulates count over multiple calls', () => {
    tracker.trackTenancyUpdates('SB', 3)
    tracker.trackTenancyUpdates('SB', 2)
    expect(tracker.propertySummaries['SB'].tenanciesUpdated).toBe(5)
  })

  it('does not emit an event', () => {
    tracker.trackTenancyUpdates('SB', 5)
    expect(tracker.events).toHaveLength(0)
  })
})

// ─── trackNewResident ─────────────────────────────────────────────────────────

describe('trackNewResident', () => {
  it('increments residentsNew and pushes event', () => {
    tracker.trackNewResident('SB', { tenancy_id: 't1', resident_name: 'Alice', unit_name: '101', unit_id: 'u1', role: 'Primary' })
    expect(tracker.propertySummaries['SB'].residentsNew).toBe(1)
    expect(tracker.events[0].event_type).toBe('new_resident')
  })
})

// ─── trackLeaseRenewal ────────────────────────────────────────────────────────

describe('trackLeaseRenewal', () => {
  it('increments leasesRenewed and pushes event', () => {
    tracker.trackLeaseRenewal('SB', {
      tenancy_id: 't1',
      unit_name: '101',
      unit_id: 'u1',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 1800 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 1900 },
    })
    expect(tracker.propertySummaries['SB'].leasesRenewed).toBe(1)
    expect(tracker.events[0].event_type).toBe('lease_renewal')
  })
})

// ─── trackLeaseChanges ────────────────────────────────────────────────────────

describe('trackLeaseChanges', () => {
  it('accumulates new and update counts', () => {
    tracker.trackLeaseChanges('SB', 2, 3)
    tracker.trackLeaseChanges('SB', 1, 1)
    expect(tracker.propertySummaries['SB'].leasesNew).toBe(3)
    expect(tracker.propertySummaries['SB'].leasesUpdated).toBe(4)
  })
})

// ─── trackNotice ──────────────────────────────────────────────────────────────

describe('trackNotice', () => {
  it('increments noticesProcessed and pushes event', () => {
    tracker.trackNotice('SB', { tenancy_id: 't1', unit_name: '101', unit_id: 'u1' })
    expect(tracker.propertySummaries['SB'].noticesProcessed).toBe(1)
    expect(tracker.events[0].event_type).toBe('notice_given')
  })
})

// ─── trackStatusAutoFix ───────────────────────────────────────────────────────

describe('trackStatusAutoFix', () => {
  it('appends formatted string to statusAutoFixes', () => {
    tracker.trackStatusAutoFix('SB', '101', 'Current→Past')
    tracker.trackStatusAutoFix('SB', '102', 'Applicant→Canceled')
    expect(tracker.propertySummaries['SB'].statusAutoFixes).toEqual([
      '101: Current→Past',
      '102: Applicant→Canceled',
    ])
  })

  it('does not emit an event', () => {
    tracker.trackStatusAutoFix('SB', '101', 'fix')
    expect(tracker.events).toHaveLength(0)
  })
})

// ─── trackAvailabilityChanges ─────────────────────────────────────────────────

describe('trackAvailabilityChanges', () => {
  it('accumulates new and update counts', () => {
    tracker.trackAvailabilityChanges('SB', 1, 4)
    tracker.trackAvailabilityChanges('SB', 0, 2)
    expect(tracker.propertySummaries['SB'].availabilitiesNew).toBe(1)
    expect(tracker.propertySummaries['SB'].availabilitiesUpdated).toBe(6)
  })
})

// ─── trackFlag ────────────────────────────────────────────────────────────────

describe('trackFlag', () => {
  it('increments makereadyFlags for makeready_overdue', () => {
    tracker.trackFlag('SB', 'makeready_overdue')
    tracker.trackFlag('SB', 'makeready_overdue', 2)
    expect(tracker.propertySummaries['SB'].makereadyFlags).toBe(3)
  })

  it('increments applicationFlags for application_overdue', () => {
    tracker.trackFlag('SB', 'application_overdue', 1)
    expect(tracker.propertySummaries['SB'].applicationFlags).toBe(1)
  })

  it('increments transferFlags for unit_transfer_active', () => {
    tracker.trackFlag('SB', 'unit_transfer_active', 1)
    expect(tracker.propertySummaries['SB'].transferFlags).toBe(1)
  })

  it('ignores unknown flag types', () => {
    tracker.trackFlag('SB', 'unknown_flag', 1)
    const s = tracker.propertySummaries['SB']
    expect(s.makereadyFlags).toBe(0)
    expect(s.applicationFlags).toBe(0)
    expect(s.transferFlags).toBe(0)
  })

  it('defaults count to 1 when not specified', () => {
    tracker.trackFlag('SB', 'makeready_overdue')
    expect(tracker.propertySummaries['SB'].makereadyFlags).toBe(1)
  })
})

// ─── trackApplication ─────────────────────────────────────────────────────────

describe('trackApplication', () => {
  it('increments applicationsSaved and pushes event', () => {
    tracker.trackApplication('SB', { applicant_name: 'Jane', unit_name: '101', unit_id: 'u1', application_date: '2026-02-01' })
    expect(tracker.propertySummaries['SB'].applicationsSaved).toBe(1)
    expect(tracker.events[0].event_type).toBe('application_saved')
  })
})

// ─── trackPriceChange ─────────────────────────────────────────────────────────

describe('trackPriceChange', () => {
  it('increments priceChanges and pushes event', () => {
    tracker.trackPriceChange('SB', { unit_name: '305', unit_id: 'u3', old_rent: 1750, new_rent: 1800, change_amount: 50, change_percent: 2.86 })
    expect(tracker.propertySummaries['SB'].priceChanges).toBe(1)
    expect(tracker.events[0].event_type).toBe('price_change')
  })
})

// ─── trackNewLeaseSigned ──────────────────────────────────────────────────────

describe('trackNewLeaseSigned', () => {
  it('increments newLeasesSigned and pushes lease_signed event', () => {
    tracker.trackNewLeaseSigned('SB', { tenancy_id: 't1', resident_name: 'Bob', unit_name: '202', unit_id: 'u2', move_in_date: '2026-03-01', rent_amount: 1850 })
    expect(tracker.propertySummaries['SB'].newLeasesSigned).toBe(1)
    expect(tracker.events[0].event_type).toBe('lease_signed')
  })
})

// ─── multi-property isolation ─────────────────────────────────────────────────

describe('multi-property isolation', () => {
  it('keeps separate counters per property', () => {
    tracker.trackNewTenancy('SB', { tenancy_id: 't1', resident_name: 'Alice', unit_name: '101', unit_id: 'u1', status: 'Current', source: 'test' })
    tracker.trackNewTenancy('SB', { tenancy_id: 't2', resident_name: 'Bob', unit_name: '102', unit_id: 'u2', status: 'Current', source: 'test' })
    tracker.trackNewTenancy('RS', { tenancy_id: 't3', resident_name: 'Carol', unit_name: '205', unit_id: 'u3', status: 'Future', source: 'test' })

    expect(tracker.propertySummaries['SB'].tenanciesNew).toBe(2)
    expect(tracker.propertySummaries['RS'].tenanciesNew).toBe(1)
  })

  it('events contain correct property_code for each property', () => {
    tracker.trackNewTenancy('SB', { tenancy_id: 't1', resident_name: 'Alice', unit_name: '101', unit_id: 'u1', status: 'Current', source: 'test' })
    tracker.trackNewTenancy('RS', { tenancy_id: 't2', resident_name: 'Bob', unit_name: '205', unit_id: 'u2', status: 'Future', source: 'test' })

    const sbEvent = tracker.events.find((e) => e.property_code === 'SB')
    const rsEvent = tracker.events.find((e) => e.property_code === 'RS')
    expect(sbEvent?.event_type).toBe('new_tenancy')
    expect(rsEvent?.event_type).toBe('new_tenancy')
  })
})
