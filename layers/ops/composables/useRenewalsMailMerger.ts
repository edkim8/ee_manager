/**
 * Renewals Mail Merger Export
 *
 * Generates an Excel file formatted for MS Word Mail Merge
 * Used for creating renewal offer letters
 */

import { ref } from 'vue'
import * as XLSX from 'xlsx'

export function useRenewalsMailMerger() {
  const loading = ref(false)

  /**
   * Generate Mail Merger Excel file from worksheet items
   *
   * Format requirements for MS Word Mail Merge:
   * - First row = column headers (these become merge fields in Word)
   * - Headers use PascalCase or underscores (e.g., UnitName, ResidentName)
   * - Data rows follow with actual values
   * - No formulas, just plain values
   * - Dates formatted as strings
   * - Currency as numbers (Word handles formatting)
   */
  const exportMailMerger = async (worksheetId: string, worksheetName: string, items: any[], worksheet: any) => {
    loading.value = true

    try {
      // Prepare data for Mail Merger
      const mailMergerData = items.map(item => ({
        // Unit & Resident Info
        UnitName: item.unit_name || '',
        ResidentName: item.resident_name || '',

        // Current Lease Info
        CurrentRent: item.current_rent || 0,
        LeaseStartDate: formatDateForMailMerge(item.lease_from_date),
        LeaseEndDate: formatDateForMailMerge(item.lease_to_date),
        MoveInDate: formatDateForMailMerge(item.move_in_date),

        // Offer Info
        MarketRent: item.market_rent || 0,
        OfferRent: item.final_rent || item.current_rent || 0,
        RentIncrease: (item.final_rent || item.current_rent || 0) - (item.current_rent || 0),
        RentIncreasePercent: item.current_rent > 0
          ? Math.round(((item.final_rent || item.current_rent) - item.current_rent) / item.current_rent * 100)
          : 0,

        // Offer Source (for reference)
        OfferSource: item.rent_offer_source === 'ltl_percent' ? 'LTL'
                   : item.rent_offer_source === 'max_percent' ? 'Max %'
                   : 'Manual',

        // Status Info
        Status: item.status || 'pending',
        Approved: item.approved ? 'Yes' : 'No',

        // Worksheet Settings (same for all items, but useful in merge)
        LTL_Percent: worksheet.ltl_percent || 25,
        Max_Percent: worksheet.max_rent_increase_percent || 5,
        MTM_Fee: item.renewal_type === 'mtm' ? worksheet.mtm_fee || 300 : 0,

        // Renewal Type
        RenewalType: item.renewal_type === 'mtm' ? 'Month-to-Month' : 'Standard',

        // Additional Fields
        Comment: item.comment || '',

        // Offer Dates (can be customized later)
        OfferStartDate: formatDateForMailMerge(item.lease_to_date, 1), // Day after current lease ends
        OfferValidUntil: formatDateForMailMerge(item.lease_to_date, -30), // 30 days before lease ends
      }))

      // Create workbook
      const workbook = XLSX.utils.book_new()
      const worksheet_data = XLSX.utils.json_to_sheet(mailMergerData)

      // Auto-size columns (for better readability in Excel)
      const columnWidths = calculateColumnWidths(mailMergerData)
      worksheet_data['!cols'] = columnWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet_data, 'Renewal Offers')

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Clean filename
      const cleanName = worksheetName.replace(/[^a-zA-Z0-9 ]/g, '')
      a.download = `${cleanName} - Mail Merger.xlsx`

      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      a.remove()

      console.log(`[Mail Merger] Exported ${items.length} renewal offers`)

      return true
    } catch (error) {
      console.error('[Mail Merger] Export error:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Format date for Mail Merge (YYYY-MM-DD or MM/DD/YYYY)
   * @param dateStr - ISO date string
   * @param offsetDays - Add/subtract days from date
   */
  function formatDateForMailMerge(dateStr: string | null, offsetDays = 0): string {
    if (!dateStr) return ''

    const date = new Date(dateStr + 'T00:00:00')

    if (offsetDays !== 0) {
      date.setDate(date.getDate() + offsetDays)
    }

    // Return US format for easy reading
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  /**
   * Calculate optimal column widths based on content
   */
  function calculateColumnWidths(data: any[]): any[] {
    if (!data || data.length === 0) return []

    const keys = Object.keys(data[0])
    return keys.map(key => {
      // Get max length of values in this column
      const maxLength = data.reduce((max, row) => {
        const value = String(row[key] || '')
        return Math.max(max, value.length)
      }, key.length) // Include header length

      // Set width (Excel width units are approximately character count)
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
    })
  }

  return {
    exportMailMerger,
    loading
  }
}
