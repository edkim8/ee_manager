<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'
import ImageGalleryItem from '../../../../base/components/ImageGalleryItem.vue'
import SimpleTabs from '../../../../base/components/SimpleTabs.vue'
import AttachmentManager from '../../../../base/components/AttachmentManager.vue'
import type { TableColumn } from '../../../../table/types'
import { useImageActions } from '../../../../base/composables/useImageActions'
import { usePricingEngine } from '../../../utils/pricing-engine'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const unitId = route.params.id as string

const { isModalOpen: showImageModal, activeImage, openImageModal } = useImageActions()
const { getUnitPricingBreakdown } = usePricingEngine()
const { fetchItemsByLocation, fetchLocationSummary } = useInventoryItems()
const { getHealthColor, getHealthLabel } = useInventoryLifecycle()

const activeTab = ref('overview')

const tabs = [
  { label: 'Overview',  value: 'overview'  },
  { label: 'Locations', value: 'locations' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Settings',  value: 'settings'  },
]

// ── Unit ──────────────────────────────────────────────────────────────────
const { data: unit, status, error, refresh: refreshUnit } = await useAsyncData(`unit-${unitId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('id', unitId)
    .single()
  if (error) throw error
  return data
})

// ── Lease history ─────────────────────────────────────────────────────────
const { data: leaseHistory, status: leaseHistoryStatus } = await useAsyncData(`unit-lease-history-${unitId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_leases')
    .select('*')
    .eq('unit_id', unitId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
})

// ── Resident history ──────────────────────────────────────────────────────
const { data: residentHistory, status: residentHistoryStatus } = await useAsyncData(`unit-resident-history-${unitId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_residents')
    .select('*')
    .eq('unit_id', unitId)
    .order('move_in_date', { ascending: false })
  if (error) throw error
  return data
})

// ── Pricing / amenities ───────────────────────────────────────────────────
const { data: pricingBreakdown } = await useAsyncData(`unit-pricing-${unitId}`, () => getUnitPricingBreakdown(unitId))

// ── Inventory ─────────────────────────────────────────────────────────────
const { data: inventoryItems } = await useAsyncData(`unit-inventory-${unitId}`, async () => {
  try { return await fetchItemsByLocation('unit', unitId) } catch { return [] }
})

const { data: inventorySummary } = await useAsyncData(`unit-inventory-summary-${unitId}`, async () => {
  try { return await fetchLocationSummary('unit', unitId) } catch { return null }
})

// ── Table columns ─────────────────────────────────────────────────────────
const leaseColumns: TableColumn[] = [
  { key: 'resident_name', label: 'Primary Resident', sortable: true, width: '200px' },
  { key: 'start_date',    label: 'Start Date',       sortable: true, width: '120px', align: 'center' },
  { key: 'end_date',      label: 'End Date',         sortable: true, width: '120px', align: 'center' },
  { key: 'lease_status',  label: 'Status',           sortable: true, width: '120px', align: 'center' },
  { key: 'rent_amount',   label: 'Rent',             sortable: true, width: '100px', align: 'right'  },
]

const residentColumns: TableColumn[] = [
  { key: 'name',           label: 'Resident', sortable: true, width: '200px' },
  { key: 'role',           label: 'Role',     sortable: true, width: '120px', align: 'center' },
  { key: 'tenancy_status', label: 'Tenancy',  sortable: true, width: '120px', align: 'center' },
  { key: 'move_in_date',   label: 'Move In',  sortable: true, width: '120px', align: 'center' },
  { key: 'move_out_date',  label: 'Move Out', sortable: true, width: '120px', align: 'center' },
]

const inventoryColumns: TableColumn[] = [
  { key: 'category_name', label: 'Category', sortable: true },
  { key: 'item',          label: 'Item',      sortable: false },
  { key: 'serial_number', label: 'Serial #',  sortable: false, width: '130px' },
  { key: 'install_date',  label: 'Installed', sortable: true,  width: '110px' },
  { key: 'age_years',     label: 'Age',       sortable: true,  width: '70px',  align: 'center' },
  { key: 'health_status', label: 'Health',    sortable: true,  width: '120px', align: 'center' },
  { key: 'status',        label: 'Status',    sortable: true,  width: '100px', align: 'center' },
]

// ── Color maps ────────────────────────────────────────────────────────────
const leaseStatusColors: Record<string, string> = {
  Current: 'primary', Active: 'primary', Pending: 'warning',
  Notice: 'warning', Closed: 'neutral', Terminated: 'error', Expired: 'neutral',
}

const tenancyStatusColors: Record<string, string> = {
  Current: 'primary', Past: 'error', Future: 'primary', Notice: 'warning', Applicant: 'neutral',
}

const roleColors: Record<string, string> = {
  Primary: 'primary', Roommate: 'neutral', Occupant: 'neutral', Guarantor: 'warning',
}

// ── Computed ──────────────────────────────────────────────────────────────
const imageUrl = computed(() => {
  const p = unit.value?.primary_image_url
  if (!p) return null
  return (!p.startsWith('/') && !p.startsWith('http')) ? `/${p}` : p
})

const floorPlanImageUrl = computed(() => {
  const p = unit.value?.floor_plan_image_url
  if (!p) return null
  return (!p.startsWith('/') && !p.startsWith('http')) ? `/${p}` : p
})

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Row click handlers ────────────────────────────────────────────────────
const handleLeaseClick    = (row: any) => { if (row?.id) router.push(`/office/leases/${row.id}`) }
const handleResidentClick = (row: any) => { if (row?.id) router.push(`/office/residents/${row.id}`) }

// ── Edit form (only locally-editable fields — rest are Yardi-managed) ─────
const form = ref({ description: '', primary_image_url: '' })

watch(unit, (u) => {
  if (!u) return
  form.value = {
    description:       u.description ?? '',
    primary_image_url: u.primary_image_url ?? '',
  }
}, { immediate: true })

const saving      = ref(false)
const saveError   = ref<string | null>(null)
const saveSuccess = ref(false)

const saveUnit = async () => {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false
  try {
    const { error: err } = await supabase
      .from('units')
      .update({
        description:       form.value.description || null,
        primary_image_url: form.value.primary_image_url || null,
      })
      .eq('id', unitId)
    if (err) throw err
    saveSuccess.value = true
    await refreshUnit()
  } catch (e: any) {
    saveError.value = e.message || 'Failed to save'
  } finally {
    saving.value = false
  }
}
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

    <!-- Loading skeleton -->
    <div v-if="status === 'pending'" class="p-12 space-y-8">
      <USkeleton class="h-12 w-1/3" />
      <div class="space-y-4">
        <USkeleton class="h-96 w-full rounded-3xl" />
        <div class="grid grid-cols-3 gap-4">
          <USkeleton class="h-40" /><USkeleton class="h-40" /><USkeleton class="h-40" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading unit</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="router.push('/assets/units')">Back to List</UButton>
    </div>

    <!-- Content -->
    <div v-else-if="unit" class="space-y-8">

      <!-- Back button -->
      <div>
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to List"
          color="neutral"
          variant="ghost"
          class="-ml-2.5 dark:text-gray-400 dark:hover:text-white"
          @click="router.back()"
        />
      </div>

      <!-- Unit Header -->
      <div class="border-b border-gray-200 dark:border-gray-800 pb-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase">Unit</span>
              <span class="text-gray-400 dark:text-gray-600 font-mono text-sm">{{ unit.property_code }}</span>
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
              <span v-else>{{ unit.building_name || '—' }}</span>
              <span class="text-gray-400 dark:text-gray-600"> · Floor {{ unit.floor_number }}</span>
            </p>
          </div>
          <!-- Tenancy status badge -->
          <UBadge
            v-if="unit.tenancy_status"
            size="lg"
            variant="outline"
            :color="tenancyStatusColors[unit.tenancy_status] || 'neutral'"
            class="flex-shrink-0 mt-1"
          >
            {{ unit.tenancy_status }}
          </UBadge>
        </div>

        <!-- Mobile AttachmentManager -->
        <div class="mt-8 md:hidden">
          <AttachmentManager :record-id="unitId" record-type="unit" title="Photos & Files" />
        </div>
      </div>

      <!-- Hero Photo -->
      <div v-if="imageUrl" class="relative">
        <ImageGalleryItem :src="imageUrl" :alt="`Unit ${unit.unit_name}`" aspect-ratio="h-[400px]" />
      </div>

      <!-- Tabs -->
      <SimpleTabs v-model="activeTab" :items="tabs">

        <!-- ── Overview ────────────────────────────────────────────── -->
        <template #overview>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">

            <!-- Left / main -->
            <div class="md:col-span-2 space-y-6">

              <!-- Stats row -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Bed / Bath</p>
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ unit.b_b || '—' }}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Area</p>
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ unit.sf?.toLocaleString() || '—' }}</p>
                  <p class="text-[10px] text-gray-400 mt-0.5">sq ft</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Floor</p>
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ unit.floor_number ?? '—' }}</p>
                </div>
              </div>

              <!-- Unit details card -->
              <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Unit Details</h3>
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
                      <span v-else>{{ unit.floor_plan_marketing_name || unit.floor_plan_code || '—' }}</span>
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Usage Type</p>
                    <p class="text-lg font-bold text-gray-900 dark:text-white uppercase">{{ unit.usage_type || '—' }}</p>
                  </div>
                  <div class="col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Description</p>
                    <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{{ unit.description || 'No description provided.' }}</p>
                  </div>
                </div>
              </div>

              <!-- Lease History -->
              <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Lease History</h3>
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
                    <CellsLinkCell v-if="row.resident_id" :to="`/office/residents/${row.resident_id}`" :value="value" />
                    <span v-else class="text-gray-900 dark:text-gray-100">{{ value || '—' }}</span>
                  </template>
                  <template #cell-start_date="{ value }">
                    <span class="text-sm text-gray-600 dark:text-gray-400">{{ fmtDate(value) }}</span>
                  </template>
                  <template #cell-end_date="{ value }">
                    <span class="text-sm text-gray-600 dark:text-gray-400">{{ fmtDate(value) }}</span>
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
              </div>

              <!-- Resident History -->
              <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Resident History</h3>
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
                    <CellsLinkCell :to="`/office/residents/${row.id}`" :value="value" />
                  </template>
                  <template #cell-role="{ value }">
                    <UBadge size="sm" variant="subtle" :color="roleColors[value] || 'neutral'">{{ value }}</UBadge>
                  </template>
                  <template #cell-tenancy_status="{ value }">
                    <UBadge size="sm" variant="subtle" :color="tenancyStatusColors[value] || 'neutral'">{{ value }}</UBadge>
                  </template>
                  <template #cell-move_in_date="{ value }">
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ fmtDate(value) }}</span>
                  </template>
                  <template #cell-move_out_date="{ value }">
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ fmtDate(value) }}</span>
                  </template>
                </GenericDataTable>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">

              <!-- Quick Insights (dark card) -->
              <div class="bg-gray-900 dark:bg-gray-800/80 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/10">
                <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-6 font-mono">Quick Insights</h4>
                <div class="space-y-4">
                  <div class="flex items-center justify-between border-b border-white/10 pb-4">
                    <span class="opacity-80 text-sm">Property</span>
                    <span class="font-bold text-sm font-mono">{{ unit.property_code }}</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-white/10 pb-4">
                    <span class="opacity-80 text-sm">Building</span>
                    <NuxtLink
                      v-if="unit.building_id"
                      :to="`/assets/buildings/${unit.building_id}`"
                      class="font-bold text-sm hover:underline"
                    >
                      {{ unit.building_name }}
                    </NuxtLink>
                    <span v-else class="font-bold text-sm">{{ unit.building_name || '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-white/10 pb-4">
                    <span class="opacity-80 text-sm">Floor Plan</span>
                    <NuxtLink
                      v-if="unit.floor_plan_id"
                      :to="`/assets/floor-plans/${unit.floor_plan_id}`"
                      class="font-bold text-sm hover:underline"
                    >
                      {{ unit.floor_plan_code }}
                    </NuxtLink>
                    <span v-else class="font-bold text-sm">{{ unit.floor_plan_code || '—' }}</span>
                  </div>
                  <div class="text-sm opacity-80 pt-2">
                    <p class="mb-1 italic opacity-60">Internal ID:</p>
                    <p class="font-mono text-[10px] truncate opacity-90">{{ unit.id }}</p>
                  </div>
                </div>
              </div>

              <!-- Floor plan image -->
              <div class="bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm shadow-gray-200/50 dark:shadow-none">
                <h3 class="text-sm font-bold mb-4 px-2 text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-heroicons-map" class="text-gray-400" />
                  Floor Plan
                </h3>
                <div v-if="floorPlanImageUrl">
                  <ImageGalleryItem
                    :src="floorPlanImageUrl"
                    :alt="unit.floor_plan_marketing_name || unit.floor_plan_code || 'Floor plan'"
                    aspect-ratio="aspect-square p-4 bg-gray-50 dark:bg-gray-950 flex items-center justify-center rounded-2xl"
                  />
                </div>
                <div v-else class="aspect-square bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                  <UIcon name="i-heroicons-photo" class="w-12 h-12 text-gray-300 mb-2" />
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Layout Asset</p>
                </div>
                <div class="mt-4 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                  {{ unit.sf?.toLocaleString() }} SF · {{ unit.floor_plan_code }}
                </div>
              </div>

              <!-- Attachments (desktop) -->
              <div class="hidden md:block bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm shadow-gray-200/50 dark:shadow-none">
                <AttachmentManager :record-id="unitId" record-type="unit" title="Unit Photos & Files" />
              </div>

              <!-- Amenities pricing -->
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

            </div>
          </div>
        </template>

        <!-- ── Locations ───────────────────────────────────────────── -->
        <template #locations>
          <AssetsLocationsTabPanel :property-code="unit.property_code" />
        </template>

        <!-- ── Inventory ───────────────────────────────────────────── -->
        <template #inventory>
          <div class="space-y-6">

            <!-- Health summary -->
            <div v-if="inventorySummary" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-center shadow-sm">
                <p class="text-3xl font-black text-emerald-600 dark:text-emerald-400">{{ inventorySummary.healthy_count }}</p>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Healthy</p>
              </div>
              <div class="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-center shadow-sm">
                <p class="text-3xl font-black text-yellow-600 dark:text-yellow-400">{{ inventorySummary.warning_count }}</p>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Monitor</p>
              </div>
              <div class="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-center shadow-sm">
                <p class="text-3xl font-black text-orange-600 dark:text-orange-400">{{ inventorySummary.critical_count }}</p>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Replace Soon</p>
              </div>
              <div class="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-center shadow-sm">
                <p class="text-3xl font-black text-red-600 dark:text-red-400">{{ inventorySummary.expired_count }}</p>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Overdue</p>
              </div>
            </div>

            <!-- Inventory table -->
            <div class="bg-white dark:bg-gray-900/80 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div class="flex items-center justify-between p-6 pb-0">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Unit Assets</h3>
                <NuxtLink to="/office/inventory/installations">
                  <UButton size="sm" variant="soft" color="primary" icon="i-heroicons-arrow-top-right-on-square">
                    Manage
                  </UButton>
                </NuxtLink>
              </div>

              <div v-if="!inventoryItems?.length" class="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-600">
                <UIcon name="i-heroicons-cube" class="w-12 h-12" />
                <p class="font-semibold text-sm">No assets tracked for this unit yet</p>
                <NuxtLink to="/office/inventory/installations">
                  <UButton size="sm" variant="ghost" icon="i-heroicons-plus">Add Asset</UButton>
                </NuxtLink>
              </div>

              <div v-else class="p-6 pt-4">
                <GenericDataTable
                  :data="inventoryItems || []"
                  :columns="inventoryColumns"
                  row-key="id"
                  striped
                >
                  <template #cell-item="{ row }">
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      {{ [row.brand, row.model].filter(Boolean).join(' ') || '—' }}
                    </span>
                  </template>
                  <template #cell-serial_number="{ value }">
                    <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ value || '—' }}</span>
                  </template>
                  <template #cell-install_date="{ value }">
                    <span class="text-sm text-gray-600 dark:text-gray-400">{{ fmtDate(value) }}</span>
                  </template>
                  <template #cell-age_years="{ value }">
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                      {{ value != null ? `${Number(value).toFixed(1)}y` : '—' }}
                    </span>
                  </template>
                  <template #cell-health_status="{ value }">
                    <UBadge v-if="value" size="sm" variant="subtle" :color="getHealthColor(value)">
                      {{ getHealthLabel(value) }}
                    </UBadge>
                  </template>
                  <template #cell-status="{ value }">
                    <UBadge
                      v-if="value"
                      size="sm"
                      variant="subtle"
                      :color="value === 'active' ? 'primary' : value === 'retired' ? 'neutral' : 'warning'"
                    >
                      {{ value }}
                    </UBadge>
                  </template>
                </GenericDataTable>
              </div>
            </div>

          </div>
        </template>

        <!-- ── Settings ────────────────────────────────────────────── -->
        <template #settings>
          <div class="max-w-2xl space-y-8">

            <div v-if="saveSuccess" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 flex-shrink-0" />
              Unit saved successfully.
            </div>
            <div v-if="saveError" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
              <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
              {{ saveError }}
            </div>

            <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Editable Fields</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                Unit name, floor, building, floor plan, and usage type are managed by Yardi and updated automatically on each sync.
              </p>

              <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <UTextarea v-model="form.description" :rows="5" placeholder="Internal notes or description for this unit" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Primary Image URL</label>
                <UInput v-model="form.primary_image_url" placeholder="unit-images/RS-301.jpg or https://..." />
                <p class="text-[10px] text-gray-400 mt-1">Path relative to /public or a full HTTPS URL. Shown as hero image on this page. Unit gallery photos are managed via the Photos & Files panel in the Overview sidebar.</p>
              </div>
            </section>

            <!-- Read-only reference -->
            <section class="bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-3">
              <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Yardi-Managed Fields (read-only)</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Unit Name</p>
                  <p class="font-mono font-bold text-gray-700 dark:text-gray-300">{{ unit.unit_name }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Floor</p>
                  <p class="font-bold text-gray-700 dark:text-gray-300">{{ unit.floor_number ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Usage Type</p>
                  <p class="font-bold text-gray-700 dark:text-gray-300 uppercase">{{ unit.usage_type || '—' }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Floor Plan</p>
                  <p class="font-bold text-gray-700 dark:text-gray-300">{{ unit.floor_plan_code || '—' }}</p>
                </div>
              </div>
            </section>

            <div class="flex items-center gap-3 pb-8">
              <UButton
                :loading="saving"
                :disabled="saving"
                color="primary"
                size="lg"
                icon="i-heroicons-check"
                label="Save Changes"
                class="rounded-xl font-bold px-8"
                @click="saveUnit"
              />
              <span v-if="saving" class="text-sm text-gray-400">Saving…</span>
            </div>

          </div>
        </template>

      </SimpleTabs>
    </div>

    <!-- Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="activeImage.src"
      :alt="activeImage.alt"
    />
  </div>
</template>
