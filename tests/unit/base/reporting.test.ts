import { describe, it, expect } from 'vitest'
import {
  generateMarkdownReport,
  type SolverEvent,
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
