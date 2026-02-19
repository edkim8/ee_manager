<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import type { Tables } from '@/types/supabase'

// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns, filterGroups, roleColumns, departmentColumns } from '../../../../../configs/table-configs/properties-complete.generated'
import { getAccessibleColumns } from '../../../../table/utils/column-filtering'

const supabase = useSupabaseClient()
const { activeProperty, userContext } = usePropertyState()

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

// DEBUG: Log column classes on mount
onMounted(() => {
  console.log('🔍 DEBUG: Properties Table Columns')
  console.log('Total columns:', allColumns.length)
  allColumns.forEach((col, idx) => {
    console.log(`Column ${idx + 1}: ${col.key}`, {
      label: col.label,
      class: col.class || '(none - always visible)',
      headerClass: col.headerClass || '(none)'
    })
  })

  // Check actual DOM elements after a short delay
  setTimeout(() => {
    console.log('\n🔍 DEBUG: Actual DOM Classes')
    const headers = document.querySelectorAll('th')
    headers.forEach((th, idx) => {
      console.log(`Header ${idx}:`, {
        text: th.textContent?.trim(),
        classes: th.className,
        computedDisplay: window.getComputedStyle(th).display,
        isVisible: window.getComputedStyle(th).display !== 'none'
      })
    })
  }, 1000)
})

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
