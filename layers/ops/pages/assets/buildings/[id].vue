<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import type { TableColumn } from '../../../../table/types'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const buildingId = route.params.id as string

const showImageModal = ref(false)

// Fetch Building Details
const { data: building, status, error } = await useAsyncData(`building-${buildingId}`, async () => {
  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      properties (
        name,
        code
      )
    `)
    .eq('id', buildingId)
    .single()

  if (error) throw error
  return data
})

// Fetch Units for this building
const { data: units, status: unitsStatus } = await useAsyncData(`building-units-${buildingId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('building_id', buildingId)
    .order('unit_name')
  
  if (error) throw error
  return data
})

const columns: TableColumn[] = [
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '100px'
  },
  {
    key: 'floor_number',
    label: 'Floor',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'floor_plan_code',
    label: 'Floor Plan',
    sortable: true,
    width: '120px'
  },
  {
    key: 'tenancy_status',
    label: 'Status',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true
  }
]

const tenancyStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning'
}

const unitTypesCount = computed(() => {
  if (!units.value) return 0
  const uniquePlans = new Set(units.value.map((u: any) => u.floor_plan_code).filter(Boolean))
  return uniquePlans.size
})

// Computed Image URL
const imageUrl = computed(() => {
  const path = building.value?.primary_image_url
  if (!path) return null
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})

const handleUnitClick = (row: any) => {
  if (row?.id) {
    router.push(`/assets/units/${row.id}`)
  }
}

const goBack = () => {
  router.push('/assets/buildings')
}

const openInNewTab = () => {
  if (imageUrl.value) {
    window.open(imageUrl.value, '_blank')
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/assets/buildings" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Buildings</NuxtLink>
        </li>
        <li v-if="building">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">{{ building.name }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Content Handling -->
    <div v-if="status === 'pending'" class="p-12 space-y-8">
      <USkeleton class="h-12 w-1/3" />
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <USkeleton class="h-64 lg:col-span-2" />
        <USkeleton class="h-64" />
      </div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading building</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="goBack">Back to List</UButton>
    </div>

    <div v-else-if="building" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to List"
          color="neutral"
          variant="ghost"
          @click="router.back()"
          class="-ml-2.5 dark:text-gray-400 dark:hover:text-white"
        />
      </div>

      <div class="border-b border-gray-200 dark:border-gray-800 pb-8 flex justify-between items-end">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase">Building</span>
            <span class="text-gray-400 dark:text-gray-600">&middot;</span>
            <span class="text-gray-600 dark:text-gray-400 font-medium">{{ (building.properties as any)?.name }} ({{ building.property_code }})</span>
          </div>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{{ building.name }}</h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 mt-2">{{ building.street_address }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-8">
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-tight">Floors</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white">{{ building.floor_count }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-tight">Total Units</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white">{{ units?.length || 0 }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-tight">Floor Plans</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white">{{ unitTypesCount }}</p>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Units in Building</h3>
            <div class="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <GenericDataTable
                :data="units || []"
                :columns="columns"
                :loading="unitsStatus === 'pending'"
                row-key="id"
                striped
                clickable
                @row-click="handleUnitClick"
              >
                <template #cell-unit_name="{ value, row }">
                  <CellsLinkCell
                    :value="value"
                    :to="`/assets/units/${row.id}`"
                  />
                </template>
                <template #cell-tenancy_status="{ value }">
                  <UBadge v-if="value" size="sm" variant="subtle" :color="tenancyStatusColors[value] || 'neutral'">
                    {{ value }}
                  </UBadge>
                  <span v-else class="text-gray-400 dark:text-gray-600">-</span>
                </template>
              </GenericDataTable>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Building Description</h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{{ building.description || 'No description available for this building.' }}</p>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Building Photo Block -->
          <div v-if="imageUrl" class="bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div class="relative group cursor-zoom-in overflow-hidden rounded-2xl aspect-[4/3]" @click="showImageModal = true">
              <NuxtImg 
                :src="imageUrl" 
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                placeholder
              />
              <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <UIcon name="i-heroicons-magnifying-glass-plus" class="w-10 h-10 text-white" />
              </div>
            </div>
            <div class="mt-4">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-arrow-top-right-on-square"
                label="Open Full Image"
                block
                class="font-bold text-gray-600 dark:text-gray-400"
                @click="openInNewTab"
              />
            </div>
          </div>

          <div class="bg-primary-600 dark:bg-primary-700/80 rounded-3xl p-8 text-white shadow-xl shadow-primary-500/10">
            <h4 class="text-xs font-black uppercase tracking-widest opacity-70 mb-4 font-mono">Quick Insights</h4>
            <div class="space-y-4">
               <div class="flex justify-between items-center border-b border-white/10 pb-4">
                <span class="opacity-80">Property</span>
                <NuxtLink 
                  v-if="building.property_id"
                  :to="`/assets/properties/${building.property_id}`"
                  class="font-bold hover:underline"
                >
                  {{ building.property_code }}
                </NuxtLink>
                <span v-else class="font-bold">{{ building.property_code }}</span>
              </div>
              <div class="text-sm opacity-80 pt-4">
                <p class="mb-1 italic opacity-60">Building ID:</p>
                <p class="font-mono text-[10px] truncate opacity-80">{{ building.id }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusable Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="imageUrl"
      :alt="building?.name"
    />
  </div>
</template>
