<script setup lang="ts">
import GenericDataTable from '~/layers/base/components/tables/GenericDataTable.vue'
import type { TableColumn } from '~/layers/base/types/tables'

const supabase = useSupabaseClient()

const authStore = useAuthStore()
const { active_property } = storeToRefs(authStore)

// Fetch Data
const { data: buildings, status } = await useAsyncData('buildings-view', async () => {
  if (!active_property.value) return []

  let query = supabase
    .from('buildings')
    .select('*, properties(name), units(count)')
    .order('name')

  // Apply filter ONLY if not 'XX' (All Properties)
  if (active_property.value !== 'XX') {
    query = query.eq('property_code', active_property.value)
  } else {
    // If 'XX', sort by property first for better grouping
    query = query.order('property_code', { ascending: true })
  }
  
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
      header: 'Name',
      accessorKey: 'name',
      sortable: true
    },
    {
      header: 'Address',
      accessorKey: 'street_address'
    },
    {
      header: '# Units',
      accessorKey: 'units.0.count',
      sortable: true,
      cellProps: () => ({ class: 'text-center' })
    }
  ]

  // If showing all properties (XX), prepend the Property Code column
  if (active_property.value === 'XX') {
    baseColumns.unshift({
      header: 'Prop.',
      accessorKey: 'property_code',
      sortable: true,
      cellProps: () => ({ class: 'font-mono font-bold' })
    })
  }

  return baseColumns
})

const getColumnWidth = (key: string) => {
  if (key === 'property_code') return '80px'
  if (key === 'name') return '250px'
  return 'auto'
}

const handleRowClick = (row: any) => {
  if (row && row.id) {
    navigateTo(`/assets/buildings/${row.id}`)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Buildings</h1>
    </div>

    <GenericDataTable
      :data="buildings || []"
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
          placeholder="Search buildings..."
          class="max-w-sm"
        />
      </template>
    </GenericDataTable>
  </div>
</template>
