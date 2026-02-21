<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'

// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns } from '../../../../../configs/table-configs/buildings-complete.generated'
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
const { data: buildings, status } = await useAsyncData('buildings-list', async () => {
  if (!activeProperty.value) return []
  
  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      units(
        id,
        floor_plans(id, code)
      )
    `)
    .eq('property_code', activeProperty.value)
    .order('name')
  
  if (error) throw error

  // Process data to get counts and unique floor plans
  return (data as any[]).map(b => {
    const unitList = b.units || []
    
    // Get unique floor plans by id
    const plansMap = new Map()
    unitList.forEach((u: any) => {
      if (u.floor_plans?.id) {
        plansMap.set(u.floor_plans.id, u.floor_plans.code)
      }
    })
    
    const floorPlans = Array.from(plansMap.entries())
      .map(([id, code]) => ({ id, code }))
      .sort((a, b) => a.code.localeCompare(b.code))

    return {
      ...b,
      unit_count: unitList.length,
      floor_plans_data: floorPlans
    }
  })
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
  if (!buildings.value) return []
  if (!searchQuery.value) return buildings.value
  
  const q = searchQuery.value.toLowerCase()
  return buildings.value.filter((b: any) =>
    b.name?.toLowerCase().includes(q) ||
    b.street_address?.toLowerCase().includes(q) ||
    b.floor_plans_data?.some((fp: any) => fp.code?.toLowerCase().includes(q))
  )
})

const handleRowClick = (row: any) => {
  if (row?.id) {
    navigateTo(`/assets/buildings/${row.id}`)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Buildings
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
      default-sort-field="name"
      clickable
      striped
      enable-export
      export-filename="buildings"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search buildings..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'building' : 'buildings' }}
          </span>
        </div>
      </template>

      <!-- Building name as link -->
      <template #cell-name="{ value, row }">
        <CellsLinkCell
          :value="value"
          :to="`/assets/buildings/${row.id}`"
        />
      </template>

      <!-- Floor plans with links -->
      <template #cell-floor_plans_data="{ value, column }">
        <div 
          class="flex flex-wrap gap-1 py-1"
          :style="{ minWidth: column.width || '200px' }"
        >
          <template v-for="fp in value" :key="fp.id">
            <NuxtLink :to="`/assets/floor-plans/${fp.id}`" class="inline-block" @click.stop>
              <CellsBadgeCell
                :text="fp.code"
                color="primary"
                variant="subtle"
                class="hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors cursor-pointer"
              />
            </NuxtLink>
          </template>
          <span v-if="!value || value.length === 0" class="text-gray-400">-</span>
        </div>
      </template>
    </GenericDataTable>
    
    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Buildings Overview" 
      description="Managing Physical Structures & Floor Plan Inventory"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">What are Buildings?</h3>
          <p>
            Buildings are sub-entities of a Property. They organize units and floor plans within a specific physical structure on the site.
          </p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Quick Navigation</h3>
          <ul class="list-disc pl-5 space-y-2">
            <li><strong>Building Details:</strong> Click a building name to view its specific unit list and attribute data.</li>
            <li><strong>Floor Plan Badges:</strong> Click any <CellsBadgeCell text="FP" color="primary" variant="subtle" class="inline-block scale-75" /> badge to jump directly to that Floor Plan's detailed specifications.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Access-Driven Visibility</h3>
          <p>
            Column visibility (e.g., Year Built, Total Units) is governed by your security profile. Your <strong>Department</strong> and <strong>Role</strong> determine which relevant data points are displayed.
          </p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Inventory Summary</h3>
          <p>
            This view provides a high-level summary of how many units are contained in each building and which floor plans are represented within that structure.
          </p>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
