<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta, useOverlay, refreshNuxtData } from '#imports'
import { useConstantsMutation, type AppConstant } from '../../../../base/composables/mutations/useConstantsMutation'
import ConstantsModal from '../../../../base/components/modals/ConstantsModal.vue'
import type { TableColumn } from '../../../../table/types'

const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

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

// Fetch Leasing Pipeline Data and Pricing Analysis in parallel
const { data: availabilities, status, error, refresh: refreshAvailabilities } = await useAsyncData('availabilities-list', async () => {
  if (!activeProperty.value) return []

  // 1. Fetch Pipeline data
  const { data: pipelineData, error: pipelineError } = await supabase
    .from('view_leasing_pipeline')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order(defaultSortField.value, { ascending: defaultSortDirection.value === 'asc' })

  if (pipelineError) throw pipelineError

  // 2. Fetch Pricing Analysis data
  const { data: pricingData } = await supabase
    .from('view_unit_pricing_analysis')
    .select('*')
    .eq('property_code', activeProperty.value)

  // 3. Fetch Concession Analysis data
  const { data: concessionData } = await supabase
    .from('view_concession_analysis')
    .select('*')
    .eq('property_code', activeProperty.value)

  // 4. Join logic
  const pricingMap = new Map()
  pricingData?.forEach((p: any) => pricingMap.set(p.unit_id, p))

  const concessionMap = new Map()
  concessionData?.forEach((c: any) => concessionMap.set(c.unit_id, c))

  return pipelineData.map((item: any) => {
    const calculated = pricingMap.get(item.unit_id)?.calculated_offered_rent || 0
    const offered = Number(item.rent_offered || 0)
    const matches = Math.abs(offered - calculated) < 0.01

    const concession = concessionMap.get(item.unit_id)

    return {
      ...item,
      calculated_offered_rent: calculated,
      sync_alerts: !matches
        ? [`Yardi Rent ($${offered.toLocaleString()}) does not match internal calculation ($${calculated.toLocaleString()})`]
        : [],
      // Concession data
      concession_display: concession?.concession_display || '0%/0%',
      concession_amenity_pct: concession?.concession_amenity_pct || 0,
      concession_total_pct: concession?.concession_total_pct || 0,
      concession_upfront_amount: concession?.concession_upfront_amount || 0,
      concession_free_rent_days: concession?.concession_free_rent_days || 0
    }
  })
}, {
  watch: [activeProperty, displayFilter]  // Re-fetch when filter changes to apply new sort
})

// Base columns (always visible)
const baseColumns: TableColumn[] = [
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '90px',
    align: 'center'
  },
  {
    key: 'sync_alerts',
    label: 'Sync',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'building_name',
    label: 'Building',
    sortable: true,
    width: '150px'
  },
  {
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '130px'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '80px',
    align: 'right'
  },
  {
    key: 'bedroom_count',
    label: 'Beds',
    sortable: true,
    width: '70px',
    align: 'center'
  }
]

// Status-specific columns
const availableColumns: TableColumn[] = [
  {
    key: 'rent_offered',
    label: 'Rent',
    sortable: true,
    width: '100px',
    align: 'right'
  },
  {
    key: 'available_date',
    label: 'Available',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'vacant_days',
    label: 'Vacant',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '110px',
    align: 'center'
  }
]

const appliedColumns: TableColumn[] = [
  {
    key: 'resident_name',
    label: 'Applicant',
    sortable: true,
    width: '160px'
  },
  {
    key: 'resident_email',
    label: 'Email',
    sortable: true,
    width: '200px'
  },
  {
    key: 'application_date',
    label: 'Applied',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'screening_result',
    label: 'Screening',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'move_in_date',
    label: 'Target Move-In',
    sortable: true,
    width: '130px',
    align: 'center'
  },
  {
    key: 'concession_display',
    label: '% Concession',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'leasing_agent',
    label: 'Agent',
    sortable: true,
    width: '120px'
  }
]

const leasedColumns: TableColumn[] = [
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true,
    width: '160px'
  },
  {
    key: 'resident_email',
    label: 'Email',
    sortable: true,
    width: '200px'
  },
  {
    key: 'lease_start_date',
    label: 'Lease Start',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'lease_end_date',
    label: 'Lease End',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'lease_rent_amount',
    label: 'Rent',
    sortable: true,
    width: '100px',
    align: 'right'
  },
  {
    key: 'concession_display',
    label: '% Concession',
    sortable: true,
    width: '110px',
    align: 'center'
  }
]

// Dynamic columns based on filter
const columns = computed(() => {
  const base = [...baseColumns]

  // Add status column
  base.push({
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '110px',
    align: 'center'
  })

  // Add status-specific columns based on filter
  if (displayFilter.value === 'Available') {
    return [...base, ...availableColumns]
  } else if (displayFilter.value === 'Applied') {
    return [...base, ...appliedColumns]
  } else if (displayFilter.value === 'Leased') {
    return [...base, ...leasedColumns]
  } else {
    // 'All' - show a mixed set of most useful columns
    return [
      ...base,
      {
        key: 'resident_name',
        label: 'Resident',
        sortable: true,
        width: '160px'
      },
      {
        key: 'available_date',
        label: 'Available',
        sortable: true,
        width: '110px',
        align: 'center'
      },
      {
        key: 'move_in_date',
        label: 'Move-In',
        sortable: true,
        width: '110px',
        align: 'center'
      },
      {
        key: 'rent_offered',
        label: 'Rent',
        sortable: true,
        width: '100px',
        align: 'right'
      }
    ]
  }
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

const overlay = useOverlay()
const openConfig = () => {
  const modal = overlay.create(ConstantsModal)
  modal.open({ 
    title: 'Availability Rules',
    category: 'available_status_rules',
    propertyCode: activeProperty.value,
    onClose: async (saved: boolean) => {
      // 1. Close modal immediately to avoid "stuck" UI
      modal.close()
      
      console.log(`[Availabilities] Modal closed with saved=${saved}`)
      
      if (saved) {
        console.log('[Availabilities] Reloading all page data...')
        // 2. Use Nuxt's global refresh to ensure everything (inventory + config) updates
        await refreshNuxtData()
        console.log('[Availabilities] Page data reloaded.')
      }
    }
  })
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
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

    <!-- Error State -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <div class="flex items-center gap-2 font-bold mb-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        <span>Error Fetching Availabilities</span>
      </div>
      <p class="text-sm">{{ error.message }}</p>
    </div>

    <GenericDataTable
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
          :color="value === 'Approved' ? 'success' : value === 'Denied' ? 'error' : 'warning'"
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
  </div>
</template>
