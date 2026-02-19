<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns, filterGroups, roleColumns, departmentColumns } from '../../../../../configs/table-configs/leases-complete.generated'
import { getAccessibleColumns } from '../../../../table/utils/column-filtering'

const supabase = useSupabaseClient()
const { activeProperty, userContext } = usePropertyState()

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

// Fetch Leases Data from view
const { data: leases, status, error } = await useAsyncData('leases-list', async () => {
  if (!activeProperty.value) return []
  
  const { data, error } = await supabase
    .from('view_table_leases')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('unit_name')
  
  if (error) throw error
  return data
}, {
  watch: [activeProperty]
})

// Columns from Excel configuration - Restricted by Role/Dept
const columns = computed(() => {
  return getAccessibleColumns(
    allColumns,
    filterGroups,
    roleColumns,
    departmentColumns,
    'all',
    userContext.value,
    activeProperty.value
  )
})

// Status color mapping
const statusColors: Record<string, string> = {
  'Current': 'primary',
  'Active': 'primary',
  'Pending': 'warning',
  'Notice': 'warning',
  'Closed': 'neutral',
  'Terminated': 'error',
  'Expired': 'neutral'
}

// Display filters
const displayFilter = ref('Active')
const displayOptions = ['All', 'Active', 'Pending']

const searchQuery = ref('')
const filteredData = computed(() => {
  if (!leases.value) return []
  
  let data = leases.value

  // Phase 1: Status Filtering
  if (displayFilter.value === 'Active') {
    data = data.filter((l: any) => l.is_active === true)
  } else if (displayFilter.value === 'Pending') {
    data = data.filter((l: any) => l.lease_status === 'pending')
  }
  
  // Phase 2: String Search
  if (!searchQuery.value) return data
  
  const q = searchQuery.value.toLowerCase()
  return data.filter((l: any) =>
    l.resident_name?.toLowerCase().includes(q) ||
    l.unit_name?.toLowerCase().includes(q) ||
    l.building_name?.toLowerCase().includes(q) ||
    l.lease_status?.toLowerCase().includes(q)
  )
})

const handleRowClick = (row: any) => {
  if (row?.id) {
    navigateTo(`/office/leases/${row.id}`)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Leases
      </h1>
      <span v-if="activePropertyRecord?.name" class="text-lg text-gray-500 font-medium">
        &middot; {{ activePropertyRecord.name }}
      </span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <div class="flex items-center gap-2 font-bold mb-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        <span>Error Fetching Leases</span>
      </div>
      <p class="text-sm">{{ error.message }}</p>
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
      export-filename="leases"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search leases..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'lease' : 'leases' }}
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

      <!-- Unit Link -->
      <template #cell-unit_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/units/${row.unit_id}`"
        />
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Resident Link with icon -->
      <template #cell-resident_name="{ value, row }">
        <div v-if="value" class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
          <CellsLinkCell
            :value="value"
            :to="`/office/residents/${row.resident_id}`"
            class="text-gray-600 font-medium"
          />
        </div>
        <span v-else class="text-gray-400 italic text-xs">No primary resident</span>
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

      <!-- Household Count -->
      <template #cell-household_count="{ value }">
        <span class="text-sm font-medium text-gray-500">{{ value || 0 }}</span>
      </template>

      <!-- Date formatting -->
      <template #cell-move_in_date="{ value }">
        <span v-if="value" class="text-xs text-gray-500 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-start_date="{ value }">
        <span v-if="value" class="text-xs text-gray-500 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-end_date="{ value }">
        <span v-if="value" class="text-sm text-gray-600 font-mono">{{ new Date(value).toLocaleDateString() }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Currency formatting -->
      <template #cell-rent_amount="{ value }">
        <span v-if="value !== null" class="font-bold text-primary-600">
          ${{ value.toLocaleString() }}
        </span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-deposit_amount="{ value }">
        <span v-if="value !== null" class="text-gray-600">
          ${{ value.toLocaleString() }}
        </span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Status Badge with MTM indicator -->
      <template #cell-lease_status="{ value, row }">
        <div class="flex items-center justify-center gap-1.5">
          <CellsBadgeCell
            :text="value"
            :color="value === 'Notice' ? 'warning' : (row.is_active ? 'primary' : (statusColors[value] || 'neutral'))"
            variant="subtle"
          />
          <UTooltip v-if="row.is_mtm" text="Month-to-Month Lease">
            <UIcon 
              name="i-heroicons-calendar-days" 
              class="w-5 h-5 text-red-500 animate-pulse" 
            />
          </UTooltip>
        </div>
      </template>
    </GenericDataTable>
  </div>
</template>
