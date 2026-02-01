<script setup lang="ts">
import GenericDataTable from '~/layers/base/components/tables/GenericDataTable.vue'
import type { TableColumn } from '~/layers/base/types/tables'

const supabase = useSupabaseClient()

// Fetch Data
const { data: properties, status } = await useAsyncData('properties-view', async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*, buildings(count)') // Removed units(count), relying on total_unit_count column or distinct Aggregation in future
    .order('name')
  
  if (error) throw error
  return data
})

// Columns
const columns = ref<TableColumn[]>([
  {
    header: 'Code',
    accessorKey: 'code',
    sortable: true,
    cellProps: () => ({ class: 'font-mono font-bold' })
  },
  {
    header: 'Name',
    accessorKey: 'name',
    sortable: true
  },
  {
    header: 'Address',
    accessorKey: 'street_address'
  },
  {
    header: 'City',
    accessorKey: 'city',
    sortable: true
  },
  {
    header: 'State',
    accessorKey: 'state_code',
    sortable: true,
    cellProps: () => ({ class: 'text-center' }) 
  },
  {
    header: '# Buildings',
    accessorKey: 'buildings.0.count', // Accessing count from subquery array
    sortable: true,
    cellProps: () => ({ class: 'text-center' })
  },
  {
    header: '# Units',
    accessorKey: 'total_unit_count', // Using the cached column on the table
    sortable: true,
    cellProps: () => ({ class: 'text-center font-bold' })
  }
])

const getColumnWidth = (key: string) => {
  if (key === 'code') return '80px'
  if (key === 'state_code') return '80px'
  if (key === 'name') return '250px'
  return 'auto'
}

const handleRowClick = (row: any) => {
  console.log('Row clicked:', row) // Debug log
  if (row && row.id) {
    navigateTo(`/assets/properties/${row.id}`)
  } else {
    console.error('Row click missing ID:', row)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Properties</h1>
    </div>

    <GenericDataTable
      :data="properties || []"
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
          placeholder="Search properties..."
          class="max-w-sm"
        />
      </template>
    </GenericDataTable>
  </div>
</template>
