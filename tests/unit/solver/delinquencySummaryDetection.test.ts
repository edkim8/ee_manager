import { describe, it, expect, beforeEach } from 'vitest'
import { isDelinquencySummaryFormat } from '../../../layers/admin/utils/solverUtils'
import { createSolverTrackingState } from '../../../layers/admin/utils/solverTrackingState'

// ─── isDelinquencySummaryFormat ───────────────────────────────────────────────

describe('isDelinquencySummaryFormat', () => {
  // Individual-format rows — the happy path (must NOT be flagged)
  const individualRows = [
    {
      property_code: 'SB',
      unit_name: '2019',
      tenancy_id: 'rs-0001',
      resident: 'Smith, John',
      total_unpaid: 500,
      days_0_30: 500,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
      prepays: 0,
      balance: 500,
    },
    {
      property_code: 'SB',
      unit_name: '3125',
      tenancy_id: 'rs-0002',
      resident: 'Doe, Jane',
      total_unpaid: 1200,
      days_0_30: 0,
      days_31_60: 1200,
      days_61_90: 0,
      days_90_plus: 0,
      prepays: 0,
      balance: 1200,
    },
  ]

  // Summary-format rows — tenancy_id and resident are null/missing
  const summaryRows = [
    {
      property_code: 'SB',
      unit_name: null,
      tenancy_id: null,
      resident: null,
      total_unpaid: 3400,
      days_0_30: 1700,
      days_31_60: 1200,
      days_61_90: 0,
      days_90_plus: 500,
      prepays: 0,
      balance: 3400,
    },
    {
      property_code: null,
      unit_name: null,
      tenancy_id: null,
      resident: null,
      total_unpaid: 3400,
      days_0_30: 1700,
      days_31_60: 1200,
      days_61_90: 0,
      days_90_plus: 500,
      prepays: 0,
      balance: 3400,
    },
  ]

  // Summary-format rows with empty-string fields (not null, but still blank)
  const summaryRowsBlankStrings = [
    {
      property_code: 'RS',
      unit_name: '',
      tenancy_id: '',
      resident: '',
      total_unpaid: 800,
      balance: 800,
    },
  ]

  it('returns false for Individual-format rows (happy path — should NOT skip)', () => {
    expect(isDelinquencySummaryFormat(individualRows)).toBe(false)
  })

  it('returns true for Summary-format rows with null tenancy_id and resident', () => {
    expect(isDelinquencySummaryFormat(summaryRows)).toBe(true)
  })

  it('returns true for Summary-format rows with empty-string tenancy_id and resident', () => {
    expect(isDelinquencySummaryFormat(summaryRowsBlankStrings)).toBe(true)
  })

  it('returns false when only SOME rows are individual (mixed batch)', () => {
    // If at least one row has valid individual data, it is NOT a pure Summary export
    const mixed = [...summaryRows, individualRows[0]]
    expect(isDelinquencySummaryFormat(mixed)).toBe(false)
  })

  it('returns false for an empty array (no data to inspect — not a Summary file)', () => {
    expect(isDelinquencySummaryFormat([])).toBe(false)
  })

  it('handles rows where tenancy_id is present but resident is missing', () => {
    // Only tenancy_id present, resident null → still no full individual row
    const partialRows = [{ tenancy_id: 'rs-0001', resident: null }]
    expect(isDelinquencySummaryFormat(partialRows)).toBe(true)
  })

  it('handles rows where resident is present but tenancy_id is missing', () => {
    const partialRows = [{ tenancy_id: null, resident: 'Smith, John' }]
    expect(isDelinquencySummaryFormat(partialRows)).toBe(true)
  })

  it('returns false for a single valid individual row', () => {
    const singleRow = [individualRows[0]]
    expect(isDelinquencySummaryFormat(singleRow)).toBe(false)
  })
})

// ─── trackDiscrepancy ─────────────────────────────────────────────────────────

describe('trackDiscrepancy', () => {
  let tracker: ReturnType<typeof createSolverTrackingState>

  beforeEach(() => {
    tracker = createSolverTrackingState()
  })

  it('pushes a discrepancy event with correct fields', () => {
    tracker.trackDiscrepancy('SB', {
      message: 'DATA COMPROMISED: Received Summary format for Delinquencies instead of Individual format.',
      report_type: 'delinquencies',
    })

    expect(tracker.events).toHaveLength(1)
    const ev = tracker.events[0]
    expect(ev.event_type).toBe('discrepancy')
    expect(ev.property_code).toBe('SB')
    expect(ev.details.message).toContain('DATA COMPROMISED')
    expect(ev.details.report_type).toBe('delinquencies')
  })

  it('appends the message to the discrepancies summary array', () => {
    const msg = 'DATA COMPROMISED: Received Summary format for Delinquencies instead of Individual format.'
    tracker.trackDiscrepancy('RS', { message: msg, report_type: 'delinquencies' })

    expect(tracker.propertySummaries['RS'].discrepancies).toEqual([msg])
  })

  it('accumulates multiple discrepancies for the same property', () => {
    tracker.trackDiscrepancy('OB', { message: 'First problem', report_type: 'delinquencies' })
    tracker.trackDiscrepancy('OB', { message: 'Second problem', report_type: 'alerts' })

    expect(tracker.propertySummaries['OB'].discrepancies).toHaveLength(2)
    expect(tracker.events).toHaveLength(2)
  })

  it('auto-initializes property summary if not yet seen', () => {
    tracker.trackDiscrepancy('CV', {
      message: 'DATA COMPROMISED: Received Summary format for Delinquencies instead of Individual format.',
      report_type: 'delinquencies',
    })
    expect(tracker.propertySummaries['CV']).toBeDefined()
    expect(tracker.propertySummaries['CV'].tenanciesNew).toBe(0)
  })

  it('does not increment any numeric summary counter', () => {
    tracker.trackDiscrepancy('WO', {
      message: 'DATA COMPROMISED: Received Summary format for Delinquencies instead of Individual format.',
      report_type: 'delinquencies',
    })
    const s = tracker.propertySummaries['WO']
    expect(s.tenanciesNew).toBe(0)
    expect(s.leasesNew).toBe(0)
    expect(s.priceChanges).toBe(0)
    expect(s.makereadyFlags).toBe(0)
  })

  it('keeps discrepancies isolated per property', () => {
    tracker.trackDiscrepancy('SB', { message: 'SB issue', report_type: 'delinquencies' })
    tracker.trackDiscrepancy('RS', { message: 'RS issue', report_type: 'delinquencies' })

    expect(tracker.propertySummaries['SB'].discrepancies).toEqual(['SB issue'])
    expect(tracker.propertySummaries['RS'].discrepancies).toEqual(['RS issue'])
  })

  it('discrepancies array is cleared on reset', () => {
    tracker.trackDiscrepancy('SB', { message: 'problem', report_type: 'delinquencies' })
    tracker.reset()
    expect(tracker.events).toHaveLength(0)
    expect(Object.keys(tracker.propertySummaries)).toHaveLength(0)
  })
})

// ─── Integration: detection + tracking together ───────────────────────────────

describe('delinquency summary detection + tracking integration', () => {
  it('correctly identifies and logs a summary-format payload without crashing', () => {
    const tracker = createSolverTrackingState()

    const summaryPayload = [
      { property_code: 'SB', unit_name: null, tenancy_id: null, resident: null, balance: 5000 },
    ]

    // Simulate what the solver does
    if (isDelinquencySummaryFormat(summaryPayload)) {
      tracker.trackDiscrepancy('SB', {
        message: 'DATA COMPROMISED: Received Summary format for Delinquencies instead of Individual format.',
        report_type: 'delinquencies',
      })
    }

    expect(tracker.events).toHaveLength(1)
    expect(tracker.events[0].event_type).toBe('discrepancy')
    expect(tracker.propertySummaries['SB'].discrepancies[0]).toContain('DATA COMPROMISED')
  })

  it('does NOT log a discrepancy for a valid individual-format payload', () => {
    const tracker = createSolverTrackingState()

    const individualPayload = [
      { property_code: 'SB', unit_name: '2019', tenancy_id: 'rs-0001', resident: 'Smith, John', balance: 500 },
    ]

    if (isDelinquencySummaryFormat(individualPayload)) {
      tracker.trackDiscrepancy('SB', {
        message: 'DATA COMPROMISED: Received Summary format for Delinquencies instead of Individual format.',
        report_type: 'delinquencies',
      })
    }

    // Should NOT have triggered
    expect(tracker.events).toHaveLength(0)
  })
})
