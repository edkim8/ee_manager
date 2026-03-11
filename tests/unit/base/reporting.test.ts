import { describe, it, expect } from 'vitest'
import {
  generateMarkdownReport,
  generateHighFidelityHtmlReport,
  type SolverEvent,
  type OperationalSummary,
  type PropertySnapshotDeltas,
} from '../../../layers/base/utils/reporting'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeRun(overrides: Partial<any> = {}): any {
  return {
    batch_id: 'batch-test-001',
    upload_date: '2026-02-23T08:00:00.000Z',
    properties_processed: ['SB', 'RS'],
    summary: {
      SB: {
        tenanciesNew: 2, tenanciesUpdated: 5,
        residentsNew: 2, residentsUpdated: 5,
        leasesNew: 1, leasesUpdated: 3, leasesRenewed: 1,
        availabilitiesNew: 0, availabilitiesUpdated: 26,
        noticesProcessed: 16,
        statusAutoFixes: [],
        makereadyFlags: 1, applicationFlags: 0, transferFlags: 0,
        applicationsSaved: 2, priceChanges: 0,
      },
      RS: {
        tenanciesNew: 0, tenanciesUpdated: 3,
        residentsNew: 0, residentsUpdated: 3,
        leasesNew: 0, leasesUpdated: 2, leasesRenewed: 0,
        availabilitiesNew: 0, availabilitiesUpdated: 30,
        noticesProcessed: 8,
        statusAutoFixes: [],
        makereadyFlags: 0, applicationFlags: 1, transferFlags: 0,
        applicationsSaved: 1, priceChanges: 0,
      },
    },
    ...overrides,
  }
}

const renewalEvent: SolverEvent = {
  property_code: 'SB',
  event_type: 'lease_renewal',
  details: {
    resident_name: 'Jane Smith',
    unit_name: '101',
    old_lease: { rent_amount: 1800 },
    new_lease: { rent_amount: 1900 },
  },
}

const newTenancyEvent: SolverEvent = {
  property_code: 'RS',
  event_type: 'new_tenancy',
  details: {
    resident_name: 'John Doe',
    unit_name: '205',
    status: 'Current',
    move_in_date: '2026-02-01',
  },
}

const priceChangeEvent: SolverEvent = {
  property_code: 'SB',
  event_type: 'price_change',
  details: {
    unit_name: '305',
    old_rent: 1750,
    new_rent: 1800,
    change_amount: 50,
    change_percent: 2.86,
  },
}

const noticeEvent: SolverEvent = {
  property_code: 'SB',
  event_type: 'notice_given',
  details: {
    resident_name: 'Bob Jones',
    unit_name: '102',
    move_out_date: '2026-03-31',
    status_change: 'Notice',
  },
}

// ─── generateMarkdownReport ───────────────────────────────────────────────────

describe('generateMarkdownReport', () => {
  describe('structure', () => {
    it('starts with # Solver Run Summary heading', () => {
      const output = generateMarkdownReport(makeRun(), [])
      expect(output.trimStart()).toMatch(/^# Solver Run Summary/)
    })

    it('includes the batch_id', () => {
      const output = generateMarkdownReport(makeRun(), [])
      expect(output).toContain('batch-test-001')
    })

    it('includes a section for each processed property', () => {
      const output = generateMarkdownReport(makeRun(), [])
      expect(output).toContain('## Property: SB')
      expect(output).toContain('## Property: RS')
    })

    it('includes human-readable property names', () => {
      const output = generateMarkdownReport(makeRun(), [])
      expect(output).toContain('Stonebridge')
      expect(output).toContain('Residences')
    })
  })

  describe('property filtering', () => {
    it('excludes unknown property codes from properties_processed', () => {
      const run = makeRun({ properties_processed: ['SB', 'UNKNOWN', 'RS'] })
      const output = generateMarkdownReport(run, [])
      expect(output).not.toContain('## Property: UNKNOWN')
      expect(output).toContain('## Property: SB')
    })

    it('handles empty properties_processed gracefully', () => {
      const run = makeRun({ properties_processed: [] })
      const output = generateMarkdownReport(run, [])
      expect(output).toContain('# Solver Run Summary')
      expect(output).not.toContain('## Property:')
    })
  })

  describe('event sections', () => {
    it('includes renewal table when renewal events exist', () => {
      const output = generateMarkdownReport(makeRun(), [renewalEvent])
      expect(output).toContain('Lease Renewals')
      expect(output).toContain('Jane Smith')
      expect(output).toContain('$1800')
      expect(output).toContain('$1900')
    })

    it('includes new tenancy table when new_tenancy events exist', () => {
      const output = generateMarkdownReport(makeRun(), [newTenancyEvent])
      expect(output).toContain('New Residents')
      expect(output).toContain('John Doe')
      expect(output).toContain('205')
    })

    it('includes price change table when price_change events exist', () => {
      const output = generateMarkdownReport(makeRun(), [priceChangeEvent])
      expect(output).toContain('Price Changes')
      expect(output).toContain('305')
    })

    it('omits sections entirely when no events of that type', () => {
      const output = generateMarkdownReport(makeRun(), [])
      expect(output).not.toContain('### ✅ New Residents')
      expect(output).not.toContain('### 🔄 Lease Renewals')
      expect(output).not.toContain('### 💰 Availability Price Changes')
    })

    it('rent change direction is shown correctly', () => {
      const output = generateMarkdownReport(makeRun(), [renewalEvent])
      // $100 increase from 1800 → 1900
      expect(output).toContain('↑')
      expect(output).toContain('$100')
    })

    it('handles rent decrease direction', () => {
      const decreaseEvent: SolverEvent = {
        ...renewalEvent,
        details: {
          ...renewalEvent.details,
          old_lease: { rent_amount: 1900 },
          new_lease: { rent_amount: 1800 },
        },
      }
      const output = generateMarkdownReport(makeRun(), [decreaseEvent])
      expect(output).toContain('↓')
    })
  })

  describe('property summary fields', () => {
    it('shows notice count for SB', () => {
      const output = generateMarkdownReport(makeRun(), [])
      // SB has 16 notices in the mock
      expect(output).toContain('16')
    })

    it('shows application count', () => {
      const output = generateMarkdownReport(makeRun(), [])
      // SB has 2 applicationsSaved
      expect(output).toContain('2')
    })
  })
})

// ─── generateHighFidelityHtmlReport ───────────────────────────────────────────

const mockOpSummary: OperationalSummary = {
  alerts: { active: 3, newToday: 1, closedToday: 0 },
  workOrders: { open: 12, newToday: 2, completedToday: 1 },
  makeReady: { active: 4, overdue: 1, readyThisWeek: 0 },
  delinquencies: { count: 7, totalAmount: 14250.50, over90Days: 2 },
  technical: { filesProcessed: 5, filesWithErrors: 0, status: 'completed', errorMessage: null },
}

describe('generateHighFidelityHtmlReport', () => {
  describe('structure', () => {
    it('contains the upload date (not raw batch ID as heading)', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).toContain('Daily Solver Report')
      // Date should appear as a readable string (not epoch number)
      expect(html).toContain('2026')
    })

    it('includes the batch_id in a secondary position', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).toContain('batch-test-001')
    })

    it('contains Property Breakdown section', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).toContain('Property Breakdown')
    })

    it('renders property name for each processed property', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).toContain('Stonebridge')
    })

    it('contains a footer', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).toContain('EE Manager V2')
    })
  })

  describe('event tables', () => {
    it('shows new residents table when new_tenancy events exist', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [newTenancyEvent])
      expect(html).toContain('New Residents')
      expect(html).toContain('John Doe')
      expect(html).toContain('205')
    })

    it('omits new residents section when no new_tenancy events', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).not.toContain('New Residents')
    })

    it('shows lease renewals table when renewal events exist', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [renewalEvent])
      expect(html).toContain('Lease Renewals')
      expect(html).toContain('Jane Smith')
      expect(html).toContain('$1800')
      expect(html).toContain('$1900')
    })

    it('shows price change table when price_change events exist', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [priceChangeEvent])
      expect(html).toContain('Price Changes')
      expect(html).toContain('305')
      expect(html).toContain('$1750')
      expect(html).toContain('$1800')
    })

    it('does NOT show a separate "Current Availabilities" stub section', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [priceChangeEvent])
      expect(html).not.toContain('Current Availabilities')
      expect(html).not.toContain('View Full Availabilities Dashboard')
    })

    it('does NOT contain "coming soon" placeholder text', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [noticeEvent])
      expect(html).not.toContain('coming soon')
    })

    it('omits event tables when no matching events exist', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      // Use emoji-prefixed titles which only appear in event section headers, not property breakdown labels
      expect(html).not.toContain('🔄 Lease Renewals')
      expect(html).not.toContain('💰 Price Changes')
      expect(html).not.toContain('📝 New Applications')
      expect(html).not.toContain('👤 New Residents')
    })
  })

  describe('notices section', () => {
    it('shows notices section with aggregate summary when notice events exist', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [noticeEvent])
      expect(html).toContain('Notices on File')
      expect(html).toContain('1 total')
    })

    it('shows individual resident detail rows in notices section', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [noticeEvent])
      expect(html).toContain('Bob Jones')
      expect(html).toContain('102')
      expect(html).toContain('2026-03-31')
    })

    it('aggregates counts by property in notices summary table', () => {
      const secondNotice: SolverEvent = {
        property_code: 'SB',
        event_type: 'notice_given',
        details: { resident_name: 'Alice Wu', unit_name: '201', move_out_date: '2026-04-15', status_change: 'Notice' },
      }
      const html = generateHighFidelityHtmlReport(makeRun(), [noticeEvent, secondNotice])
      expect(html).toContain('2 total')
      expect(html).toContain('Bob Jones')
      expect(html).toContain('Alice Wu')
    })

    it('omits notices section when no notice events', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).not.toContain('Notices on File')
    })
  })

  describe('operational summary', () => {
    it('shows operational summary boxes when provided', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], mockOpSummary)
      expect(html).toContain('Operational Summary')
      expect(html).toContain('Alerts')
      expect(html).toContain('Work Orders')
      expect(html).toContain('Delinquencies')
    })

    it('shows delinquency total amount formatted as currency', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], mockOpSummary)
      expect(html).toContain('$14,250.50')
    })

    it('shows technical health section with status', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], mockOpSummary)
      expect(html).toContain('Technical Health')
      expect(html).toContain('SUCCESS')
    })

    it('shows error message when technical status is failed', () => {
      const failedSummary: OperationalSummary = {
        ...mockOpSummary,
        technical: { filesProcessed: 2, filesWithErrors: 1, status: 'failed', errorMessage: 'Parse failure on RS' },
      }
      const html = generateHighFidelityHtmlReport(makeRun(), [], failedSummary)
      expect(html).toContain('FAILED')
      expect(html).toContain('Parse failure on RS')
    })

    it('omits operational summary section when not provided', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      expect(html).not.toContain('Operational Summary')
    })
  })

  describe('property filtering', () => {
    it('excludes unknown property codes from breakdown', () => {
      const run = makeRun({ properties_processed: ['SB', 'UNKNOWN'] })
      const html = generateHighFidelityHtmlReport(run, [])
      expect(html).not.toContain('UNKNOWN')
    })
  })

  describe('snapshot deltas', () => {
    const deltas: PropertySnapshotDeltas = {
      SB: { available_count: 11, available_delta: -2, avg_contracted_rent: 1642, rent_delta: 8 },
      RS: { available_count: 8,  available_delta: 0,  avg_contracted_rent: 1490, rent_delta: null },
    }

    it('shows available_count from snapshot instead of new/updated event counts', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], undefined, '', deltas)
      expect(html).toContain('11 units')
      expect(html).toContain('8 units')
    })

    it('shows negative delta (units leased) in green with minus sign', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], undefined, '', deltas)
      // −2 means 2 units leased = good = green
      expect(html).toContain('(-2)')
      expect(html).toContain('#059669') // green color for fewer vacancies
    })

    it('shows zero available_delta as "no change"', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], undefined, '', deltas)
      expect(html).toContain('no change')
    })

    it('shows avg_contracted_rent with positive rent delta in green', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], undefined, '', deltas)
      expect(html).toContain('$1,642')
      expect(html).toContain('(+$8)')
    })

    it('omits rent delta when null (no prior snapshot)', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [], undefined, '', deltas)
      // RS has rent_delta: null — should not show any delta badge for rent
      // $1,490 should appear but without a (+/-) delta
      expect(html).toContain('$1,490')
      expect(html).not.toContain('(+$0)')
    })

    it('falls back to new/updated event counts when no snapshot provided', () => {
      const html = generateHighFidelityHtmlReport(makeRun(), [])
      // SB summary has availabilitiesUpdated: 26 — should appear without snapshot
      expect(html).toContain('0 new · 26 updated')
    })
  })
})
