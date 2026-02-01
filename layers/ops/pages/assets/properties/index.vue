<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import type { Tables } from '@/types/supabase'
import type { TableColumn } from '../../../../table/types'

const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

definePageMeta({
  layout: 'dashboard'
})

// Fetch Data - All properties
const { data: properties, status } = await useAsyncData('properties-list', async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data as Tables<'properties'>[]
})

// Columns
const columns: TableColumn[] = [
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    width: '100px'
  },
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    width: '200px'
  },
  {
    key: 'street_address',
    label: 'Address',
    sortable: true
  },
  {
    key: 'city',
    label: 'City',
    sortable: true,
    width: '150px'
  },
  {
    key: 'state_code',
    label: 'ST',
    sortable: true,
    width: '60px',
    align: 'center'
  },
  {
    key: 'total_unit_count',
    label: 'Units',
    sortable: true,
    width: '100px',
    align: 'right'
  },
  {
    key: 'website_url',
    label: 'Website',
    sortable: false,
    width: '120px',
    align: 'center'
  },
  {
    key: 'year_built',
    label: 'Year',
    sortable: true,
    width: '80px',
    align: 'right'
  }
]

// Search filter
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!properties.value) return []
  if (!searchQuery.value) return properties.value
  
  const q = searchQuery.value.toLowerCase()
  return properties.value.filter(p =>
    p.code?.toLowerCase().includes(q) ||
    p.name?.toLowerCase().includes(q) ||
    p.street_address?.toLowerCase().includes(q) ||
    p.city?.toLowerCase().includes(q) ||
    p.state_code?.toLowerCase().includes(q) ||
    p.website_url?.toLowerCase().includes(q)
  )
})

const handleRowClick = (row: Tables<'properties'>) => {
  if (row?.id) {
    navigateTo(`/assets/properties/${row.id}`)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Properties
      </h1>
    </div>

    <GenericDataTable
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="id"
      enable-pagination
      :page-size="25"
      default-sort-field="name"
      clickable
      striped
      enable-export
      export-filename="properties"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search properties..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'property' : 'properties' }}
          </span>
        </div>
      </template>

      <!-- Code cell with monospace font -->
      <template #cell-code="{ value }">
        <span class="font-mono font-bold">{{ value }}</span>
      </template>

      <!-- Name as link -->
      <template #cell-name="{ value, row }">
        <CellsLinkCell
          :value="value"
          :to="`/assets/properties/${row.id}`"
        />
      </template>

      <!-- Website URL cell -->
      <template #cell-website_url="{ value }">
        <UButton
          v-if="value"
          :to="value"
          target="_blank"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-top-right-on-square"
          size="sm"
          @click.stop
        />
        <span v-else class="text-gray-400 text-xs">-</span>
      </template>
    </GenericDataTable>
  </div>
</template>
