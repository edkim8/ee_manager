<script setup lang="ts">
import { computed } from 'vue'

export interface ComparisonRow {
  unit_name: string
  unit_id: string | null
  // Rent
  file_rent: number | null
  db_rent: number | null
  rent_match: boolean
  // Date Available
  file_date: string | null
  db_date: string | null
  date_match: boolean
  // Occupancy / Status
  file_occ: string | null
  db_status: string | null
  occ_match: boolean   // false only when db_status is 'Applied' or 'Leased'
  // Amenities
  db_amenities: string[]
  file_amenities: string[]
  missing_in_db: string[]
  extra_in_db: string[]
  amenity_match: boolean
  // Overall
  is_full_match: boolean
}

const props = defineProps<{
  rows: ComparisonRow[]
  missingUnits: string[]       // Unit names from file with no DB match
  totalFileRows: number        // Total raw rows parsed from file
  propertyName: string
  onClose: () => void
}>()

const matchCount = computed(() => props.rows.filter(r => r.is_full_match).length)
const mismatchCount = computed(() => props.rows.filter(r => !r.is_full_match).length)

const formatCurrency = (val: number | null) => {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const formatDate = (val: string | null) => {
  if (!val) return '—'
  try { return new Date(val + 'T00:00:00').toLocaleDateString() } catch { return val }
}

const rentDiff = (row: ComparisonRow) => {
  if (row.file_rent === null || row.db_rent === null) return null
  return row.file_rent - row.db_rent
}

const handleDownloadCSV = () => {
  // Separator column: header shows section label, data rows leave it blank
  const SEP = (label: string) => `"--- ${label} ---"`
  const BLANK = '""'

  const headers = [
    'Unit', 'Overall',
    SEP('Rent'),    'File Rent',    'DB Rent',    'Rent Result',
    SEP('Date'),    'File Date',    'DB Date',    'Date Result',
    SEP('Occ.'),    'File Occ.',    'DB Status',  'Occ. Result',
    SEP('Amenities'), 'Missing in DB', 'Extra in DB', 'Amenity Result',
    'DB Amenities', 'File Amenities'
  ]

  // 20 columns total; missingSection fills columns 3–20 (18 blanks after Unit + "No DB Match")
  const missingSection = props.missingUnits.map(u =>
    [`"${u}"`, '"No DB Match"', ...Array(18).fill(BLANK)].join(',')
  )

  const dataRows = props.rows.map(r => [
    `"${r.unit_name}"`,
    `"${r.is_full_match ? 'Match' : 'Mismatch'}"`,
    // Rent
    BLANK,
    `"${r.file_rent ?? ''}"`,
    `"${r.db_rent ?? ''}"`,
    `"${r.rent_match ? 'Match' : 'Mismatch'}"`,
    // Date
    BLANK,
    `"${r.file_date ?? ''}"`,
    `"${r.db_date ?? ''}"`,
    `"${r.date_match ? 'Match' : 'Mismatch'}"`,
    // Occ.
    BLANK,
    `"${r.file_occ ?? ''}"`,
    `"${r.db_status ?? ''}"`,
    `"${r.occ_match ? 'OK' : 'Mismatch — Unit not Available in DB'}"`,
    // Amenities
    BLANK,
    `"${r.missing_in_db.join('; ')}"`,
    `"${r.extra_in_db.join('; ')}"`,
    `"${r.amenity_match ? 'Match' : 'Mismatch'}"`,
    `"${r.db_amenities.join('; ')}"`,
    `"${r.file_amenities.join('; ')}"`
  ].join(','))

  const csvContent = [headers.join(','), ...missingSection, ...dataRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `availables_audit_${props.propertyName}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="p-6">

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <p class="text-xl font-black text-gray-900 dark:text-white">{{ totalFileRows }}</p>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">File Rows</p>
      </div>
      <div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <p class="text-xl font-black text-blue-600">{{ rows.length }}</p>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Compared</p>
      </div>
      <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
        <p class="text-xl font-black text-green-600">{{ matchCount }}</p>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Full Match</p>
      </div>
      <div class="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
        <p class="text-xl font-black text-orange-600">{{ mismatchCount }}</p>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Mismatched</p>
      </div>
      <div class="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
        <p class="text-xl font-black text-yellow-600">{{ missingUnits.length }}</p>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Not Found</p>
      </div>
    </div>

    <!-- Missing Units Alert -->
    <div v-if="missingUnits.length > 0" class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div class="flex items-center gap-2 mb-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-yellow-600" />
        <span class="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
          {{ missingUnits.length }} unit(s) in file not found in database
        </span>
      </div>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="u in missingUnits"
          :key="u"
          class="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded text-xs font-bold"
        >{{ u }}</span>
      </div>
    </div>

    <!-- No compared rows -->
    <div v-if="rows.length === 0 && missingUnits.length === 0" class="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
      <UIcon name="i-heroicons-document-magnifying-glass" class="text-4xl text-gray-300 mb-2" />
      <p class="text-gray-500 font-medium">No units matched between file and database.</p>
      <p class="text-sm text-gray-400 mt-1">Check that the correct property is selected.</p>
    </div>

    <!-- Comparison Table -->
    <div v-if="rows.length > 0" class="overflow-x-auto max-h-[440px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th class="px-3 py-2.5 text-left font-bold text-gray-600 dark:text-gray-300 w-16">Unit</th>
            <th class="px-3 py-2.5 text-center font-bold text-gray-600 dark:text-gray-300 w-16">Matched</th>
            <!-- Rent -->
            <th class="px-3 py-2.5 text-right font-bold text-gray-600 dark:text-gray-300">
              <div>Market Rent</div>
              <div class="text-[9px] font-normal text-gray-400">File / DB</div>
            </th>
            <!-- Date -->
            <th class="px-3 py-2.5 text-center font-bold text-gray-600 dark:text-gray-300">
              <div>Date Available</div>
              <div class="text-[9px] font-normal text-gray-400">File / DB</div>
            </th>
            <!-- Occ -->
            <th class="px-3 py-2.5 text-center font-bold text-gray-600 dark:text-gray-300">
              <div>Occ.</div>
              <div class="text-[9px] font-normal text-gray-400">File / DB</div>
            </th>
            <!-- Amenities -->
            <th class="px-3 py-2.5 text-left font-bold text-gray-600 dark:text-gray-300">Amenity Differences</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.unit_name"
            :class="[
              'border-b border-gray-100 dark:border-gray-800',
              !row.is_full_match ? 'bg-red-50/30 dark:bg-red-900/10' : ''
            ]"
          >
            <!-- Unit -->
            <td class="px-3 py-2">
              <span class="px-1.5 py-0.5 bg-gray-900 text-white rounded text-[10px] font-black">{{ row.unit_name }}</span>
            </td>

            <!-- Overall Status -->
            <td class="px-3 py-2 text-center">
              <span v-if="row.is_full_match" class="text-green-600 font-bold">✓</span>
              <span v-else class="text-red-600 font-bold">✗</span>
            </td>

            <!-- Rent -->
            <td class="px-3 py-2 text-right">
              <div class="space-y-0.5">
                <div class="font-mono text-gray-700 dark:text-gray-200">{{ formatCurrency(row.file_rent) }}</div>
                <div class="font-mono text-gray-400">{{ formatCurrency(row.db_rent) }}</div>
                <div
                  v-if="!row.rent_match && row.file_rent !== null && row.db_rent !== null"
                  class="font-bold font-mono text-red-600"
                >
                  Δ {{ formatCurrency(rentDiff(row)) }}
                </div>
                <div v-if="row.rent_match" class="text-green-600 font-bold">✓</div>
              </div>
            </td>

            <!-- Date -->
            <td class="px-3 py-2 text-center">
              <div class="space-y-0.5">
                <div class="font-mono text-gray-700 dark:text-gray-200">{{ formatDate(row.file_date) }}</div>
                <div class="font-mono text-gray-400">{{ formatDate(row.db_date) }}</div>
                <div v-if="row.date_match" class="text-green-600 font-bold">✓</div>
                <div v-else-if="row.file_date || row.db_date" class="text-red-600 font-bold">✗</div>
              </div>
            </td>

            <!-- Occ. / Status -->
            <td class="px-3 py-2 text-center">
              <div class="space-y-0.5">
                <div class="font-mono text-gray-700 dark:text-gray-200">{{ row.file_occ || '—' }}</div>
                <div
                  class="font-mono font-bold"
                  :class="!row.occ_match ? 'text-red-500' : 'text-gray-400'"
                >{{ row.db_status || '—' }}</div>
                <div v-if="!row.occ_match" class="text-red-600 font-bold">✗</div>
                <div v-else class="text-green-600 font-bold">✓</div>
              </div>
            </td>

            <!-- Amenity Diff -->
            <td class="px-3 py-2 max-w-[280px]">
              <div v-if="row.amenity_match" class="text-green-600 font-bold">✓ Synced</div>
              <div v-else class="space-y-1">
                <div v-if="row.missing_in_db.length > 0" class="text-red-600">
                  <span class="font-bold">+ Missing:</span>
                  <span class="ml-1">{{ row.missing_in_db.join(', ') }}</span>
                </div>
                <div v-if="row.extra_in_db.length > 0" class="text-orange-600">
                  <span class="font-bold">- Extra:</span>
                  <span class="ml-1">{{ row.extra_in_db.join(', ') }}</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div v-if="rows.length > 0" class="flex flex-wrap items-center gap-4 text-[10px] text-gray-600 dark:text-gray-300 mb-4 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <span class="font-semibold text-gray-500 dark:text-gray-400">Each cell: <span class="text-gray-800 dark:text-gray-200">File</span> (top) / <span class="text-gray-400">DB</span> (bottom)</span>
      <span class="text-gray-300 dark:text-gray-600">|</span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded bg-red-100 border border-red-300 dark:bg-red-900/40 dark:border-red-700"></span>
        <span>Amenity in file, <strong>missing from DB</strong></span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300 dark:bg-orange-900/40 dark:border-orange-700"></span>
        <span>Amenity in DB, <strong>not in file</strong></span>
      </span>
    </div>

    <!-- Actions -->
    <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
      <UButton
        v-if="rows.length > 0 || missingUnits.length > 0"
        label="Download CSV"
        icon="i-heroicons-arrow-down-tray"
        variant="outline"
        color="neutral"
        size="sm"
        @click="handleDownloadCSV"
      />
      <div v-else />
      <UButton
        label="Close"
        color="neutral"
        @click="onClose"
      />
    </div>
  </div>
</template>
