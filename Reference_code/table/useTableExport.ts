// layers/base/composables/useTableExport.ts
import type { TableColumn } from '../types/tables'

/**
 * Composable for exporting table data to various formats
 */
export function useTableExport() {
  /**
   * Get current date in MMDDYYYY format
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
   * Format cell value for export
   */
  const formatCellValue = (value: any, column: TableColumn): string => {
    if (value === null || value === undefined) return ''
    
    // Handle booleans
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    
    // Handle dates (if accessorKey contains 'date')
    if (column.accessorKey.includes('date') && value) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      } catch (e) {
        // Fall through to string conversion
      }
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      // Currency formatting (if accessorKey contains 'rent', 'price', 'amount')
      if (column.accessorKey.match(/(rent|price|amount|cost)/i)) {
        return `$${value.toLocaleString()}`
      }
      // Percentage formatting
      if (column.accessorKey.includes('percent')) {
        return `${value.toFixed(2)}%`
      }
      return value.toString()
    }
    
    return String(value)
  }

  /**
   * Export table data to CSV
   */
  const exportToCSV = (
    data: any[],
    columns: TableColumn[],
    filename: string = 'export'
  ) => {
    if (!data || data.length === 0) {
      console.warn('No data to export')
      return
    }

    // Prepend filename line
    const filenameLine = `Filename: ${filename}_${getDateString()}`

    // Create CSV header
    const headers = columns.map(col => col.header).join(',')
    
    // Create CSV rows
    const rows = data.map(row => {
      return columns.map(col => {
        const value = getNestedValue(row, col.accessorKey)
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
        // pdfmake also needs the fonts script
        const fonts = document.createElement('script')
        fonts.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js'
        fonts.onload = () => resolve((window as any).pdfMake)
        fonts.onerror = reject
        document.body.appendChild(fonts)
      }
      script.onerror = reject
      document.body.appendChild(script)
    })
  }

  /**
   * Export table data to PDF and trigger download
   */
  const exportToPDF = async (
    data: any[],
    columns: TableColumn[],
    filename: string = 'export'
  ) => {
    if (!data || data.length === 0) {
      console.warn('No data to export')
      return
    }
    const pdfMake = await loadPdfMake()
    const body = []
    // Header row
    body.push(columns.map(col => ({ text: col.header, style: 'header' })))
    // Data rows
    data.forEach(row => {
      const rowData = columns.map(col => {
        const value = getNestedValue(row, col.accessorKey)
        const formatted = formatCellValue(value, col)
        return { text: formatted, style: 'data' }
      })
      body.push(rowData)
    })
    const docDefinition = {
      pageOrientation: 'landscape',
      content: [
        // Filename line
        { text: `Filename: ${filename}_${getDateString()}`, style: 'filename' },
        {
          table: {
            headerRows: 1,
            widths: columns.map(() => '*'),
            body,
          },
        },
      ],
      styles: {
        filename: { fontSize: 10, margin: [0, 0, 0, 8] },
        header: { bold: true, fillColor: '#EEEEEE' },
        data: { fontSize: 9 },
      },
    }
    pdfMake.createPdf(docDefinition).download(`${filename}_${getDateString()}.pdf`)
  }

  return {
    exportToCSV,
    exportToPDF,
  }
}

