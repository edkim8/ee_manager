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
const floorPlanId = route.params.id as string

const showImageModal = ref(false)

// Fetch Floor Plan Details
const { data: floorPlan, status, error } = await useAsyncData(`floor-plan-${floorPlanId}`, async () => {
  const { data, error } = await supabase
    .from('floor_plans')
    .select(`
      *,
      properties (
        id,
        name,
        code
      )
    `)
    .eq('id', floorPlanId)
    .single()

  if (error) throw error
  return data
})

// Fetch Units using this Floor Plan
const { data: units, status: unitsStatus } = await useAsyncData(`floor-plan-units-${floorPlanId}`, async () => {
  if (!floorPlan.value) return []
  
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('floor_plan_id', floorPlanId)
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
    key: 'building_name',
    label: 'Building',
    sortable: true
  },
  {
    key: 'floor_number',
    label: 'Floor',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'tenancy_status',
    label: 'Status',
    sortable: true,
    width: '120px',
    align: 'center'
  }
]

const tenancyStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning'
}

const handleUnitClick = (row: any) => {
  if (row?.id) {
    router.push(`/assets/units/${row.id}`)
  }
}

const goBack = () => {
  router.push('/assets/floor-plans')
}

// Computed Image URL
const imageUrl = computed(() => {
  const path = floorPlan.value?.primary_image_url
  if (!path) return null
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/assets/floor-plans" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Floor Plans
          </NuxtLink>
        </li>
        <li v-if="floorPlan">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">
              {{ floorPlan.code }}
            </span>
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
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading floor plan</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="goBack">Back to List</UButton>
    </div>

    <div v-else-if="floorPlan" class="space-y-8">
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

      <!-- Header Section -->
      <div class="border-b border-gray-200 dark:border-gray-800 pb-8">
        <div class="flex items-center gap-3 mb-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase">Floor Plan</span>
          <span class="text-gray-400 dark:text-gray-600 font-mono">{{ floorPlan.code }}</span>
        </div>
        <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{{ floorPlan.marketing_name || floorPlan.code }}</h1>
        <p class="text-xl text-gray-600 dark:text-gray-400 mt-2">{{ floorPlan.bedroom_count }} Bed / {{ floorPlan.bathroom_count }} Bath &middot; {{ floorPlan.area_sqft }} sqft</p>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Details -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Quick Stats Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-tight">Bedrooms</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white">{{ floorPlan.bedroom_count }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-tight">Bathrooms</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white">{{ floorPlan.bathroom_count }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-tight">Area</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white">{{ floorPlan.area_sqft }}<span class="text-[10px] font-normal text-gray-400 ml-1">sf</span></p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-tight">Market Rent</p>
              <p class="text-2xl font-black text-primary-600 dark:text-primary-400">
                ${{ floorPlan.market_base_rent?.toLocaleString() }}
              </p>
            </div>
          </div>

          <!-- Units using this Floor Plan -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">
              <span class="text-primary-500 font-black mr-2">{{ units?.length || 0 }}</span> 
              Units are using this Floor Plan
            </h3>
            <div class="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
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

          <!-- Description -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Plan Description</h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ floorPlan.description || 'No detailed description available for this floor plan layout.' }}
            </p>
          </div>
        </div>

        <!-- Right Column: Sidebar & Image -->
        <div class="space-y-6">
          <!-- Floor Plan Image -->
          <div class="bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm shadow-gray-200/50 dark:shadow-none">
            <div 
              v-if="imageUrl" 
              class="relative group cursor-zoom-in overflow-hidden rounded-2xl aspect-square bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4" 
              @click="showImageModal = true"
            >
              <NuxtImg 
                :src="imageUrl" 
                class="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-xl" 
                placeholder
              />
              <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <UIcon name="i-heroicons-magnifying-glass-plus" class="w-10 h-10 text-white" />
              </div>
            </div>
            <div v-else class="aspect-square bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <UIcon name="i-heroicons-photo" class="w-12 h-12 text-gray-400 mb-2" />
              <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">No Image</p>
            </div>
            
            <div class="mt-4 px-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
               <span>Layout Asset</span>
               <UButton
                v-if="imageUrl"
                color="neutral"
                variant="link"
                icon="i-heroicons-arrow-top-right-on-square"
                label="Full Res"
                size="2xs"
                :to="imageUrl"
                target="_blank"
                class="font-black"
              />
            </div>
          </div>

          <!-- Quick Insights Sidebar -->
          <div class="bg-gray-900 dark:bg-gray-800/80 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/10">
            <h4 class="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-6 font-mono">Quick Insights</h4>
            <div class="space-y-4">
              <div class="flex justify-between items-center border-b border-white/10 pb-4">
                <span class="opacity-80 text-sm">Property</span>
                <NuxtLink 
                  v-if="floorPlan.property_id"
                  :to="`/assets/properties/${floorPlan.property_id}`"
                  class="font-bold hover:underline"
                >
                  {{ floorPlan.property_code }}
                </NuxtLink>
                <span v-else class="font-bold">{{ floorPlan.property_code }}</span>
              </div>
              <div class="flex justify-between items-center border-b border-white/10 pb-4">
                <span class="opacity-80 text-sm">Yardi Code</span>
                <span class="font-mono font-bold">{{ floorPlan.yardi_layout_code || 'N/A' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="opacity-80 text-sm">Created</span>
                <span class="font-bold">{{ new Date(floorPlan.created_at).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>

          <!-- Debug Info -->
          <div class="p-6 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p class="text-[10px] font-mono text-gray-400 dark:text-gray-600 break-all">
              Internal ID: {{ floorPlan.id }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusable Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="imageUrl"
      :alt="floorPlan?.marketing_name"
    />
  </div>
</template>
