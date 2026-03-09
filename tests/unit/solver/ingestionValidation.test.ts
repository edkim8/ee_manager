import { describe, it, expect } from 'vitest'
import {
  classifyParseResult,
  computeBatchManifest,
  type ParseResultInput,
  type ParserEntry,
} from '../../../layers/admin/utils/ingestionValidation'

// ─── classifyParseResult ──────────────────────────────────────────────────────

describe('classifyParseResult', () => {
  // ── ok: no errors, data present ────────────────────────────────────────────

  describe('outcome: ok', () => {
    it('returns ok when there are no errors and rows exist', () => {
      const result = classifyParseResult({ errors: [], data: [{ unit: '101' }] })
      expect(result.outcome).toBe('ok')
      expect(result.message).toBeNull()
    })

    it('returns ok for large datasets with no errors', () => {
      const data = Array.from({ length: 500 }, (_, i) => ({ unit: String(i) }))
      const result = classifyParseResult({ errors: [], data })
      expect(result.outcome).toBe('ok')
    })
  })

  // ── error: errors present + zero rows ──────────────────────────────────────
  // Scenario: wrong file format, missing required headers — parser gave up and returned no data.

  describe('outcome: error', () => {
    it('returns error when errors are present and data is empty', () => {
      const result = classifyParseResult({
        errors: ['Invalid format. Missing required columns: Property, Unit'],
        data: [],
      })
      expect(result.outcome).toBe('error')
      expect(result.message).toBe('Invalid format. Missing required columns: Property, Unit')
    })

    it('uses fallback message when errors array has an empty string', () => {
      const result = classifyParseResult({ errors: [''], data: [] })
      expect(result.outcome).toBe('error')
      expect(result.message).toBe('Parse failed — file produced no valid rows')
    })

    it('uses first error message when multiple errors exist', () => {
      const result = classifyParseResult({
        errors: ['First error', 'Second error'],
        data: [],
      })
      expect(result.outcome).toBe('error')
      expect(result.message).toBe('First error')
    })
  })

  // ── warnings: errors present but partial data returned ─────────────────────
  // Scenario: parser succeeded on most rows but flagged some issues.

  describe('outcome: warnings', () => {
    it('returns warnings when errors and data are both present', () => {
      const result = classifyParseResult({
        errors: ['Row 12 skipped: invalid date'],
        data: [{ unit: '101' }, { unit: '102' }],
      })
      expect(result.outcome).toBe('warnings')
      expect(result.message).toBe('Uploaded with 1 warning')
    })

    it('pluralises correctly for multiple warnings', () => {
      const result = classifyParseResult({
        errors: ['err1', 'err2', 'err3'],
        data: [{ unit: '101' }],
      })
      expect(result.outcome).toBe('warnings')
      expect(result.message).toBe('Uploaded with 3 warnings')
    })

    it('uses singular "warning" for exactly 1 error', () => {
      const result = classifyParseResult({
        errors: ['one issue'],
        data: [{ unit: '101' }],
      })
      expect(result.message).toContain('1 warning')
      expect(result.message).not.toContain('warnings')
    })
  })

  // ── empty_warning: no errors but zero valid rows ────────────────────────────
  // Scenario: file has valid headers but all data rows failed isRowValid().
  // Not a format error — the file parsed cleanly but was effectively empty.

  describe('outcome: empty_warning', () => {
    it('returns empty_warning when no errors but data is empty', () => {
      const result = classifyParseResult({ errors: [], data: [] })
      expect(result.outcome).toBe('empty_warning')
      expect(result.message).toBe('Warning: file parsed but contains no valid data rows')
    })
  })

  // ── Priority: error beats empty_warning ────────────────────────────────────

  describe('error takes priority over empty_warning', () => {
    it('returns error (not empty_warning) when errors exist with zero data', () => {
      const result = classifyParseResult({ errors: ['bad format'], data: [] })
      expect(result.outcome).toBe('error')
    })
  })
})

// ─── computeBatchManifest ─────────────────────────────────────────────────────

const MOCK_PARSERS: ParserEntry[] = [
  { id: 'residents_status', label: 'Residents Status', required: true },
  { id: 'expiring_leases',  label: 'Expiring Leases',  required: true },
  { id: 'notices',          label: 'Notices',          required: false },
  { id: 'availables',       label: 'Availables',       required: false },
  { id: 'applications',     label: 'Applications',     required: false },
  { id: 'make_ready',       label: 'Make Ready',       required: false },
  { id: 'transfers',        label: 'Transfers',        required: false },
  { id: 'leased_units',     label: 'Leased Units',     required: false },
  { id: 'alerts',           label: 'Alerts',           required: false },
  { id: 'work_orders',      label: 'Work Orders',      required: false },
  { id: 'delinquencies',    label: 'Delinquencies',    required: false },
]

describe('computeBatchManifest', () => {
  // ── Full batch — all 11 files present ──────────────────────────────────────

  describe('full batch (all files present)', () => {
    it('reports zero missing files when all 11 parsers are staged', () => {
      const stagedIds = new Set(MOCK_PARSERS.map(p => p.id))
      const { missingFiles, missingRequired } = computeBatchManifest(stagedIds, MOCK_PARSERS)
      expect(missingFiles).toHaveLength(0)
      expect(missingRequired).toHaveLength(0)
    })
  })

  // ── Alerts exemption ───────────────────────────────────────────────────────
  // Yardi produces no file when there are no active alerts.
  // Absent alerts must NOT appear in missingFiles.

  describe('alerts exemption', () => {
    it('does not include alerts in missingFiles when absent', () => {
      const stagedIds = new Set(MOCK_PARSERS.map(p => p.id).filter(id => id !== 'alerts'))
      const { missingFiles } = computeBatchManifest(stagedIds, MOCK_PARSERS)
      const alertsMissing = missingFiles.find(p => p.id === 'alerts')
      expect(alertsMissing).toBeUndefined()
    })

    it('reports 0 missing files when only alerts is absent', () => {
      const stagedIds = new Set(MOCK_PARSERS.map(p => p.id).filter(id => id !== 'alerts'))
      const { missingFiles } = computeBatchManifest(stagedIds, MOCK_PARSERS)
      expect(missingFiles).toHaveLength(0)
    })

    it('includes alerts in missingFiles when a custom exempt id is used and alerts is not exempt', () => {
      const stagedIds = new Set<string>() // nothing staged
      const { missingFiles } = computeBatchManifest(stagedIds, MOCK_PARSERS, 'work_orders') // exempt WO instead
      const alertsMissing = missingFiles.find(p => p.id === 'alerts')
      expect(alertsMissing).toBeDefined()
    })
  })

  // ── Missing non-required files ─────────────────────────────────────────────

  describe('missing optional files', () => {
    it('reports missing optional files in missingFiles', () => {
      // Stage everything except make_ready and delinquencies
      const stagedIds = new Set(
        MOCK_PARSERS.map(p => p.id).filter(id => id !== 'make_ready' && id !== 'delinquencies'),
      )
      const { missingFiles, missingRequired } = computeBatchManifest(stagedIds, MOCK_PARSERS)
      expect(missingFiles.map(p => p.id)).toContain('make_ready')
      expect(missingFiles.map(p => p.id)).toContain('delinquencies')
      expect(missingRequired).toHaveLength(0) // neither is required
    })

    it('yesterday regression — missing 5p_MakeReady is detected (W6 scenario)', () => {
      const stagedIds = new Set(
        MOCK_PARSERS.map(p => p.id).filter(id => id !== 'make_ready'),
      )
      const { missingFiles } = computeBatchManifest(stagedIds, MOCK_PARSERS)
      expect(missingFiles.find(p => p.id === 'make_ready')).toBeDefined()
    })
  })

  // ── Missing required files ─────────────────────────────────────────────────

  describe('missing required files', () => {
    it('populates missingRequired when a required file is absent', () => {
      const stagedIds = new Set(['expiring_leases']) // missing residents_status
      const { missingRequired } = computeBatchManifest(stagedIds, MOCK_PARSERS)
      expect(missingRequired.map(p => p.id)).toContain('residents_status')
    })

    it('reports both required files missing when batch is empty', () => {
      const { missingRequired } = computeBatchManifest(new Set(), MOCK_PARSERS)
      expect(missingRequired.map(p => p.id)).toContain('residents_status')
      expect(missingRequired.map(p => p.id)).toContain('expiring_leases')
      expect(missingRequired).toHaveLength(2)
    })
  })

  // ── presentIds passthrough ─────────────────────────────────────────────────

  describe('presentIds', () => {
    it('returns the same staged set as presentIds', () => {
      const stagedIds = new Set(['residents_status', 'notices'])
      const { presentIds } = computeBatchManifest(stagedIds, MOCK_PARSERS)
      expect(presentIds).toBe(stagedIds)
    })
  })

  // ── Empty batch ────────────────────────────────────────────────────────────

  describe('empty batch', () => {
    it('lists all non-alerts parsers as missing when nothing is staged', () => {
      const { missingFiles } = computeBatchManifest(new Set(), MOCK_PARSERS)
      const expectedMissing = MOCK_PARSERS.filter(p => p.id !== 'alerts')
      expect(missingFiles).toHaveLength(expectedMissing.length)
    })
  })
})
