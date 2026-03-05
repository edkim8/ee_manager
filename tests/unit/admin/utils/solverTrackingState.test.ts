import { describe, it, expect } from 'vitest'
import { createSolverTrackingState } from '../../../../layers/admin/utils/solverTrackingState'

describe('solverTrackingState', () => {
  it('initializes with empty state', () => {
    const tracker = createSolverTrackingState()
    expect(tracker.events).toHaveLength(0)
    expect(Object.keys(tracker.propertySummaries)).toHaveLength(0)
  })

  it('tracks new tenancy and auto-initializes property', () => {
    const tracker = createSolverTrackingState()
    const details = {
      tenancy_id: 't1',
      resident_name: 'John Doe',
      unit_name: '101',
      unit_id: 'u1',
      status: 'Current',
      source: 'Yardi'
    }

    tracker.trackNewTenancy('CV', details)

    expect(tracker.propertySummaries.CV.tenanciesNew).toBe(1)
    expect(tracker.events).toHaveLength(1)
    expect(tracker.events[0]).toMatchObject({
      property_code: 'CV',
      event_type: 'new_tenancy',
      details
    })
  })

  it('tracks cumulative tenancy updates', () => {
    const tracker = createSolverTrackingState()
    tracker.trackTenancyUpdates('CV', 5)
    tracker.trackTenancyUpdates('CV', 3)

    expect(tracker.propertySummaries.CV.tenanciesUpdated).toBe(8)
  })

  it('tracks lease renewals into events and summary', () => {
    const tracker = createSolverTrackingState()
    const details = {
      tenancy_id: 't1',
      unit_name: '101',
      unit_id: 'u1',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 1000 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 1100 }
    }

    tracker.trackLeaseRenewal('AP', details)

    expect(tracker.propertySummaries.AP.leasesRenewed).toBe(1)
    expect(tracker.events[0].event_type).toBe('lease_renewal')
  })

  it('tracks different flag types correctly', () => {
    const tracker = createSolverTrackingState()
    
    tracker.trackFlag('CV', 'makeready_overdue', 2)
    tracker.trackFlag('CV', 'application_overdue', 1)
    tracker.trackFlag('CV', 'unit_transfer_active', 3)

    expect(tracker.propertySummaries.CV.makereadyFlags).toBe(2)
    expect(tracker.propertySummaries.CV.applicationFlags).toBe(1)
    expect(tracker.propertySummaries.CV.transferFlags).toBe(3)
  })

  it('tracks price changes', () => {
    const tracker = createSolverTrackingState()
    const details = {
      unit_name: '102',
      unit_id: 'u2',
      old_rent: 1200,
      new_rent: 1250,
      change_amount: 50,
      change_percent: 4.16
    }

    tracker.trackPriceChange('RS', details)

    expect(tracker.propertySummaries.RS.priceChanges).toBe(1)
    expect(tracker.events[0].event_type).toBe('price_change')
  })

  it('resets state correctly', () => {
    const tracker = createSolverTrackingState()
    tracker.trackTenancyUpdates('CV', 1)
    tracker.trackNewTenancy('CV', { tenancy_id: 't1', resident_name: 'A', unit_name: 'B', unit_id: 'C', status: 'D', source: 'E' })
    
    tracker.reset()

    expect(tracker.events).toHaveLength(0)
    expect(Object.keys(tracker.propertySummaries)).toHaveLength(0)
  })

  it('tracks status auto-fixes', () => {
    const tracker = createSolverTrackingState()
    tracker.trackStatusAutoFix('CV', 'Unit 101', 'Past -> Current')
    
    expect(tracker.propertySummaries.CV.statusAutoFixes).toContain('Unit 101: Past -> Current')
  })
})
