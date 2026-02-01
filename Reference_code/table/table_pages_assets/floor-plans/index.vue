<script setup lang="ts">
import GenericDataTable from '~/layers/base/components/tables/GenericDataTable.vue'
import CurrencyCell from '~/layers/base/components/tableCells/CurrencyCell.vue'
import type { TableColumn } from '~/layers/base/types/tables'

const supabase = useSupabaseClient()

const authStore = useAuthStore()
const { active_property } = storeToRefs(authStore)

// Fetch Data
const { data: floorPlans, status } = await useAsyncData('floor-plans-view', async () => {
  if (!active_property.value) return []

  let query = supabase
    .from('floor_plans')
    .select('*, properties(name), units(count)')

  // Apply filter if not 'XX'
  if (active_property.value !== 'XX') {
    query = query.eq('property_code', active_property.value)
  } else {
    // If 'XX', sort by property first
    query = query.order('property_code', { ascending: true })
  }
  
  // Sort by SqFt (smallest first) then Code
  query = query
    .order('area_sqft', { ascending: true })
    .order('code', { ascending: true })
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}, {
  watch: [active_property]
})

// Columns
const columns = computed<TableColumn[]>(() => {
  const baseColumns: TableColumn[] = [
    {
      header: 'Code',
      accessorKey: 'code',
      sortable: true
    },
    {
      header: 'Marketing Name',
      accessorKey: 'marketing_name',
      sortable: true
    },
    {
      header: 'Bed',
      accessorKey: 'bedroom_count',
      sortable: true,
      cellProps: () => ({ class: 'text-right' })
    },
    {
      header: 'Bath',
      accessorKey: 'bathroom_count',
      sortable: true,
      cellProps: () => ({ class: 'text-right' })
    },
    {
      header: 'SqFt',
      accessorKey: 'area_sqft',
      sortable: true,
      cellProps: () => ({ class: 'text-right' })
    },
    {
      header: 'Base Rent', // Renamed from Market Rent
      accessorKey: 'market_base_rent',
      sortable: true,
      cellRenderer: markRaw(CurrencyCell),
      cellProps: () => ({ class: 'text-right' })
    },
    {
      header: '# Units',
      accessorKey: 'units.0.count',
      sortable: true,
      cellProps: () => ({ class: 'text-center font-bold' })
    }
  ]
  
  // If showing all properties (XX), prepend the Property Code column
  if (active_property.value === 'XX') {
    baseColumns.unshift({
      header: 'Prop.',
      accessorKey: 'property_code',
      sortable: true,
      cellProps: () => ({ class: 'font-mono' })
    })
  }
  
  return baseColumns
})

const getColumnWidth = (key: string) => {
  if (key === 'marketing_name') return '200px'
  if (key === 'market_base_rent') return '120px'
  return 'auto'
}

const handleRowClick = (row: any) => {
  if (row && row.id) {
    navigateTo(`/assets/floor-plans/${row.id}`)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Floor Plans</h1>
    </div>

    <GenericDataTable
      :data="floorPlans || []"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="id"
      :get-column-width="getColumnWidth"
      @row-click="handleRowClick"
    >
      <template #toolbar="{ filterState }">
        <UInput
          v-model="filterState.globalFilter"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search floor plans..."
          class="max-w-sm"
        />
      </template>
    </GenericDataTable>
  </div>
</template>
