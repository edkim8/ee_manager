<script setup lang="ts">
import GenericDataTable from '~/layers/base/components/tables/GenericDataTable.vue'
const supabase = useSupabaseClient()

const authStore = useAuthStore()
const { active_property } = storeToRefs(authStore)

// Fetch Data
const { data: units, status } = await useAsyncData('units-view', async () => {
  if (!active_property.value) return []

  let query = supabase
    .from('units')
    .select('*, buildings(name), floor_plans(marketing_name, code, bedroom_count, bathroom_count, area_sqft)')
    .order('unit_number')

  // Apply filter if not 'XX'
  if (active_property.value !== 'XX') {
    query = query.eq('property_code', active_property.value)
  } else {
    // If 'XX', sort by property first
    query = query.order('property_code', { ascending: true })
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  // Transform for display (flatten nested objects where helpful)
  return data.map((u: any) => ({
    ...u,
    // Helper accessors if needed, though we can use nested keys in GenericDataTable
  }))
}, {
  watch: [active_property]
})

type UnitRow = typeof units.value[0]

// Columns
const columns = useUnitTableColumns(active_property)

const getColumnWidth = (key: string) => {
  if (key === 'unit_number') return '100px'
  if (key === 'floor_plans.code') return '120px'
  return 'auto'
}

const handleRowClick = (row: any) => {
  if (row && row.id) {
    navigateTo(`/assets/units/${row.id}`)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Units</h1>
    </div>

    <GenericDataTable
      :data="units || []"
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
          placeholder="Search units..."
          class="max-w-sm"
        />
      </template>
    </GenericDataTable>
  </div>
</template>
