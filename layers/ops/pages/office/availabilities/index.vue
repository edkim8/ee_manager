<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta, useOverlay, refreshNuxtData } from '#imports'
import { useConstantsMutation, type AppConstant } from '../../../../base/composables/mutations/useConstantsMutation'
import ConstantsModal from '../../../../base/components/modals/ConstantsModal.vue'
import SimpleModal from '../../../../base/components/SimpleModal.vue'
import SyncDiscrepanciesModal from '../../../components/modals/SyncDiscrepanciesModal.vue'
import AmenityComparisonModal from '../../../components/modals/AmenityComparisonModal.vue'
import type { ComparisonRow } from '../../../components/modals/AmenityComparisonModal.vue'
import { useParseAvailablesAudit, AVAILABLES_AUDIT_REQUIRED_HEADERS } from '../../../../parsing/composables/parsers/useParseAvailablesAudit'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns } from '../../../../../configs/table-configs/availabilities-complete.generated'
import { filterColumnsByAccess } from '../../../../table/composables/useTableColumns'

const supabase = useSupabaseClient()
const { activeProperty, userContext } = usePropertyState()

definePageMeta({
  layout: 'dashboard'
})

// Display filters (must be defined before computed properties that use them)
const displayFilter = ref('All')
const displayOptions = ['All', 'Available', 'Applied', 'Leased']

// Fetch Active Property Name for Header
const { data: activePropertyRecord } = await useAsyncData('active-property-header-avail', async () => {
  if (!activeProperty.value) return null
  const { data } = await supabase
    .from('properties')
    .select('name')
    .eq('code', activeProperty.value)
    .single()
  return data
}, {
  watch: [activeProperty]
})

// Dynamic sort field based on filter
const defaultSortField = computed(() => {
  if (displayFilter.value === 'Applied' || displayFilter.value === 'Leased') {
    return 'move_in_date'
  }
  return 'available_date'
})

const defaultSortDirection = computed(() => {
  return 'asc'
})

// Fetch Leasing Pipeline Data (Consolidated master source)
const { data: availabilities, status, error, refresh: refreshAvailabilities } = await useAsyncData('availabilities-list', async () => {
  if (!activeProperty.value) return []

  const { data, error } = await supabase
    .from('view_leasing_pipeline')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order(defaultSortField.value, { ascending: defaultSortDirection.value === 'asc' })

  if (error) throw error
  return data
}, {
  watch: [activeProperty, displayFilter]
})

// Dynamic columns from Excel configuration based on filter + role/dept access
const columns = computed(() => {
  return filterColumnsByAccess(allColumns, {
    userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
    userDepartment: userContext.value?.profile?.department,
    isSuperAdmin: !!userContext.value?.access?.is_super_admin,
    filterGroup: displayFilter.value.toLowerCase()
  })
})

// Status color mapping
const statusColors: Record<string, string> = {
  'Available': 'primary',
  'Applied': 'warning',
  'Leased': 'success'
}

// Fetch App Constants for dynamic thresholds and colors
const { fetchConstants } = useConstantsMutation()
const { data: appConstants, refresh: refreshConfig } = await useAsyncData('availability-config', async () => {
  if (!activeProperty.value) return []
  return await fetchConstants(activeProperty.value)
}, {
  watch: [activeProperty]
})

const getConstantValue = (key: string, defaultValue: any) => {
  const c = appConstants.value?.find((c: AppConstant) => c.key === key)
  if (!c) return defaultValue
  
  const val = String(c.value || '').trim()
  if (!val) return defaultValue

  // Force numeric conversion for threshold keys or if data_type is number
  if (c.data_type === 'number' || key.toLowerCase().includes('threshold')) {
    const parsed = parseFloat(val)
    if (isNaN(parsed)) return defaultValue
    return parsed
  }
  return val
}

// Map text colors (red, pink, etc.) to hex codes
const colorMap: Record<string, string> = {
  'red': '#B91C1C',
  'pink': '#F472B6',
  'yellow': '#FBBF24',
  'green': '#34D399',
  'blue': '#60A5FA',
  'gray': '#9CA3AF',
  'neutral': '#6B7280'
}

const getColorCode = (value: any, defaultHex: string) => {
  if (value === undefined || value === null || value === '') return defaultHex
  const str = String(value).trim().toLowerCase()
  if (str.startsWith('#')) return str
  return colorMap[str] || str // Return as-is if it's already a valid CSS color name
}

const availabilityConfig = computed(() => {
  const config = {
    pastDue: {
      threshold: Number(getConstantValue('available_status_threshold_past_due', 0)),
      color: getColorCode(getConstantValue('available_status_color_past_due', null), '#B91C1C')
    },
    urgent: {
      threshold: Number(getConstantValue('available_status_threshold_urgent', 25)),
      color: getColorCode(getConstantValue('available_status_color_urgent', null), '#F472B6')
    },
    approaching: {
      threshold: Number(getConstantValue('available_status_threshold_approaching', 50)),
      color: getColorCode(getConstantValue('available_status_color_approaching', null), '#FBBF24')
    },
    scheduled: {
      threshold: Number(getConstantValue('available_status_threshold_scheduled', 75)),
      color: getColorCode(getConstantValue('available_status_color_scheduled', null), '#34D399')
    },
    default: {
      color: getColorCode(getConstantValue('available_status_color_default', null), '#60A5FA')
    }
  }
  console.log('[Availabilities] Config reloaded:', config)
  return config
})

// Vacancy color mapping logic
// Days UNTIL ready (available_date - current_date)
// Negative/zero = ready now (RED - urgent)
// Positive = ready in future (less urgent)
const getVacancyColor = (days: number | null) => {
  const vc = days ?? 0
  const config = availabilityConfig.value

  // Lower/negative days = More urgent (unit ready now or overdue)
  // Higher days = Less urgent (unit ready in distant future)
  if (vc <= config.pastDue.threshold) return config.pastDue.color        // ≤0 days → Red (ready now/overdue)
  if (vc <= config.urgent.threshold) return config.urgent.color          // 1-25 days → Pink (ready soon)
  if (vc <= config.approaching.threshold) return config.approaching.color // 26-50 days → Yellow (ready in ~1 month)
  if (vc <= config.scheduled.threshold) return config.scheduled.color    // 51-75 days → Green (ready in 2-3 months)

  return config.default.color  // 76+ days → Blue (ready in distant future)
}

// Search filter
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!availabilities.value) return []

  let data = availabilities.value

  // Phase 1: Status Filtering
  if (displayFilter.value !== 'All') {
    data = data.filter((a: any) => a.status === displayFilter.value)
  }

  // Phase 2: String Search
  if (!searchQuery.value) return data

  const q = searchQuery.value.toLowerCase()
  return data.filter((a: any) =>
    a.unit_name?.toLowerCase().includes(q) ||
    a.building_name?.toLowerCase().includes(q) ||
    a.status?.toLowerCase().includes(q) ||
    a.resident_name?.toLowerCase().includes(q) ||
    a.leasing_agent?.toLowerCase().includes(q) ||
    a.floor_plan_name?.toLowerCase().includes(q)
  )
})

const handleRowClick = (row: any) => {
  if (row?.unit_id) {
    navigateTo(`/assets/units/${row.unit_id}`)
  }
}

const showConfig = ref(false)
const openConfig = () => {
  showConfig.value = true
}

const handleConfigClose = async (saved: boolean) => {
  showConfig.value = false
  if (saved) {
    console.log('[Availabilities] Settings saved, reloading data...')
    await refreshNuxtData()
  }
}

// ===== EXPORT SYNC =====
const showSyncModal = ref(false)

const handleExportSync = () => {
  showSyncModal.value = true
}

const handleSyncModalClose = () => {
  showSyncModal.value = false
}

// ===== COMPARE AMENITIES (Upload) =====
const showCompareModal = ref(false)
const comparisonRows = ref<ComparisonRow[]>([])
const missingUnits = ref<string[]>([])
const totalFileRows = ref(0)
const isProcessingFile = ref(false)
const parseErrorMessage = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const handleCompareClick = () => {
  parseErrorMessage.value = null
  fileInputRef.value?.click()
}

const handleCompareModalClose = () => {
  showCompareModal.value = false
  comparisonRows.value = []
  missingUnits.value = []
  totalFileRows.value = 0
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isProcessingFile.value = true
  parseErrorMessage.value = null

  try {
    // ── Step 1: Parse the file ──────────────────────────────────────────────
    // useParseAvailablesAudit accepts any filename but validates by headers.
    // Errors here mean wrong file format.
    const parseResult = await useParseAvailablesAudit(file)

    if (parseResult.errors.length > 0) {
      // Header mismatch or parse failure — not an Availables file
      const expected = AVAILABLES_AUDIT_REQUIRED_HEADERS.join(', ')
      parseErrorMessage.value = `Cannot read file: ${parseResult.errors[0]}. Expected columns: ${expected}`
      return
    }

    const parsedRows = parseResult.data
    totalFileRows.value = parseResult.meta.totalRows
    console.log(`[Compare Amenities] Parsed ${parsedRows.length} rows from ${parseResult.meta.totalRows} total rows`)

    // ── Step 2: Inject property_code from active property ──────────────────
    const propCode = activeProperty.value
    if (!propCode) {
      parseErrorMessage.value = 'No property selected. Please select a property first.'
      return
    }
    parsedRows.forEach(row => { row.property_code = propCode })

    // ── Step 3: Build DB lookup map from already-loaded availabilities ──────
    // availabilities.value contains view_leasing_pipeline data for the active property
    const dbMap = new Map<string, any>()
    ;(availabilities.value || []).forEach((a: any) => {
      const key = (a.unit_name || '').toLowerCase()
      if (key) dbMap.set(key, a)
    })

    console.log(`[Compare Amenities] DB has ${dbMap.size} units loaded for property ${propCode}`)

    // ── Step 4: Separate matched vs missing units ──────────────────────────
    const matchedRows: typeof parsedRows = []
    const unmatchedNames: string[] = []

    for (const row of parsedRows) {
      const key = (row.unit_name || '').toLowerCase()
      if (dbMap.has(key)) {
        matchedRows.push(row)
      } else {
        unmatchedNames.push(row.unit_name || '?')
      }
    }

    missingUnits.value = unmatchedNames
    console.log(`[Compare Amenities] Matched: ${matchedRows.length}, Missing: ${unmatchedNames.length}`)

    // ── Step 5: Fetch unit_amenities for matched units ─────────────────────
    const matchedUnitIds = matchedRows
      .map(r => dbMap.get((r.unit_name || '').toLowerCase())?.unit_id)
      .filter((id: any): id is string => !!id)

    const { data: unitAmenitiesData } = matchedUnitIds.length > 0
      ? await supabase
          .from('unit_amenities')
          .select('unit_id, amenities(yardi_amenity, yardi_name, yardi_code)')
          .in('unit_id', matchedUnitIds)
          .eq('active', true)
      : { data: [] }

    // Build map: unit_id → amenity entries [{display, identifiers}]
    const dbAmenitiesMap = new Map<string, Array<{ display: string; identifiers: string[] }>>()
    ;(unitAmenitiesData || []).forEach((ua: any) => {
      if (!ua.amenities) return
      const uid = ua.unit_id
      if (!dbAmenitiesMap.has(uid)) dbAmenitiesMap.set(uid, [])

      const display = ua.amenities.yardi_amenity || ua.amenities.yardi_name || ua.amenities.yardi_code || ''
      const identifiers = [ua.amenities.yardi_amenity, ua.amenities.yardi_code, ua.amenities.yardi_name]
        .filter(Boolean) as string[]

      dbAmenitiesMap.get(uid)!.push({ display, identifiers })
    })

    // ── Step 6: Build comparison rows ──────────────────────────────────────
    comparisonRows.value = matchedRows.map(r => {
      const dbRow = dbMap.get((r.unit_name || '').toLowerCase())
      const unitId: string | null = dbRow?.unit_id || null

      // ── Rent comparison ──
      const fileRent = r.offered_rent ?? null
      const dbRent = dbRow?.rent_offered !== undefined ? Number(dbRow.rent_offered) : null
      const rentMatch = fileRent !== null && dbRent !== null && Math.abs(fileRent - dbRent) < 0.01

      // ── Date comparison ──
      const fileDate = r.available_date ?? null
      const dbDate = dbRow?.available_date ?? null
      const dateMatch = fileDate !== null && dbDate !== null && fileDate === dbDate

      // ── Amenity comparison ──
      const dbEntries = unitId ? (dbAmenitiesMap.get(unitId) || []) : []

      // File amenities: split by newline, <br>, comma, or semicolon
      const rawAmenities = r.amenities || ''
      const fileAmenities = rawAmenities
        .split(/[\n\r]|<br\s*\/?>|,|;/)
        .map((a: string) => a.trim())
        .filter(Boolean)

      // Multi-field matching (yardi_amenity OR yardi_code OR yardi_name)
      const missingInDb = fileAmenities.filter(fa =>
        !dbEntries.some(entry => entry.identifiers.includes(fa))
      )
      const extraInDb = dbEntries
        .filter(entry => !fileAmenities.some(fa => entry.identifiers.includes(fa)))
        .map(entry => entry.display)
        .filter(Boolean)

      const dbAmenities = dbEntries.map(e => e.display).filter(Boolean)
      const amenityMatch = missingInDb.length === 0 && extraInDb.length === 0

      // Occ. match: only flag as mismatch when DB status is Applied or Leased
      // (a unit appearing in the Availables file should be Available in DB)
      const dbStatus = dbRow?.status ?? null
      const occMatch = !['Applied', 'Leased'].includes(dbStatus || '')

      const isFullMatch = rentMatch && dateMatch && amenityMatch && occMatch

      return {
        unit_name: r.unit_name || '',
        unit_id: unitId,
        // Rent
        file_rent: fileRent,
        db_rent: dbRent,
        rent_match: rentMatch,
        // Date
        file_date: fileDate,
        db_date: dbDate,
        date_match: dateMatch,
        // Status / Occ
        file_occ: r.status ?? null,
        db_status: dbStatus,
        occ_match: occMatch,
        // Amenities
        db_amenities: dbAmenities,
        file_amenities: fileAmenities,
        missing_in_db: missingInDb,
        extra_in_db: extraInDb,
        amenity_match: amenityMatch,
        // Overall
        is_full_match: isFullMatch
      } satisfies ComparisonRow
    })

    showCompareModal.value = true
  } catch (err: any) {
    console.error('[Compare Amenities] Error processing file:', err)
    parseErrorMessage.value = `Error processing file: ${err?.message || 'Unknown error'}`
  } finally {
    isProcessingFile.value = false
    // Reset so same file can be re-selected
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex justify-between items-center">
      <div class="flex items-baseline gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Availabilities
        </h1>
        <span v-if="activePropertyRecord?.name" class="text-lg text-gray-500 font-medium">
          &middot; {{ activePropertyRecord.name }}
        </span>
        <UButton
          to="/office/pricing/floor-plans"
          label="Floor Plan Details"
          icon="i-heroicons-chart-bar"
          color="primary"
          variant="soft"
          size="sm"
          class="ml-4"
        />
      </div>

      <div class="flex items-center gap-2">
        <UButton
          label="Export Sync"
          variant="outline"
          icon="i-heroicons-arrow-down-tray"
          @click="handleExportSync"
        />
        <UTooltip text="Upload the 'Available Units' report from Yardi">
          <UButton
            label="Compare Amenities"
            variant="outline"
            icon="i-heroicons-document-magnifying-glass"
            :loading="isProcessingFile"
            @click="handleCompareClick"
          />
        </UTooltip>
        <!-- Hidden file input — expects Yardi "Available Units" export -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="handleFileUpload"
        />
      </div>
    </div>

    <!-- Parse Error Banner -->
    <div v-if="parseErrorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
      <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
      <div>
        <p class="text-sm font-bold text-red-700">Upload Error</p>
        <p class="text-xs text-red-600 mt-0.5">{{ parseErrorMessage }}</p>
        <p class="text-xs text-red-500 mt-1.5">
          Please upload the <strong>"Available Units"</strong> report downloaded from Yardi.
          In Yardi, go to <strong>Leasing &rarr; Available Units</strong>, export the report, and upload that file here.
        </p>
      </div>
      <button class="ml-auto text-red-400 hover:text-red-600 shrink-0" @click="parseErrorMessage = null">
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <div class="flex items-center gap-2 font-bold mb-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        <span>Error Fetching Availabilities</span>
      </div>
      <p class="text-sm">{{ error.message }}</p>
    </div>

    <GenericDataTable
      :key="displayFilter"
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="unit_id"
      enable-pagination
      :page-size="25"
      :default-sort-field="defaultSortField"
      :default-sort-direction="defaultSortDirection"
      clickable
      striped
      enable-export
      export-filename="availabilities"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search availabilities..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'unit' : 'units' }}
          </span>
        </div>
      </template>

      <template #toolbar-actions>
        <div class="flex items-center gap-2 pr-2 border-r border-gray-200 mr-2">
          <span class="text-xs text-gray-500 uppercase font-semibold tracking-wider">Show:</span>
          <div class="flex gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
            <UButton
              v-for="opt in displayOptions"
              :key="opt"
              :label="opt"
              :variant="displayFilter === opt ? 'solid' : 'ghost'"
              :color="displayFilter === opt ? 'primary' : 'neutral'"
              size="xs"
              :class="displayFilter !== opt ? 'text-gray-500 font-medium' : ''"
              @click="displayFilter = opt"
            />
          </div>
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            label="Configure"
            @click="openConfig"
          />
        </div>
      </template>

      <!-- Unit Link (Color-coded by Vacancy) -->
      <template #cell-unit_name="{ value, row }">
        <NuxtLink
          v-if="value"
          :to="`/assets/units/${row.unit_id}`"
          class="inline-block px-2 py-1 rounded-md text-gray-950 font-black text-xs min-w-[60px] shadow-sm transition-all hover:brightness-110 active:scale-95 text-center"
          :style="{ backgroundColor: getVacancyColor(row.vacant_days) }"
          @click.stop
        >
          {{ value }}
        </NuxtLink>
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Building Link -->
      <template #cell-building_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/buildings/${row.building_id}`"
        />
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Floor Plan -->
      <template #cell-floor_plan_name="{ value }">
        <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ value || '-' }}</span>
      </template>

      <!-- SF -->
      <template #cell-sf="{ value }">
        <span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ value?.toLocaleString() || '-' }}</span>
      </template>

      <!-- Bedroom Count -->
      <template #cell-bedroom_count="{ value }">
        <span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ value || '-' }}</span>
      </template>

      <!-- Rent -->
      <template #cell-rent_offered="{ value }">
        <CellsCurrencyCell
          v-if="value"
          :value="value"
          class="font-bold text-primary-600"
        />
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Status Badge (Link to Detail) -->
      <template #cell-operational_status="{ value, row }">
        <NuxtLink :to="`/office/availabilities/${row.unit_id}`" @click.stop>
          <CellsBadgeCell
            :text="value"
            :color="statusColors[value] || 'neutral'"
            variant="subtle"
            class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
          />
        </NuxtLink>
      </template>

      <!-- Metrics with Color Coding -->
      <template #cell-vacant_days="{ value }">
        <span
          class="font-mono font-bold"
          :style="{ color: getVacancyColor(value) }"
        >
          {{ value ?? 0 }}
        </span>
      </template>

      <template #cell-turnover_days="{ value }">
        <span class="font-mono text-gray-500 dark:text-gray-400">
          {{ value ?? 0 }}
        </span>
      </template>

      <!-- Date formatting -->
      <template #cell-available_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 dark:text-gray-300 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500 italic">Not set</span>
      </template>

      <template #cell-move_out_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 dark:text-gray-300 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">-</span>
      </template>

      <template #cell-move_in_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 dark:text-gray-300 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500 italic text-xs">Unleased</span>
      </template>

      <!-- Resident Name -->
      <template #cell-resident_name="{ value }">
        <span v-if="value" class="text-sm font-semibold text-gray-900 dark:text-white">{{ value }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">-</span>
      </template>

      <!-- Resident Email -->
      <template #cell-resident_email="{ value }">
        <a v-if="value" :href="`mailto:${value}`" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
          {{ value }}
        </a>
        <span v-else class="text-gray-400 dark:text-gray-500 text-xs">-</span>
      </template>

      <!-- Status Badge -->
      <template #cell-status="{ value }">
        <CellsBadgeCell
          :text="value"
          :color="statusColors[value] || 'neutral'"
          variant="subtle"
        />
      </template>

      <!-- Leasing Agent -->
      <template #cell-leasing_agent="{ value }">
        <span v-if="value" class="text-sm text-gray-700 dark:text-gray-200">{{ value }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">-</span>
      </template>

      <!-- Lease Dates -->
      <template #cell-lease_start_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 dark:text-gray-300 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">-</span>
      </template>

      <template #cell-lease_end_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 dark:text-gray-300 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">-</span>
      </template>

      <!-- Lease Rent -->
      <template #cell-lease_rent_amount="{ value }">
        <CellsCurrencyCell
          v-if="value"
          :value="value"
          class="font-bold text-success-600 dark:text-success-400"
        />
        <span v-else class="text-gray-400 dark:text-gray-500">-</span>
      </template>

      <!-- Application Date -->
      <template #cell-application_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 dark:text-gray-300 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">-</span>
      </template>

      <!-- Screening Result -->
      <template #cell-screening_result="{ value }">
        <CellsBadgeCell
          v-if="value"
          :text="value"
          :color="value === 'Accepted' || value === 'Approved' ? 'primary' : value === 'Conditional' ? 'warning' : value === 'Denied' || value === 'Rejected' ? 'error' : 'neutral'"
          variant="subtle"
          size="sm"
        />
        <span v-else class="text-gray-400 dark:text-gray-500 text-xs italic">Pending</span>
      </template>

      <!-- Sync Verification -->
      <template #cell-sync_alerts="{ value }">
        <CellsAlertCell :alerts="value" />
      </template>
    </GenericDataTable>

    <ConstantsModal
      v-if="showConfig"
      title="Availability Rules"
      category="available_status_rules"
      :property-code="activeProperty"
      :on-close="handleConfigClose"
      @close="handleConfigClose"
    />

    <!-- Export Sync Modal -->
    <SimpleModal
      v-model="showSyncModal"
      title="Sync Discrepancies Report"
      width="max-w-4xl"
    >
      <SyncDiscrepanciesModal
        v-if="showSyncModal && filteredData"
        :units="filteredData"
        :floor-plan-name="activePropertyRecord?.name || 'Availabilities'"
        :on-close="handleSyncModalClose"
      />
    </SimpleModal>

    <!-- Amenity Comparison Modal -->
    <SimpleModal
      v-model="showCompareModal"
      title="Amenity Comparison — Yardi vs Database"
      description="Read-only audit. No changes are made to the database."
      width="max-w-6xl"
    >
      <AmenityComparisonModal
        v-if="showCompareModal"
        :rows="comparisonRows"
        :missing-units="missingUnits"
        :total-file-rows="totalFileRows"
        :property-name="activePropertyRecord?.name || activeProperty || 'Property'"
        :on-close="handleCompareModalClose"
      />
    </SimpleModal>

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Availability Manager" 
      description="Leasing Pipeline & Unit Inventory"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Leasing Pipeline</h3>
          <p>
            The Availability Manager tracks units through three main stages, which can be toggled via the <strong>Stage Selector</strong> buttons in the header:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong class="text-primary-600">Available:</strong> Vacant units ready for new applications.</li>
            <li><strong class="text-warning-600">Applied:</strong> Units with pending applications or approved residents awaiting move-in.</li>
            <li><strong class="text-success-600">Leased:</strong> Units with signed leases and confirmed move-in dates.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Pricing & Adjustments</h3>
          <p>
            The <strong>Floor Plan Detailed</strong> button (available to Managers) provides a granular view of inventory performance, facilitating strategic rental adjustments based on current market velocity.
          </p>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Navigation Logic</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Clicking the Unit:</strong> Routes directly to the <strong>Unit Detailed</strong> page for maintenance and occupancy history.</li>
            <li><strong>Clicking the Row:</strong> Routes to the <strong>Availability Detail</strong> view (currently in development) for workflow-specific leasing actions.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Availability Rules</h3>
          <p>
            Color coding for expected move-out and available dates is governed by <strong>App Constants</strong> specifically tuned for each property.
          </p>
          <div class="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
            <strong>Pro Tip:</strong> Click the <UIcon name="i-heroicons-cog-6-tooth" class="inline-block w-3 h-3 align-text-bottom" /> icon in the toolbar to adjust thresholds for "Soon" and "Immediate" availability alerts.
          </div>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
