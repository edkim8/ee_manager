<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../base/composables/usePropertyState'
import type { TableColumn } from '../../../table/types'
import type { Database } from '~/types/supabase'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient<Database>()
const { activeProperty } = usePropertyState()

// --- Data Fetching ---
const { data: history, status } = await useAsyncData('amenities-history', async () => {
  if (!activeProperty.value) return []
  
  // Fetch activity from unit_amenities 
  // Since we merged audit into the link table, we look at created_at/updated_at
  const { data, error } = await supabase
    .from('unit_amenities')
    .select(`
      id,
      unit_id,
      amenity_id,
      comment,
      user_id,
      active,
      created_at,
      updated_at,
      units (unit_name),
      amenities (yardi_name, type)
    `)
    .eq('amenities.property_code', activeProperty.value)
    .order('updated_at', { ascending: false })
    .limit(200)
  
  if (error) throw error
  return data
}, { watch: [activeProperty] })

// --- Table Configuration ---
const columns: TableColumn[] = [
  { key: 'updated_at', label: 'Date', sortable: true, width: '160px' },
  { key: 'unit_name', label: 'Unit', sortable: true, width: '100px' },
  { key: 'amenity_name', label: 'Amenity', sortable: true },
  { key: 'action', label: 'Action', sortable: true, width: '120px' },
  { key: 'comment', label: 'Comment' },
  { key: 'user_id', label: 'User', width: '150px' }
]

// --- Search/Filter ---
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!history.value) return []
  
  const mapped = history.value.map((h: any) => ({
    ...h,
    unit_name: h.units?.unit_name,
    amenity_name: h.amenities?.yardi_name,
    action: h.active ? 'Added/Active' : 'Removed/Inactive'
  }))

  if (!searchQuery.value) return mapped
  
  const q = searchQuery.value.toLowerCase()
  return mapped.filter((h: any) => 
    h.unit_name?.toLowerCase().includes(q) || 
    h.amenity_name?.toLowerCase().includes(q) ||
    h.comment?.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
        <UButton
            to="/amenities"
            icon="i-heroicons-arrow-left"
            color="gray"
            variant="ghost"
            class="-ml-2"
        />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Amenity History</h1>
    </div>

    <GenericDataTable
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="id"
      enable-pagination
      :page-size="25"
      default-sort-field="updated_at"
      striped
    >
      <template #toolbar>
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Filter history..."
          class="w-64"
        />
      </template>

      <!-- Date -->
      <template #cell-updated_at="{ value }">
        <span class="text-xs font-mono text-gray-600">
          {{ new Date(value).toLocaleString() }}
        </span>
      </template>

      <!-- Action Badge -->
      <template #cell-action="{ row }">
        <UBadge 
            :color="row.active ? 'success' : 'gray'" 
            variant="subtle" 
            size="xs"
        >
          {{ row.active ? 'Activated' : 'Deactivated' }}
        </UBadge>
      </template>

      <!-- User -->
      <template #cell-user_id="{ value }">
        <span class="text-xs text-gray-400 truncate block w-32">
          {{ value || 'System Sync' }}
        </span>
      </template>
    </GenericDataTable>
  </div>
</template>
