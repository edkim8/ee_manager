<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import type { TableColumn } from '../../../../table/types'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'
import ImageGalleryItem from '../../../../base/components/ImageGalleryItem.vue'
import SimpleTabs from '../../../../base/components/SimpleTabs.vue'
import AttachmentManager from '../../../../base/components/AttachmentManager.vue'
import { useImageActions } from '../../../../base/composables/useImageActions'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const buildingId = route.params.id as string

const { isModalOpen: showImageModal, activeImage, openImageModal } = useImageActions()
const { fetchItemsByLocation, fetchLocationSummary } = useInventoryItems()
const { getHealthColor, getHealthLabel } = useInventoryLifecycle()

const activeTab = ref('overview')

const tabs = [
  { label: 'Overview',  value: 'overview'   },
  { label: 'Locations', value: 'locations'  },
  { label: 'Inventory', value: 'inventory'  },
  { label: 'Settings',  value: 'settings'   },
]

// ── Building ──────────────────────────────────────────────────────────────
const { data: building, status, error, refresh: refreshBuilding } = await useAsyncData(`building-${buildingId}`, async () => {
  const { data, error } = await supabase
    .from('buildings')
    .select(`*, properties ( name, code )`)
    .eq('id', buildingId)
    .single()
  if (error) throw error
  return data
})

// ── Units ─────────────────────────────────────────────────────────────────
const { data: units, status: unitsStatus } = await useAsyncData(`building-units-${buildingId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('building_id', buildingId)
    .order('unit_name')
  if (error) throw error
  return data
})

// ── Inventory ─────────────────────────────────────────────────────────────
const { data: inventoryItems } = await useAsyncData(
  `building-inventory-${buildingId}`,
  async () => {
    try {
      return await fetchItemsByLocation('building', buildingId)
    } catch {
      return []
    }
  }
)

const { data: inventorySummary } = await useAsyncData(
  `building-inventory-summary-${buildingId}`,
  async () => {
    try {
      return await fetchLocationSummary('building', buildingId)
    } catch {
      return null
    }
  }
)

// ── Units table columns ───────────────────────────────────────────────────
const unitColumns: TableColumn[] = [
  { key: 'unit_name',      label: 'Unit',       sortable: true, width: '100px' },
  { key: 'floor_number',   label: 'Floor',      sortable: true, width: '80px',  align: 'center' },
  { key: 'floor_plan_code', label: 'Floor Plan', sortable: true, width: '120px' },
  { key: 'tenancy_status', label: 'Status',     sortable: true, width: '120px', align: 'center' },
  { key: 'resident_name',  label: 'Resident',   sortable: true },
]

const tenancyStatusColors: Record<string, string> = {
  Current: 'primary', Past: 'error', Future: 'primary', Notice: 'warning',
}

// ── Inventory table columns ───────────────────────────────────────────────
const inventoryColumns: TableColumn[] = [
  { key: 'category_name', label: 'Category',  sortable: true },
  { key: 'item',          label: 'Item',       sortable: false },
  { key: 'serial_number', label: 'Serial #',   sortable: false, width: '130px' },
  { key: 'install_date',  label: 'Installed',  sortable: true,  width: '110px' },
  { key: 'age_years',     label: 'Age',        sortable: true,  width: '70px', align: 'center' },
  { key: 'health_status', label: 'Health',     sortable: true,  width: '120px', align: 'center' },
  { key: 'status',        label: 'Status',     sortable: true,  width: '100px', align: 'center' },
]

// ── Misc computed ─────────────────────────────────────────────────────────
const unitTypesCount = computed(() => {
  if (!units.value) return 0
  return new Set(units.value.map((u: any) => u.floor_plan_code).filter(Boolean)).size
})

const imageUrl = computed(() => {
  const path = building.value?.primary_image_url
  if (!path) return null
  return (!path.startsWith('/') && !path.startsWith('http')) ? `/${path}` : path
})

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const handleUnitClick = (row: any) => {
  if (row?.id) router.push(`/assets/units/${row.id}`)
}

// ── Edit form ─────────────────────────────────────────────────────────────
const form = ref({
  name:              '',
  description:       '',
  street_address:    '',
  floor_count:       null as number | null,
  primary_image_url: '',
})

watch(building, (b) => {
  if (!b) return
  form.value = {
    name:              b.name ?? '',
    description:       b.description ?? '',
    street_address:    b.street_address ?? '',
    floor_count:       b.floor_count ?? null,
    primary_image_url: b.primary_image_url ?? '',
  }
}, { immediate: true })

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

const saveBuilding = async () => {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false
  try {
    const { error: err } = await supabase
      .from('buildings')
      .update({
        name:              form.value.name,
        description:       form.value.description || null,
        street_address:    form.value.street_address || null,
        floor_count:       form.value.floor_count ?? 0,
        primary_image_url: form.value.primary_image_url || null,
      })
      .eq('id', buildingId)
    if (err) throw err
    saveSuccess.value = true
    await refreshBuilding()
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
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading building</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="router.push('/assets/buildings')">Back to List</UButton>
    </div>

    <!-- Content -->
    <div v-else-if="building" class="space-y-8">

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

      <!-- Building Header -->
      <div class="border-b border-gray-200 dark:border-gray-800 pb-8">
        <div class="flex items-center gap-3 mb-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase">Building</span>
          <NuxtLink
            v-if="building.property_id"
            :to="`/assets/properties/${building.property_id}`"
            class="text-gray-400 dark:text-gray-600 font-mono text-sm hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {{ building.property_code }}
          </NuxtLink>
        </div>
        <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{{ building.name }}</h1>
        <p v-if="building.street_address" class="text-xl text-gray-600 dark:text-gray-400 mt-2">{{ building.street_address }}</p>

        <!-- Mobile AttachmentManager -->
        <div class="mt-8 md:hidden">
          <AttachmentManager :record-id="buildingId" record-type="building" title="Photos & Files" />
        </div>
      </div>

      <!-- Hero Photo -->
      <div v-if="imageUrl" class="relative">
        <ImageGalleryItem :src="imageUrl" :alt="building.name" aspect-ratio="h-[400px]" />
      </div>

      <!-- Tabs -->
      <SimpleTabs v-model="activeTab" :items="tabs">

        <!-- ── Overview ────────────────────────────────────────────── -->
        <template #overview>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">

            <div class="md:col-span-2 space-y-6">
              <!-- Stats row -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Floors</p>
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ building.floor_count }}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Total Units</p>
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ units?.length || 0 }}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                  <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Floor Plans</p>
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ unitTypesCount }}</p>
                </div>
              </div>

              <!-- Units table -->
              <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">Units in Building</h3>
                <div class="max-h-[600px] overflow-y-auto pr-2">
                  <GenericDataTable
                    :data="units || []"
                    :columns="unitColumns"
                    :loading="unitsStatus === 'pending'"
                    row-key="id"
                    striped
                    clickable
                    @row-click="handleUnitClick"
                  >
                    <template #cell-unit_name="{ value, row }">
                      <CellsLinkCell :value="value" :to="`/assets/units/${row.id}`" />
                    </template>
                    <template #cell-tenancy_status="{ value }">
                      <UBadge v-if="value" size="sm" variant="subtle" :color="tenancyStatusColors[value] || 'neutral'">
                        {{ value }}
                      </UBadge>
                      <span v-else class="text-gray-400 dark:text-gray-600">—</span>
                    </template>
                  </GenericDataTable>
                </div>
              </div>

              <!-- Description -->
              <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white tracking-tight">About Building</h3>
                <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{{ building.description || 'No description available for this building.' }}</p>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
              <div class="bg-gray-900 dark:bg-gray-800/80 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/10">
                <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-6 font-mono">Quick Insights</h4>
                <div class="space-y-4">
                  <div class="flex items-center justify-between border-b border-white/10 pb-4">
                    <span class="opacity-80 text-sm">Property</span>
                    <NuxtLink
                      v-if="building.property_id"
                      :to="`/assets/properties/${building.property_id}`"
                      class="font-bold text-sm hover:underline"
                    >
                      {{ building.property_code }}
                    </NuxtLink>
                    <span v-else class="font-bold text-sm">{{ building.property_code }}</span>
                  </div>
                  <div class="flex items-center justify-between border-b border-white/10 pb-4">
                    <span class="opacity-80 text-sm">Floors</span>
                    <span class="font-bold text-sm">{{ building.floor_count }}</span>
                  </div>
                  <div class="text-sm opacity-80 pt-2">
                    <p class="mb-1 italic opacity-60">Internal ID:</p>
                    <p class="font-mono text-[10px] truncate opacity-90">{{ building.id }}</p>
                  </div>
                </div>
              </div>

              <div class="hidden md:block bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm shadow-gray-200/50 dark:shadow-none">
                <AttachmentManager :record-id="buildingId" record-type="building" title="Building Photos & Files" />
              </div>
            </div>
          </div>
        </template>

        <!-- ── Locations ───────────────────────────────────────────── -->
        <template #locations>
          <AssetsLocationsTabPanel :property-code="building.property_code" />
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
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Building Assets</h3>
                <NuxtLink to="/office/inventory/installations">
                  <UButton size="sm" variant="soft" color="primary" icon="i-heroicons-arrow-top-right-on-square">
                    Manage
                  </UButton>
                </NuxtLink>
              </div>

              <!-- Empty state -->
              <div v-if="!inventoryItems?.length" class="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-600">
                <UIcon name="i-heroicons-cube" class="w-12 h-12" />
                <p class="font-semibold text-sm">No assets tracked for this building yet</p>
                <NuxtLink to="/office/inventory/installations">
                  <UButton size="sm" variant="ghost" icon="i-heroicons-plus">Add Asset</UButton>
                </NuxtLink>
              </div>

              <!-- Table -->
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
              Building saved successfully.
            </div>
            <div v-if="saveError" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
              <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
              {{ saveError }}
            </div>

            <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Building Info</h3>

              <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Name</label>
                <UInput v-model="form.name" placeholder="Building name" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <UTextarea v-model="form.description" :rows="4" placeholder="Short building description" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Floor Count</label>
                <UInput v-model.number="form.floor_count" type="number" placeholder="e.g. 4" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Primary Image URL</label>
                <UInput v-model="form.primary_image_url" placeholder="building-images/RS-A.jpg or https://..." />
                <p class="text-[10px] text-gray-400 mt-1">Path relative to /public or a full HTTPS URL.</p>
              </div>
            </section>

            <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Address</h3>
              <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Street Address</label>
                <UInput v-model="form.street_address" placeholder="1234 Main St" />
              </div>
              <p class="text-[10px] text-gray-400">Building address if different from the property address.</p>
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
                @click="saveBuilding"
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
