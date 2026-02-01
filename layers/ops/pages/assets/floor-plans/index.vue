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

// Fetch Data with property join - Filtered by active property
const { data: floorPlans, status } = await useAsyncData('floor-plans-list', async () => {
  if (!activeProperty.value) return []

  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('area_sqft', { ascending: true })
    .order('code', { ascending: true })
  
  if (error) throw error
  return data
}, {
  watch: [activeProperty]
})

// Columns
const columns: TableColumn[] = [
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    width: '120px'
  },
  {
    key: 'marketing_name',
    label: 'Marketing Name',
    sortable: true,
    width: '200px'
  },
  {
    key: 'bedroom_count',
    label: 'Beds',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'bathroom_count',
    label: 'Baths',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'area_sqft',
    label: 'Sqft',
    sortable: true,
    width: '100px',
    align: 'right'
  },
  {
    key: 'market_base_rent',
    label: 'Base Rent',
    sortable: true,
    width: '120px',
    align: 'right'
  }
]

// Search filter
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!floorPlans.value) return []
  if (!searchQuery.value) return floorPlans.value
  
  const q = searchQuery.value.toLowerCase()
  return floorPlans.value.filter(fp =>
    fp.code?.toLowerCase().includes(q) ||
    fp.marketing_name?.toLowerCase().includes(q) ||
    (fp.properties as any)?.name?.toLowerCase().includes(q)
  )
})

const handleRowClick = (row: any) => {
  if (row?.id) {
    navigateTo(`/assets/floor-plans/${row.id}`)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Floor Plans
      </h1>
      <span v-if="activePropertyRecord?.name" class="text-lg text-gray-500 font-medium">
        &middot; {{ activePropertyRecord.name }}
      </span>
    </div>

    <GenericDataTable
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="id"
      enable-pagination
      :page-size="25"
      default-sort-field="area_sqft"
      clickable
      striped
      enable-export
      export-filename="floor-plans"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search floor plans..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'floor plan' : 'floor plans' }}
          </span>
        </div>
      </template>

      <!-- Code with monospace link -->
      <template #cell-code="{ value, row }">
        <CellsLinkCell
          :value="value"
          :to="`/assets/floor-plans/${row.id}`"
          class="font-mono"
        />
      </template>

      <!-- Base Rent with currency formatting -->
      <template #cell-market_base_rent="{ value }">
        <CellsCurrencyCell :value="value" />
      </template>
    </GenericDataTable>
  </div>
</template>
