<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns } from '../../../../../configs/table-configs/floor_plans-complete.generated'
import { filterColumnsByAccess } from '../../../../table/composables/useTableColumns'

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

// Fetch Data with property join - Filtered by active property
const { data: floorPlans, status } = await useAsyncData('floor-plans-list', async () => {
  if (!activeProperty.value) return []

  const { data, error } = await supabase
    .from('floor_plans')
    .select(`
      *,
      units(id)
    `)
    .eq('property_code', activeProperty.value)
    .order('area_sqft', { ascending: true })
    .order('code', { ascending: true })
  
  if (error) throw error

  // Map database fields to the keys expected by the Excel-generated table config
  return (data as any[]).map(fp => ({
    ...fp,
    sf: fp.area_sqft,
    base_rent: fp.market_base_rent,
    unit_count: fp.units?.length || 0
  }))
}, {
  watch: [activeProperty]
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
      <template #cell-base_rent="{ value }">
        <CellsCurrencyCell :value="value" />
      </template>
    </GenericDataTable>

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Floor Plans Inventory" 
      description="Specifications, Pricing & Unit Distribution"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">What are Floor Plans?</h3>
          <p>
            Floor Plans define the layout, square footage, and market rent for a group of units. They are the blueprint for your inventory management.
          </p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Key Metrics</h3>
          <ul class="list-disc pl-5 space-y-2">
            <li><strong>Market Rent:</strong> The baseline base rent established for this specific layout.</li>
            <li><strong>SF (SqFt):</strong> The total livable square footage for units associated with this plan.</li>
            <li><strong>Unit Count:</strong> The total number of physical units currently assigned to this floor plan.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Navigation</h3>
          <p>
            Click the floor plan <strong>Code</strong> to view more granular details, including a breakdown of specific units and their financial performance.
          </p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Access-Driven Visibility</h3>
          <p>
             Financial data (Market Rent) and inventory specifics are dynamically filtered based on your security profile (Department and Role).
          </p>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
