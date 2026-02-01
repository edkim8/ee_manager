<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import type { TableColumn } from '../../../../table/types'

const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

definePageMeta({
  layout: 'dashboard'
})

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

// Fetch Availabilities Data from view
const { data: availabilities, status, error } = await useAsyncData('availabilities-list', async () => {
  if (!activeProperty.value) return []
  
  const { data, error } = await supabase
    .from('view_table_availabilities')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('available_date', { ascending: true })
  
  if (error) throw error
  return data
}, {
  watch: [activeProperty]
})

// Columns configuration
const columns: TableColumn[] = [
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '90px',
    align: 'center'
  },
  {
    key: 'building_name',
    label: 'Building',
    sortable: true,
    width: '180px'
  },
  {
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '80px',
    align: 'right'
  },
  {
    key: 'rent_offered',
    label: 'Rent',
    sortable: true,
    width: '100px',
    align: 'right'
  },
  {
    key: 'operational_status',
    label: 'Ops Status',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'vacant_days',
    label: 'Vacant',
    sortable: true,
    width: '90px',
    align: 'center'
  },
  {
    key: 'turnover_days',
    label: 'Turnover',
    sortable: true,
    width: '90px',
    align: 'center'
  },
  {
    key: 'available_date',
    label: 'Available Date',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'move_in_date',
    label: 'Est. Move In',
    sortable: true,
    width: '130px',
    align: 'center'
  },
  {
    key: 'leasing_agent',
    label: 'Leasing Agent',
    sortable: true,
    width: '150px'
  }
]

// Status color mapping
const statusColors: Record<string, string> = {
  'Available': 'primary',
  'Applied': 'warning',
  'Leased': 'success'
}

// Display filters
const displayFilter = ref('Available')
const displayOptions = ['All', 'Available', 'Applied', 'Leased']

// Vacancy color mapping logic
const getVacancyColor = (days: number | null) => {
  const vc = days ?? 0
  if (vc >= 0) return '#B91C1C'  // Darker Rich Red (Currently Vacant)
  if (vc >= -25) return '#F472B6' // Pink (-1 to -25)
  if (vc >= -50) return '#FBBF24' // Yellow (-26 to -50)
  if (vc >= -75) return '#34D399' // Green (-51 to -75)
  return '#60A5FA'               // Blue (<-75)
}

// Search filter
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!availabilities.value) return []
  
  let data = availabilities.value

  // Phase 1: Operational Status Filtering
  if (displayFilter.value !== 'All') {
    data = data.filter((a: any) => a.operational_status === displayFilter.value)
  }
  
  // Phase 2: String Search
  if (!searchQuery.value) return data
  
  const q = searchQuery.value.toLowerCase()
  return data.filter((a: any) =>
    a.unit_name?.toLowerCase().includes(q) ||
    a.building_name?.toLowerCase().includes(q) ||
    a.operational_status?.toLowerCase().includes(q) ||
    a.leasing_agent?.toLowerCase().includes(q)
  )
})

const handleRowClick = (row: any) => {
  if (row?.unit_id) {
    navigateTo(`/assets/units/${row.unit_id}`)
  }
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
      default-sort-field="available_date"
      default-sort-direction="asc"
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
        <span class="text-xs font-black text-white drop-shadow-sm">{{ value || '-' }}</span>
      </template>

      <!-- SF -->
      <template #cell-sf="{ value }">
        <span class="font-mono text-xs">{{ value || '-' }}</span>
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
          :class="value > 30 ? 'text-red-600' : (value > 14 ? 'text-orange-500' : 'text-gray-600')"
        >
          {{ value ?? 0 }}d
        </span>
      </template>

      <template #cell-turnover_days="{ value }">
        <span class="font-mono text-gray-500">
          {{ value ?? 0 }}d
        </span>
      </template>

      <!-- Date formatting -->
      <template #cell-available_date="{ value }">
        <span v-if="value" class="text-xs text-gray-500 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 italic">Not set</span>
      </template>

      <template #cell-move_out_date="{ value }">
        <span v-if="value" class="text-xs text-gray-500 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-move_in_date="{ value }">
        <span v-if="value" class="text-xs text-gray-500 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400 italic text-xs">Unleased</span>
      </template>
    </GenericDataTable>
  </div>
</template>
