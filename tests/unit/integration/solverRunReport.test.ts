/**
 * Integration test: SolverTracking state → generateMarkdownReport pipeline
 *
 * Validates that events fired through createSolverTrackingState() produce a
 * correctly structured markdown report when passed to generateMarkdownReport(),
 * without any Supabase or Nuxt dependencies.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createSolverTrackingState } from '../../../layers/admin/utils/solverTrackingState'
import { generateMarkdownReport } from '../../../layers/base/utils/reporting'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRun(
  tracker: ReturnType<typeof createSolverTrackingState>,
  propertiesProcessed: string[],
  batchId = 'batch-integ-001',
) {
  return {
    batch_id: batchId,
    upload_date: '2026-02-23T08:00:00.000Z',
    properties_processed: propertiesProcessed,
    summary: tracker.propertySummaries,
  }
}

// ─── Shared setup ─────────────────────────────────────────────────────────────

let tracker: ReturnType<typeof createSolverTrackingState>

beforeEach(() => {
  tracker = createSolverTrackingState()
})

// ─── Basic pipeline smoke test ────────────────────────────────────────────────

describe('tracker → report pipeline: basic structure', () => {
  it('produces a report with the batch_id when no events are fired', () => {
    const run = buildRun(tracker, [])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('# Solver Run Summary')
    expect(report).toContain('batch-integ-001')
  })

  it('includes a section for each property in properties_processed', () => {
    tracker.trackTenancyUpdates('SB', 5)
    tracker.trackTenancyUpdates('RS', 3)
    const run = buildRun(tracker, ['SB', 'RS'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('## Property: SB')
    expect(report).toContain('## Property: RS')
  })

  it('silently ignores unknown property codes in properties_processed', () => {
    tracker.initProperty('SB') // ensure SB has a zeroed summary
    const run = buildRun(tracker, ['SB', 'UNKNOWN'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('## Property: SB')
    expect(report).not.toContain('## Property: UNKNOWN')
  })
})

// ─── Summary counts flow through correctly ────────────────────────────────────

describe('tracker → report pipeline: summary counts', () => {
  it('reports the correct new resident count for SB', () => {
    tracker.trackNewTenancy('SB', { tenancy_id: 't1', resident_name: 'Alice', unit_name: '101', unit_id: 'u1', status: 'Current', source: 'test' })
    tracker.trackNewTenancy('SB', { tenancy_id: 't2', resident_name: 'Bob',   unit_name: '102', unit_id: 'u2', status: 'Current', source: 'test' })
    const run = buildRun(tracker, ['SB'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('**New Residents:** 2')
  })

  it('reports the correct renewal count', () => {
    tracker.trackLeaseRenewal('SB', {
      tenancy_id: 't1', unit_name: '201', unit_id: 'u1',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 1800 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 1950 },
    })
    const run = buildRun(tracker, ['SB'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('**Lease Renewals:** 1')
  })

  it('reports notices on file correctly', () => {
    tracker.trackNotice('RS', { tenancy_id: 't1', unit_name: '305', unit_id: 'u3', move_out_date: '2026-03-31' })
    tracker.trackNotice('RS', { tenancy_id: 't2', unit_name: '306', unit_id: 'u4', move_out_date: '2026-04-15' })
    const run = buildRun(tracker, ['RS'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('**Notices on File:** 2')
  })

  it('reports application count correctly', () => {
    tracker.trackApplication('SB', { applicant_name: 'Carol', unit_name: '110', unit_id: 'u5', application_date: '2026-02-20' })
    const run = buildRun(tracker, ['SB'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('**Applications:** 1')
  })

  it('reports flags from multiple types combined', () => {
    tracker.trackFlag('SB', 'makeready_overdue', 2)
    tracker.trackFlag('SB', 'application_overdue', 1)
    const run = buildRun(tracker, ['SB'])
    const report = generateMarkdownReport(run, tracker.events)
    // makereadyFlags(2) + applicationFlags(1) = 3
    expect(report).toContain('**Flags Created:** 3')
  })
})

// ─── Event tables flow through correctly ──────────────────────────────────────

describe('tracker → report pipeline: event tables', () => {
  it('renders the New Residents table with resident name and unit', () => {
    tracker.trackNewTenancy('SB', {
      tenancy_id: 't1', resident_name: 'Jane Smith', unit_name: '101',
      unit_id: 'u1', status: 'Current', source: 'test', move_in_date: '2026-02-01',
    })
    const run = buildRun(tracker, ['SB'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('### ✅ New Residents')
    expect(report).toContain('Jane Smith')
    expect(report).toContain('101')
  })

  it('renders the Lease Renewals table with old and new rent', () => {
    tracker.trackLeaseRenewal('SB', {
      tenancy_id: 't1', resident_name: 'John Doe', unit_name: '202', unit_id: 'u2',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 1800 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 1950 },
    })
    const run = buildRun(tracker, ['SB'])
    const report = generateMarkdownReport(run, tracker.events)
    expect(report).toContain('### 🔄 Lease Renewals')
    expect(report).toContain('John Doe')
    expect(report).toContain('$1800')
    expect(report).toContain('$1950')
  })

  it('shows rent increase direction symbol (↑) in renewal table', () => {
    tracker.trackLeaseRenewal('SB', {
      tenancy_id: 't1', unit_name: '202', unit_id: 'u2',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 1800 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 1900 },
    })
    const report = generateMarkdownReport(buildRun(tracker, ['SB']), tracker.events)
    expect(report).toContain('↑')
    expect(report).toContain('$100')
  })

  it('shows rent decrease direction symbol (↓) in renewal table', () => {
    tracker.trackLeaseRenewal('SB', {
      tenancy_id: 't1', unit_name: '202', unit_id: 'u2',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 1900 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 1800 },
    })
    const report = generateMarkdownReport(buildRun(tracker, ['SB']), tracker.events)
    expect(report).toContain('↓')
  })

  it('renders the Price Changes table with unit and rent values', () => {
    tracker.trackPriceChange('RS', {
      unit_name: '305', unit_id: 'u3',
      old_rent: 1750, new_rent: 1800, change_amount: 50, change_percent: 2.86,
    })
    const report = generateMarkdownReport(buildRun(tracker, ['RS']), tracker.events)
    expect(report).toContain('### 💰 Availability Price Changes')
    expect(report).toContain('305')
    expect(report).toContain('1750')
    expect(report).toContain('1800')
  })

  it('omits event sections entirely when no events of that type exist', () => {
    tracker.trackTenancyUpdates('SB', 5) // no events emitted
    const report = generateMarkdownReport(buildRun(tracker, ['SB']), tracker.events)
    expect(report).not.toContain('### ✅ New Residents')
    expect(report).not.toContain('### 🔄 Lease Renewals')
    expect(report).not.toContain('### 💰 Availability Price Changes')
  })
})

// ─── Multi-property full run ──────────────────────────────────────────────────

describe('tracker → report pipeline: realistic multi-property run', () => {
  it('produces a coherent report for a full two-property run', () => {
    // SB: 2 new tenants, 1 renewal, 1 price change, 3 notices
    tracker.trackNewTenancy('SB', { tenancy_id: 't1', resident_name: 'Alice A', unit_name: '101', unit_id: 'u1', status: 'Current', source: 'test' })
    tracker.trackNewTenancy('SB', { tenancy_id: 't2', resident_name: 'Bob B',   unit_name: '102', unit_id: 'u2', status: 'Future',  source: 'test' })
    tracker.trackLeaseRenewal('SB', {
      tenancy_id: 't3', resident_name: 'Carol C', unit_name: '201', unit_id: 'u3',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 2000 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 2100 },
    })
    tracker.trackPriceChange('SB', { unit_name: '301', unit_id: 'u4', old_rent: 1800, new_rent: 1850, change_amount: 50, change_percent: 2.78 })
    tracker.trackNotice('SB', { tenancy_id: 't5', unit_name: '401', unit_id: 'u5', move_out_date: '2026-03-31' })
    tracker.trackNotice('SB', { tenancy_id: 't6', unit_name: '402', unit_id: 'u6', move_out_date: '2026-04-15' })
    tracker.trackNotice('SB', { tenancy_id: 't7', unit_name: '403', unit_id: 'u7', move_out_date: '2026-04-30' })
    tracker.trackAvailabilityChanges('SB', 1, 26)

    // RS: 1 new tenant, 1 notice, 1 application
    tracker.trackNewTenancy('RS', { tenancy_id: 't8', resident_name: 'Dave D', unit_name: '205', unit_id: 'u8', status: 'Current', source: 'test' })
    tracker.trackNotice('RS', { tenancy_id: 't9', unit_name: '106', unit_id: 'u9', move_out_date: '2026-03-15' })
    tracker.trackApplication('RS', { applicant_name: 'Eve E', unit_name: '107', unit_id: 'u10', application_date: '2026-02-20' })
    tracker.trackAvailabilityChanges('RS', 0, 30)

    const run = buildRun(tracker, ['SB', 'RS'])
    const report = generateMarkdownReport(run, tracker.events)

    // Top-level structure
    expect(report).toContain('# Solver Run Summary')
    expect(report).toContain('batch-integ-001')

    // SB section
    expect(report).toContain('## Property: SB')
    expect(report).toContain('**New Residents:** 2')
    expect(report).toContain('**Lease Renewals:** 1')
    expect(report).toContain('**Notices on File:** 3')

    // RS section
    expect(report).toContain('## Property: RS')
    expect(report).toContain('**New Residents:** 1')
    expect(report).toContain('**Applications:** 1')

    // Event tables
    expect(report).toContain('Alice A')
    expect(report).toContain('Carol C')
    expect(report).toContain('Dave D')
    expect(report).toContain('↑')  // rent increased in renewal
  })

  it('isolates summaries correctly — SB counts do not bleed into RS', () => {
    tracker.trackLeaseRenewal('SB', {
      tenancy_id: 't1', unit_name: '201', unit_id: 'u1',
      old_lease: { start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 2000 },
      new_lease: { start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 2100 },
    })
    // RS has no events
    tracker.trackTenancyUpdates('RS', 3)

    const run = buildRun(tracker, ['SB', 'RS'])
    const report = generateMarkdownReport(run, tracker.events)

    expect(report).toContain('**Lease Renewals:** 1') // SB
    // RS renewal count should be 0
    const rsSectionStart = report.indexOf('## Property: RS')
    const rsSectionText = report.slice(rsSectionStart)
    expect(rsSectionText).toContain('**Lease Renewals:** 0')
  })
})
