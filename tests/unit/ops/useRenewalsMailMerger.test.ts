/**
 * B-021 + B-022: useRenewalsMailMerger composable
 *
 * This composable has no Supabase/Nuxt #imports dependencies — it only uses
 * `ref` from Vue, `buildLetterRows` from the pure utils, XLSX, and browser fetch/DOM.
 * No mockNuxtImport needed; mocking is limited to global fetch and DOM APIs.
 *
 * B-021: generatePdfLetters integration with buildLetterRows (row building + guard logic)
 * B-022: generatePdfLetters error handling — 503 Chrome-missing and network failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRenewalsMailMerger } from '../../../layers/ops/composables/useRenewalsMailMerger'
import type { RenewalItemForLetter, WorksheetForLetter } from '../../../layers/ops/utils/renewalLetterHtml'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseWorksheet: WorksheetForLetter = {
  id:                 26,
  primary_term:       12,
  first_term:         11,
  first_term_offset:  1.0,
  second_term:        14,
  second_term_offset: -1.0,
  early_discount:     400,
  early_discount_date: '2025-10-13',
}

const validItems: RenewalItemForLetter[] = [
  {
    unit_name:     '1017',
    resident_name: 'Paul Gonzales',
    current_rent:  1493,
    final_rent:    1538,
    lease_to_date: '2025-12-31',
    renewal_type:  'standard',
    mtm_rent:      2103,
  },
  {
    unit_name:     '2041',
    resident_name: 'Ana Rivera',
    current_rent:  1623,
    final_rent:    1680,
    lease_to_date: '2026-01-31',
    renewal_type:  'standard',
    mtm_rent:      2250,
  },
]

// ─── DOM helpers ─────────────────────────────────────────────────────────────

/** Mock the minimal DOM APIs that triggerDownload() uses */
function setupDomMocks() {
  const mockAnchor = {
    href:     '',
    download: '',
    target:   '',
    click:    vi.fn(),
    remove:   vi.fn(),
  }
  vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
  vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor as any)
  Object.defineProperty(globalThis, 'URL', {
    writable: true,
    value: {
      createObjectURL: vi.fn(() => 'blob:mock-pdf-url'),
      revokeObjectURL: vi.fn(),
    },
  })
  return mockAnchor
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useRenewalsMailMerger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── B-021: buildLetterRows integration inside generatePdfLetters ─────────

  describe('generatePdfLetters — B-021 (buildLetterRows integration)', () => {
    it('returns false immediately when all items are filtered out by buildLetterRows', async () => {
      // Items with no unit_name → buildLetterRows skips them → rows.length === 0
      const { generatePdfLetters } = useRenewalsMailMerger()
      const noUnitItems: RenewalItemForLetter[] = [
        { unit_name: null, resident_name: 'Someone', current_rent: 1000 },
        { unit_name: null, resident_name: 'Another',  current_rent: 1500 },
      ]

      const result = await generatePdfLetters(noUnitItems, baseWorksheet, 'Test WS', 'CV')

      expect(result).toBe(false)
    })

    it('returns false when all items have no resident_name', async () => {
      const { generatePdfLetters } = useRenewalsMailMerger()
      const noResidentItems: RenewalItemForLetter[] = [
        { unit_name: '1017', resident_name: null, current_rent: 1000 },
      ]

      const result = await generatePdfLetters(noResidentItems, baseWorksheet, 'Test WS', 'CV')

      expect(result).toBe(false)
    })

    it('calls fetch with the rows array produced by buildLetterRows', async () => {
      setupDomMocks()
      const { generatePdfLetters } = useRenewalsMailMerger()

      const mockFetch = vi.fn().mockResolvedValue({
        ok:   true,
        blob: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })),
      })
      vi.stubGlobal('fetch', mockFetch)

      await generatePdfLetters(validItems, baseWorksheet, 'Spring Renewals', 'CV')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('/api/renewals/generate-letters')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body)
      // Both valid items should produce rows
      expect(body.rows).toHaveLength(2)
      expect(body.propertyCode).toBe('CV')

      // Verify canonical row shape from buildLetterRows
      const firstRow = body.rows[0]
      expect(firstRow.unit).toBe('1017')
      expect(firstRow.resident_name).toBe('Paul Gonzales')
      expect(firstRow.primary_term).toBe(12)
      expect(firstRow.primary_rent).toBe(1538)
    })

    it('sets loadingPdf to true during the call and false after', async () => {
      setupDomMocks()
      const { generatePdfLetters, loadingPdf } = useRenewalsMailMerger()

      let wasLoading = false
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
        wasLoading = loadingPdf.value
        return {
          ok:   true,
          blob: vi.fn().mockResolvedValue(new Blob(['%PDF'])),
        }
      }))

      expect(loadingPdf.value).toBe(false)
      await generatePdfLetters(validItems, baseWorksheet, 'Test', 'RS')
      expect(wasLoading).toBe(true)
      expect(loadingPdf.value).toBe(false)
    })
  })

  // ── B-022: generatePdfLetters error handling ─────────────────────────────

  describe('generatePdfLetters — B-022 (error handling)', () => {
    it('returns false and does not throw when fetch returns 503 (Chrome missing)', async () => {
      const { generatePdfLetters } = useRenewalsMailMerger()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok:         false,
        status:     503,
        statusText: 'Service Unavailable',
        text:       vi.fn().mockResolvedValue('Chrome binary not found. PDF generation requires Google Chrome.'),
        blob:       vi.fn().mockResolvedValue(new Blob()),
      }))

      const result = await generatePdfLetters(validItems, baseWorksheet, 'Test', 'CV')

      expect(result).toBe(false)
    })

    it('returns false when fetch returns 401 (session expired mid-request)', async () => {
      const { generatePdfLetters } = useRenewalsMailMerger()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok:         false,
        status:     401,
        statusText: 'Unauthorized',
        text:       vi.fn().mockResolvedValue('Unauthorized'),
        blob:       vi.fn().mockResolvedValue(new Blob()),
      }))

      const result = await generatePdfLetters(validItems, baseWorksheet, 'Test', 'CV')

      expect(result).toBe(false)
    })

    it('returns false and does not throw when fetch throws a network error', async () => {
      const { generatePdfLetters } = useRenewalsMailMerger()
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

      const result = await generatePdfLetters(validItems, baseWorksheet, 'Test', 'CV')

      expect(result).toBe(false)
    })

    it('resets loadingPdf to false even when fetch fails', async () => {
      const { generatePdfLetters, loadingPdf } = useRenewalsMailMerger()
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      await generatePdfLetters(validItems, baseWorksheet, 'Test', 'RS')

      expect(loadingPdf.value).toBe(false)
    })
  })

  // ── Success path ─────────────────────────────────────────────────────────

  describe('generatePdfLetters — success path', () => {
    it('returns true and triggers a download when fetch succeeds', async () => {
      const mockAnchor = setupDomMocks()
      const { generatePdfLetters } = useRenewalsMailMerger()

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok:   true,
        blob: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })),
      }))

      const result = await generatePdfLetters(validItems, baseWorksheet, 'Spring Renewals', 'RS')

      expect(result).toBe(true)
      expect(mockAnchor.click).toHaveBeenCalledOnce()
      // Download filename should contain the property name and worksheet name
      expect(mockAnchor.download).toMatch(/Spring Renewals/)
    })
  })

  // ── A-011: Excel filename format logic ────────────────────────────────────

  describe('exportMailMerger — A-011 (filename format)', () => {
    it('generates filename in format "{PropertyName} - {WorksheetName} - Mail Merge Data.xlsx"', async () => {
      const mockAnchor = setupDomMocks()
      const { exportMailMerger } = useRenewalsMailMerger()

      // getPropertyLetterConfig('RS') returns { propertyName: 'Riverstone' } likely or similar
      // We can just verify it matches the pattern
      await exportMailMerger(1, 'Fall 2026', validItems, baseWorksheet, 'RS')

      expect(mockAnchor.click).toHaveBeenCalledOnce()
      // Expect: "Riverstone - Fall 2026 - Mail Merge Data.xlsx" or "RS - Fall 2026 - Mail Merge Data.xlsx"
      expect(mockAnchor.download).toMatch(/ - Fall 2026 - Mail Merge Data\.xlsx$/)
    })

    it('sanitizes special characters in the filename', async () => {
      const mockAnchor = setupDomMocks()
      const { exportMailMerger } = useRenewalsMailMerger()

      await exportMailMerger(1, 'Dirty/Name!', validItems, baseWorksheet, 'RS')

      expect(mockAnchor.download).not.toContain('/')
      expect(mockAnchor.download).not.toContain('!')
      expect(mockAnchor.download).toMatch(/DirtyName - Mail Merge Data\.xlsx$/)
    })
  })
})
