import type { TableColumn } from '../types'

/**
 * useTableExport - Composable for exporting table data to CSV/PDF
 *
 * Provides formatted export functionality with automatic value formatting
 * based on column key patterns (dates, currency, percentages).
 */
export function useTableExport() {
  /**
   * Get current date in MMDDYYYY format for filenames
   */
  const getDateString = (): string => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const year = now.getFullYear()
    return `${month}${day}${year}`
  }

  /**
   * Get nested value from object using dot notation
   */
  const getNestedValue = (obj: any, path: string): any => {
    if (!path || typeof path !== 'string') return null
    return path
      .split('.')
      .reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj)
  }

  /**
   * Format cell value for export based on column key patterns
   */
  const formatCellValue = (value: any, column: TableColumn): string => {
    if (value === null || value === undefined) return ''

    // Handle booleans
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'

    // Handle arrays (e.g., alerts)
    if (Array.isArray(value)) return value.join('; ')

    // Handle dates (if key contains 'date')
    if (column.key.toLowerCase().includes('date') && value) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      } catch {
        // Fall through to string conversion
      }
    }

    // Handle numbers
    if (typeof value === 'number') {
      // Currency formatting
      if (column.key.match(/(rent|price|amount|cost|salary)/i)) {
        return `$${value.toLocaleString()}`
      }
      // Percentage formatting (assumes decimal like 0.92)
      if (column.key.match(/(percent|performance|rate)/i)) {
        return `${(value * 100).toFixed(1)}%`
      }
      return value.toString()
    }

    return String(value)
  }

  /**
   * Export table data to CSV and trigger download
   */
  const exportToCSV = (
    data: Record<string, any>[],
    columns: TableColumn[],
    filename: string = 'export'
  ): void => {
    try {
      if (!data || data.length === 0) {
        console.warn('[useTableExport] No data to export')
        return
      }

      // Filter out action columns (no key or empty label typically)
      const exportColumns = columns.filter(col => col.key && col.label)

      // Prepend filename line
      const filenameLine = `Filename: ${filename}_${getDateString()}`

      // Create CSV header
      const headers = exportColumns.map(col => col.label).join(',')

      // Create CSV rows
      const rows = data.map(row => {
        return exportColumns.map(col => {
          const value = getNestedValue(row, col.key)
          const formatted = formatCellValue(value, col)
          // Escape quotes and wrap in quotes if contains comma
          const escaped = formatted.replace(/"/g, '""')
          return escaped.includes(',') ? `"${escaped}"` : escaped
        }).join(',')
      })

      // Combine header and rows
      const csv = [filenameLine, headers, ...rows].join('\n')

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}_${getDateString()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[useTableExport] CSV export failed:', error)
    }
  }

  /**
   * Dynamically load pdfMake from CDN if not already present
   */
  const loadPdfMake = async (): Promise<any> => {
    if (typeof window !== 'undefined' && (window as any).pdfMake) {
      return (window as any).pdfMake
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js'
      script.onload = () => {
        const fonts = document.createElement('script')
        fonts.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js'
        fonts.onload = () => resolve((window as any).pdfMake)
        fonts.onerror = (err) => {
          console.error('[useTableExport] Failed to load vfs_fonts.js', err)
          reject(err)
        }
        document.body.appendChild(fonts)
      }
      script.onerror = (err) => {
        console.error('[useTableExport] Failed to load pdfmake.min.js', err)
        reject(err)
      }
      document.body.appendChild(script)
    })
  }

  /**
   * Export table data to PDF and trigger download
   */
  const exportToPDF = async (
    data: Record<string, any>[],
    columns: TableColumn[],
    filename: string = 'export'
  ): Promise<void> => {
    if (!data || data.length === 0) {
      console.warn('[useTableExport] No data to export')
      return
    }

    try {
      const pdfMake = await loadPdfMake()
      const exportColumns = columns.filter(col => col.key && col.label)
      const body: any[] = []

      // Header row
      body.push(exportColumns.map(col => ({ text: col.label, style: 'header' })))

      // Data rows
      data.forEach(row => {
        const rowData = exportColumns.map(col => {
          const value = getNestedValue(row, col.key)
          const formatted = formatCellValue(value, col)
          return { text: formatted, style: 'data' }
        })
        body.push(rowData)
      })

      const docDefinition = {
        pageOrientation: 'landscape' as const,
        content: [
          { text: `${filename}_${getDateString()}`, style: 'filename' },
          {
            table: {
              headerRows: 1,
              widths: exportColumns.map(() => '*'),
              body
            }
          }
        ],
        styles: {
          filename: { fontSize: 10, margin: [0, 0, 0, 8] as [number, number, number, number] },
          header: { bold: true, fillColor: '#EEEEEE', fontSize: 9 },
          data: { fontSize: 8 }
        }
      }

      pdfMake.createPdf(docDefinition).download(`${filename}_${getDateString()}.pdf`)
    } catch (error) {
      console.error('[useTableExport] PDF export failed:', error)
    }
  }

  return {
    exportToCSV,
    exportToPDF,
    getDateString
  }
}
