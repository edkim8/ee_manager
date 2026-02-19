<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'
import ImageGalleryItem from '../../../../base/components/ImageGalleryItem.vue'
import AttachmentManager from '../../../../base/components/AttachmentManager.vue'
import type { TableColumn } from '../../../../table/types'
import { useImageActions } from '../../../../base/composables/useImageActions'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const unitId = route.params.id as string

const { isModalOpen: showImageModal, activeImage, openImageModal } = useImageActions()

// Fetch Unit Details
const { data: unit, status, error } = await useAsyncData(`unit-${unitId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('id', unitId)
    .single()

  if (error) throw error
  return data
})

// Fetch Lease History
const { data: leaseHistory, status: leaseHistoryStatus } = await useAsyncData(`unit-lease-history-${unitId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_leases')
    .select('*')
    .eq('unit_id', unitId)
    .order('start_date', { ascending: false })
  
  if (error) throw error
  return data
})

// Fetch Resident History
const { data: residentHistory, status: residentHistoryStatus } = await useAsyncData(`unit-resident-history-${unitId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_residents')
    .select('*')
    .eq('unit_id', unitId)
    .order('move_in_date', { ascending: false })
  
  if (error) throw error
  return data
})

// --- Pricing Engine Integration ---
import { usePricingEngine } from '../../../utils/pricing-engine'
const { getUnitPricingBreakdown } = usePricingEngine()
const { data: pricingBreakdown, status: pricingStatus } = await useAsyncData(`unit-pricing-${unitId}`, () => getUnitPricingBreakdown(unitId))

const leaseColumns: TableColumn[] = [
  {
    key: 'resident_name',
    label: 'Primary Resident',
    sortable: true,
    width: '200px'
  },
  {
    key: 'start_date',
    label: 'Start Date',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'end_date',
    label: 'End Date',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'lease_status',
    label: 'Status',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'rent_amount',
    label: 'Rent',
    sortable: true,
    width: '100px',
    align: 'right'
  }
]

const residentColumns: TableColumn[] = [
  {
    key: 'name',
    label: 'Resident',
    sortable: true,
    width: '200px'
  },
  {
    key: 'role',
    label: 'Role',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'tenancy_status',
    label: 'Tenancy',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'move_in_date',
    label: 'Move In',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '120px',
    align: 'center'
  }
]

const leaseStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Active': 'primary',
  'Pending': 'warning',
  'Notice': 'warning',
  'Closed': 'neutral',
  'Terminated': 'error',
  'Expired': 'neutral'
}

const tenancyStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning',
  'Applicant': 'neutral'
}

const roleColors: Record<string, string> = {
  'Primary': 'primary',
  'Roommate': 'neutral',
  'Occupant': 'neutral',
  'Guarantor': 'warning'
}

const handleLeaseClick = (row: any) => {
  if (row?.id) {
    router.push(`/office/leases/${row.id}`)
  }
}

const handleResidentClick = (row: any) => {
  if (row?.id) {
    router.push(`/office/residents/${row.id}`)
  }
}

const goBack = () => {
  router.push('/assets/units')
}

// Computed Image URL - Ensure absolute path from public directory
const imageUrl = computed(() => {
  const path = unit.value?.primary_image_url
  if (!path) return null
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})

const floorPlanImageUrl = computed(() => {
  const path = unit.value?.floor_plan_image_url
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
          <NuxtLink to="/assets/units" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Units</NuxtLink>
        </li>
        <li v-if="unit">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">Unit {{ unit.unit_name }}</span>
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
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading unit</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="goBack">Back to List</UButton>
    </div>

    <div v-else-if="unit" class="space-y-8">
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
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase">Unit</span>
            <span class="text-gray-400 dark:text-gray-600 font-mono">{{ unit.property_code }}</span>
          </div>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Unit {{ unit.unit_name }}</h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 mt-2">
            <NuxtLink 
              v-if="unit.building_id"
              :to="`/assets/buildings/${unit.building_id}`"
              class="hover:text-primary-600 dark:hover:text-primary-400 underline-offset-4 hover:underline transition-colors"
            >
              {{ unit.building_name }}
            </NuxtLink>
            <span v-else>{{ unit.building_name || '-' }}</span>
            &middot; Floor {{ unit.floor_number }}
          </p>

          <!-- Mobile-only Attachment Manager -->
          <div class="mt-8 md:hidden">
            <AttachmentManager 
              :record-id="unitId" 
              record-type="unit" 
              title="Photos & Files"
            />
          </div>
        </div>
        
        <div class="pb-2 flex gap-2">
          <UBadge v-if="unit.tenancy_status" size="lg" variant="outline" :color="tenancyStatusColors[unit.tenancy_status] || 'neutral'">
            Tenancy: {{ unit.tenancy_status }}
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-8">
          <ClientOnly>
            <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Details</h3>
              <div class="grid grid-cols-2 gap-y-6">
                <div>
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Floor Plan</p>
                  <p class="text-lg font-bold text-gray-900 dark:text-white">
                    <NuxtLink 
                      v-if="unit.floor_plan_id"
                      :to="`/assets/floor-plans/${unit.floor_plan_id}`"
                      class="text-primary-600 dark:text-primary-400 hover:text-primary-700 underline-offset-4 hover:underline transition-colors"
                    >
                      {{ unit.floor_plan_marketing_name }} ({{ unit.floor_plan_code }})
                    </NuxtLink>
                    <span v-else>{{ unit.floor_plan_marketing_name }} ({{ unit.floor_plan_code }})</span>
                  </p>
                </div>
                <div>
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Usage Type</p>
                  <p class="text-lg font-bold text-gray-900 dark:text-white uppercase">{{ unit.usage_type }}</p>
                </div>
                <div>
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Area (SF)</p>
                  <p class="text-lg text-gray-600 dark:text-gray-400">{{ unit.sf?.toLocaleString() || '-' }} sqft</p>
                </div>
                <div class="col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Description</p>
                  <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{{ unit.description || 'No description provided.' }}</p>
                </div>
              </div>
            </div>
          </ClientOnly>

          <!-- Lease History -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Lease History</h3>
            <ClientOnly>
              <GenericDataTable
                :data="leaseHistory || []"
                :columns="leaseColumns"
                :loading="leaseHistoryStatus === 'pending'"
                row-key="id"
                striped
                clickable
                @row-click="handleLeaseClick"
              >
                <template #cell-resident_name="{ value, row }">
                  <CellsLinkCell
                    v-if="row.resident_id"
                    :to="`/office/residents/${row.resident_id}`"
                    :value="value"
                  />
                  <span v-else class="text-gray-900 dark:text-gray-100">{{ value || '-' }}</span>
                </template>
                <template #cell-start_date="{ value }">
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ value ? new Date(value).toLocaleDateString() : '-' }}</span>
                </template>
                <template #cell-end_date="{ value }">
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ value ? new Date(value).toLocaleDateString() : '-' }}</span>
                </template>
                <template #cell-lease_status="{ value, row }">
                  <UBadge size="sm" variant="subtle" :color="row.is_active ? 'primary' : (leaseStatusColors[value] || 'neutral')">
                    {{ value }}
                  </UBadge>
                </template>
                <template #cell-rent_amount="{ value }">
                  <span class="font-bold text-primary-600 dark:text-primary-400">${{ value?.toLocaleString() || '0' }}</span>
                </template>
              </GenericDataTable>
            </ClientOnly>
          </div>

          <!-- Resident History -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Resident History</h3>
            <ClientOnly>
              <GenericDataTable
                :data="residentHistory || []"
                :columns="residentColumns"
                :loading="residentHistoryStatus === 'pending'"
                row-key="id"
                striped
                clickable
                @row-click="handleResidentClick"
              >
                <template #cell-name="{ value, row }">
                  <CellsLinkCell
                    :to="`/office/residents/${row.id}`"
                    :value="value"
                  />
                </template>
                <template #cell-role="{ value }">
                  <UBadge size="sm" variant="subtle" :color="roleColors[value] || 'neutral'">
                    {{ value }}
                  </UBadge>
                </template>
                <template #cell-tenancy_status="{ value }">
                  <UBadge size="sm" variant="subtle" :color="tenancyStatusColors[value] || 'neutral'">
                    {{ value }}
                  </UBadge>
                </template>
                <template #cell-move_in_date="{ value }">
                  <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ value ? new Date(value).toLocaleDateString() : '-' }}</span>
                </template>
                <template #cell-move_out_date="{ value }">
                  <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ value ? new Date(value).toLocaleDateString() : '-' }}</span>
                </template>
              </GenericDataTable>
            </ClientOnly>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Primary Unit Image -->
          <div v-if="imageUrl" class="relative">
            <ImageGalleryItem 
              :src="imageUrl" 
              :alt="unit.unit_name"
            />
          </div>

          <!-- Floor Plan Image -->
          <div class="bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm shadow-gray-200/50 dark:shadow-none">
            <h3 class="text-sm font-bold mb-4 px-2 text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-map" class="text-gray-400" />
              Floor Plan
            </h3>
            <div v-if="floorPlanImageUrl" class="relative">
              <ImageGalleryItem 
                :src="floorPlanImageUrl" 
                :alt="unit.floor_plan_marketing_name || unit.floor_plan_code"
                aspect-ratio="aspect-square p-4 bg-gray-50 dark:bg-gray-950 flex items-center justify-center rounded-2xl"
              />
            </div>
            <div v-else class="aspect-square bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <UIcon name="i-heroicons-photo" class="w-12 h-12 text-gray-300 mb-2" />
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Layout Asset</p>
            </div>
            
            <div class="mt-4 px-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
               <span>
                 {{ unit.sf?.toLocaleString() }} SF &middot; {{ unit.floor_plan_code }}
               </span>
            </div>
          </div>

          <!-- Unit Attachments (Photos & Files) - Desktop Sidebar -->
          <div class="hidden md:block bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm shadow-gray-200/50 dark:shadow-none">
            <AttachmentManager
              :record-id="unitId"
              record-type="unit"
              title="Unit Photos & Files"
            />
          </div>

          <!-- Unit Assets (Inventory) -->
          <ClientOnly>
            <InventoryLocationAssetsWidget
              location-type="unit"
              :location-id="unitId"
              title="Unit Assets"
            />
          </ClientOnly>

          <!-- Amenities Breakdown -->
          <div v-if="pricingBreakdown" class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">Amenities</h3>
            <ClientOnly>
              <AmenitiesAmenityPriceList
                :base-rent="pricingBreakdown.baseRent"
                :fixed-amenities="pricingBreakdown.fixedAmenities"
                :market-rent="pricingBreakdown.marketRent"
                :temp-amenities="[]"
                :offered-rent="pricingBreakdown.marketRent"
              />
            </ClientOnly>
          </div>
          
          <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h4>
            <div class="space-y-3">
              <UButton class="w-full dark:hover:bg-primary-900/30" variant="outline" label="Sync with Yardi" icon="i-heroicons-arrow-path" />
              <UButton class="w-full dark:hover:bg-primary-900/30" variant="outline" label="Manage Flags" icon="i-heroicons-flag" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusable Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="activeImage.src"
      :alt="activeImage.alt"
    />
  </div>
</template>
