<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import type { Tables } from '@/types/supabase'
import ContextHelper from '../../../../base/components/ContextHelper.vue'

// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns } from '../../../../../configs/table-configs/properties-complete.generated'
import { filterColumnsByAccess } from '../../../../table/composables/useTableColumns'

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
  return filterColumnsByAccess(allColumns, {
    userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
    userDepartment: userContext.value?.profile?.department,
    isSuperAdmin: !!userContext.value?.access?.is_super_admin,
    filterGroup: 'all'
  })
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
          <span class="text-sm text-gray-400">
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

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Properties Overview" 
      description="Understanding the Property Portfolio Management"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">What are Properties?</h3>
          <p>
            Properties are the top-level entity in the EE_manager system. Every building, unit, resident, and lease is associated with a specific property.
          </p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Search & Navigation</h3>
          <ul class="list-disc pl-5 space-y-2">
            <li><strong>Search:</strong> Filter the list by property code, name, or address using the search bar above the table.</li>
            <li><strong>Navigation:</strong> Click any row to view the <strong>Property Detail Page</strong>.</li>
            <li><strong>Website Links:</strong> Click the <UIcon name="i-heroicons-arrow-top-right-on-square" class="inline-block w-4 h-4" /> icon to open the property's external website in a new tab.</li>
            <li>
              <strong>Sorting:</strong> Click any column header to toggle sorting.
              <ul class="list-circle pl-5 mt-1 text-xs text-gray-500">
                <li>First Click: Ascending order (A-Z)</li>
                <li>Second Click: Descending order (Z-A)</li>
                <li>Third Click: Resets to default sorting</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Access-Driven Visibility</h3>
          <p>
            The columns you see are dynamically filtered based on your security profile. Your <strong>Department</strong> and <strong>Role</strong> govern which relevant data is visible or hidden.
          </p>
          <p class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded text-xs italic">
            Tip: You can verify your assigned Role and Department on your <strong>Profile Page</strong>.
          </p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Exporting Data</h3>
          <p>
            Use the <strong>Export</strong> button in the table actions to download the current view as a CSV or PDF file for external reporting.
          </p>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
