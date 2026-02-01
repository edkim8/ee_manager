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
const { data: activePropertyRecord } = await useAsyncData('active-property-header', async () => {
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

// Fetch Data with multiple joins - Filtered by active property
const { data: units, status, error } = await useAsyncData('units-list', async () => {
  if (!activeProperty.value) return []
  
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('unit_name')
  
  if (error) throw error
  return data
}, {
  watch: [activeProperty]
})

// Columns
const columns: TableColumn[] = [
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '120px'
  },
  {
    key: 'building_name',
    label: 'Building',
    sortable: true,
    width: '180px'
  },
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true,
    width: '180px'
  },
  {
    key: 'floor_plan_marketing_name',
    label: 'Floor Plan',
    sortable: true,
    width: '180px'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '80px',
    align: 'right'
  },
  {
    key: 'tenancy_status',
    label: 'Tenancy',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'move_in_date',
    label: 'In',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'move_out_date',
    label: 'Out',
    sortable: true,
    width: '110px',
    align: 'center'
  },
  {
    key: 'floor_number',
    label: 'Floor',
    sortable: true,
    width: '80px',
    align: 'center'
  }
]

// Status color mapping
const statusColors: Record<string, string> = {
  'Available': 'success',
  'Leased': 'primary',
  'Applied': 'warning',
  'Occupied': 'neutral'
}

const tenancyStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning'
}

// Search filter
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!units.value) return []
  if (!searchQuery.value) return units.value
  
  const q = searchQuery.value.toLowerCase()
  return units.value.filter(u =>
    u.unit_name?.toLowerCase().includes(q) ||
    u.property_code?.toLowerCase().includes(q) ||
    u.building_name?.toLowerCase().includes(q) ||
    u.resident_name?.toLowerCase().includes(q) ||
    u.floor_plan_marketing_name?.toLowerCase().includes(q) ||
    u.tenancy_status?.toLowerCase().includes(q)
  )
})

const handleRowClick = (row: any) => {
  if (row?.id) {
    navigateTo(`/assets/units/${row.id}`)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Units
      </h1>
      <span v-if="activePropertyRecord?.name" class="text-lg text-gray-500 font-medium">
        &middot; {{ activePropertyRecord.name }}
      </span>
    </div>

    <!-- Error State Debugging -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <div class="flex items-center gap-2 font-bold mb-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        <span>Error Fetching Units</span>
      </div>
      <p class="text-sm">{{ error.message }}</p>
      <details class="mt-2 text-[10px]">
        <summary class="cursor-pointer opacity-70">Raw Error Details</summary>
        <pre class="mt-1 p-2 bg-red-100/50 rounded overflow-auto">{{ error }}</pre>
      </details>
    </div>

    <GenericDataTable
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="id"
      enable-pagination
      :page-size="25"
      default-sort-field="unit_name"
      clickable
      striped
      enable-export
      export-filename="units"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search units..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'unit' : 'units' }}
          </span>
        </div>
      </template>

      <!-- Unit name as link -->
      <template #cell-unit_name="{ value, row }">
        <CellsLinkCell
          :value="value"
          :to="`/assets/units/${row.id}`"
        />
      </template>

      <!-- Building name as link -->
      <template #cell-building_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/buildings/${row.building_id}`"
        />
        <span v-else>-</span>
      </template>

      <!-- Floor plan from join -->
      <template #cell-floor_plan_marketing_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/floor-plans/${row.floor_plan_id}`"
        />
        <span v-else>-</span>
      </template>

      <!-- Tenancy status with badge -->
      <template #cell-tenancy_status="{ value }">
        <CellsBadgeCell
          v-if="value"
          :text="value"
          :color="tenancyStatusColors[value] || 'neutral'"
          variant="outline"
        />
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- SQFT display as link -->
      <template #cell-sf="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value.toLocaleString()"
          :to="`/assets/floor-plans/${row.floor_plan_id}`"
          class="text-gray-600"
        />
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Resident Name as link with icon -->
      <template #cell-resident_name="{ value, row }">
        <div v-if="value" class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
          <CellsLinkCell
            :value="value"
            :to="`/assets/residents/${row.resident_id}`"
            class="text-gray-600 font-medium"
          />
        </div>
        <span v-else class="text-gray-400 italic text-xs">No active resident</span>
      </template>

      <!-- Date formatting -->
      <template #cell-move_in_date="{ value }">
        <span v-if="value" class="text-sm text-gray-600 font-mono">{{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-move_out_date="{ value }">
        <span v-if="value" class="text-sm text-gray-600 font-mono">{{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>
    </GenericDataTable>
  </div>
</template>
