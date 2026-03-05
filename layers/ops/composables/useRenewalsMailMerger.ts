/**
 * Renewals Mail Merger Export
 *
 * Three export actions for finalized renewal worksheets.
 * All three are property-specific — filenames, letterheads, and DOCX templates
 * vary per property code.
 *
 * 1. exportMailMerger     — Excel (.xlsx) with DOCX merge field column names
 * 2. downloadDocxTemplate — Downloads the property-specific blank DOCX template
 * 3. generatePdfLetters   — Calls the server route to produce a merged PDF
 */

import { ref } from 'vue'
import * as XLSX from 'xlsx'
import {
  buildLetterRows,
  type RenewalLetterRow,
  type WorksheetForLetter,
  type RenewalItemForLetter
} from '../utils/renewalLetterHtml'
import { getPropertyLetterConfig } from '../utils/renewalLetterConfig'

export function useRenewalsMailMerger() {
  const loadingExcel = ref(false)
  const loadingPdf   = ref(false)

  // Legacy alias kept for existing template bindings
  const loading = loadingExcel

  // ─── 1. Export Excel (mail merge data file) ────────────────────────────────

  /**
   * Build and download an XLSX whose column names match the DOCX merge fields.
   * Filename is property-prefixed: "{PropertyName} - {WorksheetName} - Mail Merge Data.xlsx"
   */
  const exportMailMerger = async (
    _worksheetId: string | number,
    worksheetName: string,
    items: RenewalItemForLetter[],
    worksheet: WorksheetForLetter,
    propertyCode: string
  ): Promise<boolean> => {
    loadingExcel.value = true
    try {
      const config = getPropertyLetterConfig(propertyCode)
      const rows   = buildLetterRows(items, worksheet)

      const sheetData = rows.map(r => ({
        worksheet_id:        r.worksheet_id,
        resident_name:       r.resident_name,
        roommate_names:      r.roommate_names,
        unit:                r.unit,
        lease_rent:          r.lease_rent,
        lease_to_date:       r.lease_to_date,
        primary_term:        r.primary_term,
        primary_rent:        r.primary_rent,
        first_term:          r.first_term          ?? '',
        first_term_rent:     r.first_term_rent      ?? '',
        second_term:         r.second_term          ?? '',
        second_term_rent:    r.second_term_rent      ?? '',
        third_term:          r.third_term           ?? '',
        third_term_rent:     r.third_term_rent       ?? '',
        mtm_rent:            r.mtm_rent             ?? '',
        early_discount:      r.early_discount        ?? '',
        early_discount_date: r.early_discount_date  ?? ''
      }))

      const workbook = XLSX.utils.book_new()
      const ws       = XLSX.utils.json_to_sheet(sheetData)
      ws['!cols']    = calculateColumnWidths(sheetData)
      XLSX.utils.book_append_sheet(workbook, ws, 'Renewal Offers')

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob   = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const prefix   = config.propertyName || propertyCode
      const filename = `${sanitizeName(prefix)} - ${sanitizeName(worksheetName)} - Mail Merge Data.xlsx`
      triggerDownload(blob, filename)
      return true
    } catch (err) {
      console.error('[Mail Merger] Excel export error:', err)
      return false
    } finally {
      loadingExcel.value = false
    }
  }

  // ─── 2. Download DOCX Template ────────────────────────────────────────────

  /**
   * Download the property-specific blank DOCX template from /public/templates/.
   * Falls back to the generic template if a property-specific one is not yet uploaded.
   */
  const downloadDocxTemplate = (propertyCode: string): void => {
    const config   = getPropertyLetterConfig(propertyCode)
    const filename = config.docxTemplateName

    const a    = document.createElement('a')
    a.href     = `/templates/${filename}`
    a.download = filename
    a.target   = '_blank'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // ─── 3. Generate PDF Letters ──────────────────────────────────────────────

  /**
   * Build RenewalLetterRow[] from the given items + worksheet, post them to the
   * server-side Chrome PDF route (including propertyCode for the letterhead),
   * and trigger a browser download.
   */
  const generatePdfLetters = async (
    items: RenewalItemForLetter[],
    worksheet: WorksheetForLetter,
    worksheetName: string,
    propertyCode: string
  ): Promise<boolean> => {
    loadingPdf.value = true
    try {
      const rows: RenewalLetterRow[] = buildLetterRows(items, worksheet)
      if (rows.length === 0) {
        console.warn('[Mail Merger] No valid rows to generate letters for')
        return false
      }

      const res = await fetch('/api/renewals/generate-letters', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows, propertyCode })
      })

      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText)
        console.error('[Mail Merger] PDF generation failed:', msg)
        return false
      }

      const pdfBlob = await res.blob()
      const config  = getPropertyLetterConfig(propertyCode)
      const prefix  = config.propertyName || propertyCode
      const date    = new Date().toISOString().slice(0, 10)
      triggerDownload(pdfBlob, `${sanitizeName(prefix)} - ${sanitizeName(worksheetName)} - Renewal Letters ${date}.pdf`)
      return true
    } catch (err) {
      console.error('[Mail Merger] PDF generation error:', err)
      return false
    } finally {
      loadingPdf.value = false
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }

  function sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim()
  }

  function calculateColumnWidths(data: Record<string, unknown>[]): { wch: number }[] {
    if (!data.length) return []
    return Object.keys(data[0]).map(key => {
      const maxLen = data.reduce((max, row) => {
        return Math.max(max, String(row[key] ?? '').length)
      }, key.length)
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
    })
  }

  return {
    exportMailMerger,
    downloadDocxTemplate,
    generatePdfLetters,
    loading,       // legacy alias → loadingExcel
    loadingExcel,
    loadingPdf
  }
}
