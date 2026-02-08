<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
    units: any[]
    floorPlanName: string
    onClose: () => void
}>()

// Filter to only show units with sync alerts
const discrepancies = computed(() => {
    return props.units.filter((u: any) => u.sync_alerts && u.sync_alerts.length > 0)
})

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const handleDownloadCSV = () => {
    const headers = ['Unit', 'Yardi Rent', 'Calculated Rent', 'Difference', 'Sync Issues']
    const rows = discrepancies.value.map((u: any) => [
        u.unit_name,
        u.rent_offered || 0,
        u.calculated_offered_rent || 0,
        Math.abs((u.rent_offered || 0) - (u.calculated_offered_rent || 0)),
        u.sync_alerts.join(' | ')
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync_discrepancies_${props.floorPlanName}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

const handleDownloadExcel = () => {
    // For Excel, we'll use HTML table format which Excel can open
    const headers = ['Unit', 'Yardi Rent', 'Calculated Rent', 'Difference', 'Sync Issues']
    const rows = discrepancies.value.map((u: any) => [
        u.unit_name,
        formatCurrency(u.rent_offered || 0),
        formatCurrency(u.calculated_offered_rent || 0),
        formatCurrency(Math.abs((u.rent_offered || 0) - (u.calculated_offered_rent || 0))),
        u.sync_alerts.join(', ')
    ])

    let tableHTML = '<table border="1" cellpadding="5" cellspacing="0">'
    tableHTML += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>'
    tableHTML += '<tbody>'
    rows.forEach((row: any[]) => {
        tableHTML += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>'
    })
    tableHTML += '</tbody></table>'

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync_discrepancies_${props.floorPlanName}_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
}

const handleDownloadPDF = () => {
    // For PDF, we'll open a print dialog which can save as PDF
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const headers = ['Unit', 'Yardi Rent', 'Calculated Rent', 'Difference', 'Sync Issues']
    const rows = discrepancies.value.map((u: any) => [
        u.unit_name,
        formatCurrency(u.rent_offered || 0),
        formatCurrency(u.calculated_offered_rent || 0),
        formatCurrency(Math.abs((u.rent_offered || 0) - (u.calculated_offered_rent || 0))),
        u.sync_alerts.join(', ')
    ])

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sync Discrepancies - ${props.floorPlanName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { font-size: 18px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .date { color: #666; font-size: 12px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>Sync Discrepancies Report - ${props.floorPlanName}</h1>
            <div class="date">Generated: ${new Date().toLocaleDateString()}</div>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map((row: any[]) => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
        printWindow.print()
    }, 250)
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Sync Discrepancies</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Found {{ discrepancies.length }} unit(s) with synchronization issues between Yardi and internal calculations.
      </p>
    </div>

    <!-- Discrepancies Table -->
    <div v-if="discrepancies.length > 0" class="mb-6 overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th class="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">Unit</th>
            <th class="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">Yardi Rent</th>
            <th class="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">Calculated Rent</th>
            <th class="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">Difference</th>
            <th class="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">Issues</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="unit in discrepancies"
            :key="unit.unit_id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td class="px-4 py-3">
              <span class="px-2 py-1 bg-gray-900 text-white rounded text-xs font-black">{{ unit.unit_name }}</span>
            </td>
            <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(unit.rent_offered || 0) }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(unit.calculated_offered_rent || 0) }}</td>
            <td class="px-4 py-3 text-right font-mono font-bold text-red-600">
              {{ formatCurrency(Math.abs((unit.rent_offered || 0) - (unit.calculated_offered_rent || 0))) }}
            </td>
            <td class="px-4 py-3">
              <div class="space-y-1">
                <div
                  v-for="(alert, idx) in unit.sync_alerts"
                  :key="idx"
                  class="text-xs text-gray-700 dark:text-gray-300"
                >
                  {{ alert }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="py-10 text-center bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-dashed border-green-200 dark:border-green-800">
      <UIcon name="i-heroicons-check-circle" class="text-4xl text-green-500 mb-2" />
      <p class="text-green-700 dark:text-green-400 font-bold">All units are in sync!</p>
      <p class="text-sm text-green-600 dark:text-green-500 mt-1">No discrepancies found between Yardi and internal calculations.</p>
    </div>

    <!-- Actions -->
    <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="flex gap-2">
        <UButton
          v-if="discrepancies.length > 0"
          label="Download CSV"
          icon="i-heroicons-arrow-down-tray"
          variant="outline"
          color="neutral"
          size="sm"
          @click="handleDownloadCSV"
        />
        <UButton
          v-if="discrepancies.length > 0"
          label="Download Excel"
          icon="i-heroicons-arrow-down-tray"
          variant="outline"
          color="neutral"
          size="sm"
          @click="handleDownloadExcel"
        />
        <UButton
          v-if="discrepancies.length > 0"
          label="Print/PDF"
          icon="i-heroicons-printer"
          variant="outline"
          color="neutral"
          size="sm"
          @click="handleDownloadPDF"
        />
      </div>
      <UButton
        label="Close"
        color="neutral"
        @click="onClose"
      />
    </div>
  </div>
</template>
