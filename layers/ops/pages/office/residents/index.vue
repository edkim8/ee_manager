<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns, filterGroups, roleColumns, departmentColumns } from '../../../../../configs/table-configs/residents-complete.generated'
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

// Fetch Residents Data from view
const { data: residents, status, error } = await useAsyncData('residents-list', async () => {
  if (!activeProperty.value) return []
  
  const { data, error } = await supabase
    .from('view_table_residents')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('name')
  
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
    'all', // Residents table currently uses 'all' as base
    userContext.value,
    activeProperty.value
  )
})

// Status color mapping
const tenancyStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning',
  'Applicant': 'neutral',
  'Eviction': 'error',
  'Denied': 'error',
  'Canceled': 'neutral'
}

const roleColors: Record<string, string> = {
  'Primary': 'primary',
  'Roommate': 'neutral',
  'Occupant': 'neutral',
  'Guarantor': 'warning'
}

// Display filters
const displayFilter = ref('All')
const displayOptions = ['All', 'Primary', 'Households']

// Search filter
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!residents.value) return []
  
  let data = residents.value

  // Phase 1: Row/Role Level Filtering
  if (displayFilter.value === 'Primary') {
    data = data.filter((r: any) => r.role === 'Primary')
  } else if (displayFilter.value === 'Households') {
    // Show one per tenancy for specific roles [Roommate, Occupant]
    const seen = new Set()
    data = data.filter((r: any) => {
      const isRelevantRole = ['Roommate', 'Occupant'].includes(r.role)
      if (!isRelevantRole || !r.tenancy_id || seen.has(r.tenancy_id)) return false
      seen.add(r.tenancy_id)
      return true
    })
  }
  
  // Phase 2: String Search
  if (!searchQuery.value) return data
  
  const q = searchQuery.value.toLowerCase()
  return data.filter((r: any) =>
    r.name?.toLowerCase().includes(q) ||
    r.email?.toLowerCase().includes(q) ||
    r.unit_name?.toLowerCase().includes(q) ||
    r.building_name?.toLowerCase().includes(q) ||
    r.tenancy_status?.toLowerCase().includes(q)
  )
})

const handleRowClick = (row: any) => {
  if (row?.id) {
    navigateTo(`/office/residents/${row.id}`)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Residents
      </h1>
      <span v-if="activePropertyRecord?.name" class="text-lg text-gray-500 font-medium">
        &middot; {{ activePropertyRecord.name }}
      </span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <div class="flex items-center gap-2 font-bold mb-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        <span>Error Fetching Residents</span>
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
      export-filename="residents"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search residents..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'resident' : 'residents' }}
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

      <!-- Resident Name with link and icon -->
      <template #cell-name="{ value, row }">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
          <CellsLinkCell
            :value="value"
            :to="`/office/residents/${row.id}`"
          />
        </div>
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

      <!-- Unit Link -->
      <template #cell-unit_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/units/${row.unit_id}`"
        />
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Tenancy Status Badge -->
      <template #cell-tenancy_status="{ value }">
        <CellsBadgeCell
          v-if="value"
          :text="value"
          :color="tenancyStatusColors[value] || 'neutral'"
          variant="outline"
        />
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Role Badge -->
      <template #cell-role="{ value }">
        <UBadge
          v-if="value"
          :color="roleColors[value] || 'neutral'"
          variant="subtle"
          size="sm"
        >
          {{ value }}
        </UBadge>
      </template>

      <!-- Date formatting -->
      <template #cell-move_in_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 font-mono">{{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-move_out_date="{ value }">
        <span v-if="value" class="text-xs text-gray-600 font-mono">{{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-lease_start_date="{ value }">
        <span v-if="value" class="text-xs text-blue-600 font-mono font-medium">{{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-lease_end_date="{ value }">
        <span v-if="value" class="text-xs text-blue-600 font-mono font-medium">{{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <!-- Contact details -->
      <template #cell-email="{ value }">
        <span v-if="value" class="text-sm text-gray-600">{{ value }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #cell-phone="{ value }">
        <span v-if="value" class="text-sm text-gray-600">{{ value }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>
    </GenericDataTable>
  </div>
</template>
