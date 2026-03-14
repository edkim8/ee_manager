<script setup lang="ts">
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { useSupabaseClient } from '#imports'
import LocationSelector from '../../../../base/components/LocationSelector.vue'

// Lazy-loaded only when user taps Scan — keeps @zxing/browser out of the initial chunk
const BarcodeScanner = defineAsyncComponent(
  () => import('../../../../base/components/BarcodeScanner.client.vue')
)

definePageMeta({ layout: 'dashboard' })

// ── Composables ───────────────────────────────────────────────────────────────
const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()
const {
  fetchInstallations, createInstallation, updateInstallation, deleteInstallation,
  findByAssetTag, fetchInstallationWithDetails,
} = useInventoryInstallations()
const { fetchItemDefinitions } = useInventoryItemDefinitions()
const { fetchUnits, fetchBuildings } = useLocationSelector()

// ── View Stack ────────────────────────────────────────────────────────────────
type ViewName =
  | 'hub' | 'add'
  | 'scan'
  | 'unit-list' | 'building-list'
  | 'location-categories' | 'location-list'
  | 'installation-list' | 'installation-detail'

interface StackFrame { view: ViewName; data: Record<string, any> }

const stack   = ref<StackFrame[]>([{ view: 'hub', data: {} }])
const current = computed(() => stack.value[stack.value.length - 1])
const canBack = computed(() => stack.value.length > 1)

const push = (view: ViewName, data: Record<string, any> = {}) => {
  stack.value = [...stack.value, { view, data }]
}
const pop = () => {
  if (stack.value.length > 1) stack.value = stack.value.slice(0, -1)
}
const goHub = () => {
  stopCamera()
  stack.value = [{ view: 'hub', data: {} }]
}

const viewTitle = computed(() => {
  const { view, data } = current.value
  const map: Record<string, string> = {
    hub: 'Inventory', add: 'Installation', scan: 'Scan Asset Tag',
    'unit-list': 'Units', 'building-list': 'Buildings',
    'location-categories': 'Location Type',
    'installation-detail': 'Details',
  }
  if (view === 'location-list')     return (data.category as string)  ?? 'Locations'
  if (view === 'installation-list') return (data.contextName as string) ?? 'Installations'
  return map[view] ?? 'Inventory'
})

// ── Background Data ───────────────────────────────────────────────────────────
const pageLoading     = ref(false)
const units           = ref<Array<{ id: string; name: string }>>([])
const buildings       = ref<Array<{ id: string; name: string }>>([])
const locations       = ref<Array<{ id: string; name: string; location_type: string }>>([])
const itemDefinitions = ref<any[]>([])

onMounted(async () => {
  if (!activeProperty.value) return
  pageLoading.value = true
  try {
    const [u, b, items, { data: locs }] = await Promise.all([
      fetchUnits(activeProperty.value),
      fetchBuildings(activeProperty.value),
      fetchItemDefinitions({ propertyCode: activeProperty.value }),
      supabase
        .from('locations')
        .select('id, description, location_type')
        .eq('property_code', activeProperty.value)
        .order('description'),
    ])
    units.value     = u
    buildings.value = b
    itemDefinitions.value = items
    locations.value = (locs ?? []).map(l => ({
      id:            l.id,
      name:          l.description ?? `Location ${l.id.slice(0, 8)}`,
      location_type: l.location_type ?? 'General / Other',
    }))
  } finally {
    pageLoading.value = false
  }
})

// ── Location categories ───────────────────────────────────────────────────────
const locationCategories = computed(() => {
  const types = new Set(locations.value.map(l => l.location_type))
  return [...types].sort()
})
const locationsInCategory = (cat: string) =>
  locations.value.filter(l => l.location_type === cat)

// ── List search ───────────────────────────────────────────────────────────────
const listSearch     = ref('')
const filteredUnits  = computed(() =>
  listSearch.value
    ? units.value.filter(u => u.name.toLowerCase().includes(listSearch.value.toLowerCase()))
    : units.value
)
const filteredBuildings = computed(() =>
  listSearch.value
    ? buildings.value.filter(b => b.name.toLowerCase().includes(listSearch.value.toLowerCase()))
    : buildings.value
)

// ── Installation list (lazy loaded per context) ───────────────────────────────
const instLoading          = ref(false)
const contextInstallations = ref<any[]>([])

const enterInstallationList = async (
  locationType: string, locationId: string,
  contextName: string, contextLinkTo = ''
) => {
  push('installation-list', { locationType, locationId, contextName, contextLinkTo })
  instLoading.value = true
  try {
    contextInstallations.value = await fetchInstallations({
      propertyCode: activeProperty.value,
      locationType,
      locationId,
    })
  } finally {
    instLoading.value = false
  }
}

// ── Scanner ───────────────────────────────────────────────────────────────────
const scanError      = ref<string | null>(null)
const scanLoading    = ref(false)
const manualTagInput = ref('')

const resolveTag = async (tag: string) => {
  if (!tag.trim()) return
  scanLoading.value = true
  scanError.value   = null
  try {
    const inst = await findByAssetTag(activeProperty.value!, tag.trim())
    if (inst) {
      push('installation-detail', { installation: inst })
    } else {
      scanError.value = `No record found for "${tag.trim()}". Try again or enter manually.`
    }
  } catch (err: any) {
    scanError.value = err.message
  } finally {
    scanLoading.value = false
  }
}

watch(
  () => current.value.view,
  (v) => {
    if (v === 'scan') {
      listSearch.value     = ''
      manualTagInput.value = ''
      scanError.value      = null
    }
  }
)

// ── Add / Edit form ───────────────────────────────────────────────────────────
const formLoading        = ref(false)
const formError          = ref<string | null>(null)
const editingId          = ref<string | null>(null)
const itemPickerCategory = ref('')

const blankForm = () => ({
  item_definition_id:  '',
  serial_number:       '',
  asset_tag:           '',
  quantity:            1,
  install_date:        new Date().toISOString().split('T')[0],
  warranty_expiration: '',
  purchase_price:      null as number | null,
  supplier:            '',
  location_type:       'unit',
  location_id:         '',
  status:              'active',
  condition:           'excellent',
  notes:               '',
})

const form = ref(blankForm())

const itemCategoryOpts = computed(() => {
  const s = new Set(itemDefinitions.value.map((i: any) => i.category_name).filter(Boolean))
  return [...s].sort() as string[]
})

const filteredItemOpts = computed(() => {
  const list = itemPickerCategory.value
    ? itemDefinitions.value.filter((i: any) => i.category_name === itemPickerCategory.value)
    : itemDefinitions.value
  return list.map((i: any) => ({
    id:   i.id,
    name: [i.brand, i.name].filter(Boolean).join(' ') || i.category_name,
  }))
})

const formLocationOpts = computed(() => {
  if (form.value.location_type === 'unit')        return units.value
  if (form.value.location_type === 'building')    return buildings.value
  if (form.value.location_type === 'common_area') return locations.value
  return []
})

const openAdd = () => {
  editingId.value          = null
  form.value               = blankForm()
  itemPickerCategory.value = ''
  push('add')
}

const openEdit = (inst: any) => {
  editingId.value = inst.id
  form.value = {
    item_definition_id:  inst.item_definition_id,
    serial_number:       inst.serial_number       ?? '',
    asset_tag:           inst.asset_tag           ?? '',
    quantity:            inst.quantity             ?? 1,
    install_date:        inst.install_date         ?? '',
    warranty_expiration: inst.warranty_expiration  ?? '',
    purchase_price:      inst.purchase_price       ?? null,
    supplier:            inst.supplier             ?? '',
    location_type:       inst.location_type        ?? 'unit',
    location_id:         inst.location_id          ?? '',
    status:              inst.status,
    condition:           inst.condition            ?? 'excellent',
    notes:               inst.notes               ?? '',
  }
  itemPickerCategory.value = ''
  push('add', { editing: true })
}

const saveForm = async () => {
  formLoading.value = true
  formError.value   = null
  try {
    const payload = {
      ...form.value,
      install_date:        form.value.install_date        || null,
      warranty_expiration: form.value.warranty_expiration || null,
      purchase_price:      form.value.purchase_price ? Number(form.value.purchase_price) : null,
    }
    if (editingId.value) {
      await updateInstallation(editingId.value, payload)
      pop() // back to installation-detail
      // Refresh detail data in the now-top frame
      const fresh = await fetchInstallationWithDetails(editingId.value)
      const topIdx = stack.value.length - 1
      if (stack.value[topIdx]?.view === 'installation-detail') {
        stack.value[topIdx] = {
          ...stack.value[topIdx],
          data: { ...stack.value[topIdx].data, installation: fresh },
        }
      }
    } else {
      await createInstallation({ ...payload, property_code: activeProperty.value! })
      pop()
    }
  } catch (err: any) {
    formError.value = err.message
  } finally {
    formLoading.value = false
  }
}

// ── Transfer action ───────────────────────────────────────────────────────────
const showTransfer    = ref(false)
const transferInstId  = ref<string | null>(null)
const transferForm    = ref({ location_type: 'unit', location_id: '' })
const transferLoading = ref(false)
const transferError   = ref<string | null>(null)

const transferLocOpts = computed(() => {
  if (transferForm.value.location_type === 'unit')        return units.value
  if (transferForm.value.location_type === 'building')    return buildings.value
  if (transferForm.value.location_type === 'common_area') return locations.value
  return []
})

const openTransfer = (inst: any) => {
  transferInstId.value = inst.id
  transferForm.value   = { location_type: inst.location_type ?? 'unit', location_id: '' }
  transferError.value  = null
  showTransfer.value   = true
}

const executeTransfer = async () => {
  if (!transferInstId.value || !transferForm.value.location_id) return
  transferLoading.value = true
  transferError.value   = null
  try {
    await updateInstallation(transferInstId.value, {
      location_type: transferForm.value.location_type,
      location_id:   transferForm.value.location_id,
    })
    // Refresh detail
    const fresh = await fetchInstallationWithDetails(transferInstId.value)
    const topIdx = stack.value.length - 1
    if (stack.value[topIdx]?.view === 'installation-detail') {
      stack.value[topIdx] = {
        ...stack.value[topIdx],
        data: { ...stack.value[topIdx].data, installation: fresh },
      }
    }
    showTransfer.value = false
  } catch (err: any) {
    transferError.value = err.message
  } finally {
    transferLoading.value = false
  }
}

// ── Delete action ─────────────────────────────────────────────────────────────
const showDelete    = ref(false)
const deleteInstId  = ref<string | null>(null)
const deleteLoading = ref(false)
const deleteError   = ref<string | null>(null)

const openDelete = (inst: any) => {
  deleteInstId.value = inst.id
  deleteError.value  = null
  showDelete.value   = true
}

const executeDelete = async () => {
  if (!deleteInstId.value) return
  deleteLoading.value = true
  deleteError.value   = null
  try {
    await deleteInstallation(deleteInstId.value)
    showDelete.value = false
    // Remove from context list if visible below
    contextInstallations.value = contextInstallations.value.filter(i => i.id !== deleteInstId.value)
    pop() // off detail
  } catch (err: any) {
    deleteError.value = err.message
  } finally {
    deleteLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const healthCls = (s: string) => ({
  healthy:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  warning:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  critical: 'bg-orange-100 text-orange-800',
  expired:  'bg-red-100 text-red-800',
}[s] ?? 'bg-gray-100 text-gray-700')

const statusCls = (s: string) => ({
  active:      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  maintenance: 'bg-yellow-100 text-yellow-800',
  retired:     'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  disposed:    'bg-red-100 text-red-800',
}[s] ?? 'bg-blue-100 text-blue-800')

const fmt = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? ''
</script>

<template>
  <div class="flex flex-col bg-gray-50 dark:bg-gray-950" style="min-height: calc(100vh - 64px)">

    <!-- ── Top Bar ─────────────────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 flex items-center gap-2 px-3 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <!-- Back button -->
      <button
        v-if="canBack"
        class="p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200"
        @click="pop"
        aria-label="Back"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <!-- Back to desktop list when at hub -->
      <NuxtLink
        v-else
        to="/office/inventory/installations"
        class="p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Back to Installations"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </NuxtLink>

      <h1 class="flex-1 text-lg font-bold text-gray-900 dark:text-white truncate">{{ viewTitle }}</h1>

      <!-- Home icon (always visible when not on hub) -->
      <button
        v-if="canBack"
        class="p-2 -mr-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Back to Hub"
        @click="goHub"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
    </div>

    <!-- Page loading -->
    <div v-if="pageLoading" class="flex-1 flex items-center justify-center">
      <div class="w-9 h-9 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- HUB                                                                -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-if="current.view === 'hub'">
        <div class="flex-1 p-5 grid grid-cols-2 gap-4 content-start">

          <!-- Add -->
          <button
            class="flex flex-col items-center justify-center gap-3 rounded-2xl p-7 bg-blue-600 text-white shadow-md active:scale-95 transition-transform"
            @click="openAdd"
          >
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="text-lg font-bold">Add</span>
          </button>

          <!-- Scan -->
          <button
            class="flex flex-col items-center justify-center gap-3 rounded-2xl p-7 bg-purple-600 text-white shadow-md active:scale-95 transition-transform"
            @click="push('scan')"
          >
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span class="text-lg font-bold">Scan</span>
          </button>

          <!-- Unit -->
          <button
            class="flex flex-col items-center justify-center gap-3 rounded-2xl p-7 bg-green-600 text-white shadow-md active:scale-95 transition-transform"
            @click="push('unit-list'); listSearch = ''"
          >
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="text-lg font-bold">Unit</span>
          </button>

          <!-- Building -->
          <button
            class="flex flex-col items-center justify-center gap-3 rounded-2xl p-7 bg-orange-500 text-white shadow-md active:scale-95 transition-transform"
            @click="push('building-list'); listSearch = ''"
          >
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span class="text-lg font-bold">Building</span>
          </button>

          <!-- Locations (full width) -->
          <button
            class="col-span-2 flex items-center justify-center gap-4 rounded-2xl p-6 bg-teal-600 text-white shadow-md active:scale-95 transition-transform"
            @click="push('location-categories')"
          >
            <svg class="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-xl font-bold">Locations</span>
          </button>

        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- SCAN                                                               -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'scan'">
        <div class="flex-1 flex flex-col">

          <!-- Camera viewfinder — BarcodeScanner lazy-loaded on first Scan tap -->
          <div class="relative bg-black w-full" style="aspect-ratio: 4/3; max-height: 60vh;">
            <BarcodeScanner
              @scanned="resolveTag"
              @error="(msg) => { scanError = msg }"
            />
            <!-- Look-up spinner overlay -->
            <div v-if="scanLoading" class="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
              <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          </div>

          <!-- Error message -->
          <div class="px-5 pt-4">
            <p v-if="scanError" class="text-sm text-red-600 dark:text-red-400 text-center mb-3 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
              {{ scanError }}
            </p>
          </div>

          <!-- Manual entry fallback -->
          <div class="px-5 pb-6 space-y-2">
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Manual Entry</p>
            <div class="flex gap-2">
              <input
                v-model="manualTagInput"
                type="text"
                placeholder="e.g. SB-000042"
                class="flex-1 px-4 py-3 text-base border-2 rounded-xl dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:border-primary-500"
                @keyup.enter="resolveTag(manualTagInput)"
              />
              <button
                :disabled="!manualTagInput.trim() || scanLoading"
                class="px-5 py-3 bg-primary-600 text-white rounded-xl font-semibold disabled:opacity-40 active:scale-95 transition-transform whitespace-nowrap"
                @click="resolveTag(manualTagInput)"
              >
                Look Up
              </button>
            </div>
          </div>

        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- UNIT LIST                                                          -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'unit-list'">
        <div class="flex-1 flex flex-col">
          <div class="px-4 pt-4 pb-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <input
              v-model="listSearch"
              type="search"
              placeholder="Search units…"
              class="w-full px-4 py-3 border-2 rounded-xl dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:border-primary-500"
            />
          </div>
          <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            <button
              v-for="unit in filteredUnits"
              :key="unit.id"
              class="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-left active:bg-gray-100"
              @click="enterInstallationList('unit', unit.id, unit.name, `/assets/units/${unit.id}`)"
            >
              <span class="font-semibold text-gray-900 dark:text-white">{{ unit.name }}</span>
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <p v-if="filteredUnits.length === 0" class="p-8 text-center text-gray-400">No units found</p>
          </div>
        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- BUILDING LIST                                                      -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'building-list'">
        <div class="flex-1 flex flex-col">
          <div class="px-4 pt-4 pb-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <input
              v-model="listSearch"
              type="search"
              placeholder="Search buildings…"
              class="w-full px-4 py-3 border-2 rounded-xl dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:border-primary-500"
            />
          </div>
          <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            <button
              v-for="bldg in filteredBuildings"
              :key="bldg.id"
              class="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-left active:bg-gray-100"
              @click="enterInstallationList('building', bldg.id, bldg.name, `/assets/buildings/${bldg.id}`)"
            >
              <span class="font-semibold text-gray-900 dark:text-white">{{ bldg.name }}</span>
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <p v-if="filteredBuildings.length === 0" class="p-8 text-center text-gray-400">No buildings found</p>
          </div>
        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- LOCATION CATEGORIES                                                -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'location-categories'">
        <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          <button
            v-for="cat in locationCategories"
            :key="cat"
            class="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-left active:bg-gray-100"
            @click="push('location-list', { category: cat })"
          >
            <div>
              <span class="font-semibold text-gray-900 dark:text-white">{{ cat }}</span>
              <span class="ml-2 text-sm text-gray-400">({{ locationsInCategory(cat).length }})</span>
            </div>
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p v-if="locationCategories.length === 0" class="p-8 text-center text-gray-400">No locations configured for this property</p>
        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- LOCATION LIST                                                      -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'location-list'">
        <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          <button
            v-for="loc in locationsInCategory(current.data.category as string)"
            :key="loc.id"
            class="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-left active:bg-gray-100"
            @click="enterInstallationList('common_area', loc.id, loc.name, `/assets/locations/${loc.id}`)"
          >
            <span class="font-semibold text-gray-900 dark:text-white">{{ loc.name }}</span>
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- INSTALLATION LIST                                                  -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'installation-list'">
        <div class="flex-1 flex flex-col">

          <!-- Context link (tap out to full asset page) -->
          <div v-if="current.data.contextLinkTo" class="px-5 py-2.5 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
            <NuxtLink
              :to="(current.data.contextLinkTo as string)"
              class="text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1"
            >
              View full {{ current.data.locationType === 'unit' ? 'Unit' : current.data.locationType === 'building' ? 'Building' : 'Location' }} details
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Loading -->
          <div v-if="instLoading" class="flex-1 flex items-center justify-center py-12">
            <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>

          <!-- Empty -->
          <div v-else-if="contextInstallations.length === 0" class="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            <div class="text-6xl mb-4">📦</div>
            <p class="text-gray-500 font-semibold mb-1">No installations here</p>
            <p class="text-sm text-gray-400">Use Add from the hub to log items in this location.</p>
          </div>

          <!-- Cards -->
          <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            <button
              v-for="inst in contextInstallations"
              :key="inst.id"
              class="w-full flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-left active:bg-gray-100"
              @click="push('installation-detail', { installation: inst, contextLinkTo: current.data.contextLinkTo, locationType: current.data.locationType })"
            >
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 dark:text-white truncate">{{ inst.brand }} {{ inst.name }}</p>
                <p class="text-sm text-gray-500">{{ inst.category_name }}</p>
                <div class="flex gap-1.5 mt-1.5 flex-wrap">
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusCls(inst.status)">{{ inst.status }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="healthCls(inst.health_status)">{{ inst.health_status }}</span>
                </div>
              </div>
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- INSTALLATION DETAIL                                                -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'installation-detail'">
        <div class="flex-1 overflow-y-auto pb-28">
          <div class="p-5 space-y-4">

            <!-- Item card -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Item</p>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {{ current.data.installation.brand }} {{ current.data.installation.name }}
              </h2>
              <p class="text-sm text-gray-500 mt-0.5">{{ current.data.installation.category_name }}</p>
              <div class="flex gap-2 mt-3 flex-wrap">
                <span class="text-xs px-2.5 py-1 rounded-full font-medium" :class="statusCls(current.data.installation.status)">
                  {{ fmt(current.data.installation.status) }}
                </span>
                <span class="text-xs px-2.5 py-1 rounded-full font-medium" :class="healthCls(current.data.installation.health_status)">
                  {{ fmt(current.data.installation.health_status) }}
                </span>
                <span v-if="current.data.installation.condition" class="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                  {{ current.data.installation.condition }}
                </span>
              </div>
            </div>

            <!-- Location card -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Installed Location</p>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900 dark:text-white">
                    {{ current.data.installation.location_name || fmt(current.data.installation.location_type) }}
                  </p>
                  <p class="text-sm text-gray-500">{{ fmt(current.data.installation.location_type) }}</p>
                </div>
                <NuxtLink
                  v-if="current.data.contextLinkTo"
                  :to="(current.data.contextLinkTo as string)"
                  class="shrink-0 text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 mt-0.5"
                >
                  Details
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </NuxtLink>
              </div>
            </div>

            <!-- Details grid -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm grid grid-cols-2 gap-y-4 gap-x-3">
              <div>
                <p class="text-xs font-medium text-gray-400 mb-0.5">Serial Number</p>
                <p class="text-sm font-mono text-gray-800 dark:text-gray-200">{{ current.data.installation.serial_number || '—' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 mb-0.5">Asset Tag</p>
                <p class="text-sm font-mono text-gray-800 dark:text-gray-200">{{ current.data.installation.asset_tag || '—' }}</p>
              </div>
              <div v-if="(current.data.installation.quantity ?? 1) > 1" class="col-span-2">
                <p class="text-xs font-medium text-gray-400 mb-0.5">Quantity</p>
                <p class="text-sm text-gray-800 dark:text-gray-200 font-semibold">{{ current.data.installation.quantity }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 mb-0.5">Install Date</p>
                <p class="text-sm text-gray-800 dark:text-gray-200">{{ current.data.installation.install_date || '—' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 mb-0.5">Warranty Exp.</p>
                <p class="text-sm text-gray-800 dark:text-gray-200">{{ current.data.installation.warranty_expiration || '—' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 mb-0.5">Age / Life Left</p>
                <p class="text-sm text-gray-800 dark:text-gray-200">
                  <template v-if="current.data.installation.age_years !== null">
                    {{ current.data.installation.age_years }}y / {{ current.data.installation.life_remaining_years }}y
                  </template>
                  <template v-else>—</template>
                </p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 mb-0.5">Supplier</p>
                <p class="text-sm text-gray-800 dark:text-gray-200">{{ current.data.installation.supplier || '—' }}</p>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="current.data.installation.notes" class="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {{ current.data.installation.notes }}
              </p>
            </div>

          </div>
        </div>

        <!-- Fixed bottom action bar -->
        <div class="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 pt-3 pb-5 flex gap-3">
          <button
            class="flex-1 py-3.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300 active:scale-95 transition-transform text-sm"
            @click="openEdit(current.data.installation)"
          >
            Edit
          </button>
          <button
            class="flex-1 py-3.5 rounded-xl border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold active:scale-95 transition-transform text-sm"
            @click="openTransfer(current.data.installation)"
          >
            Transfer
          </button>
          <button
            class="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-semibold active:scale-95 transition-transform text-sm"
            @click="openDelete(current.data.installation)"
          >
            Delete
          </button>
        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- ADD / EDIT FORM                                                    -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="current.view === 'add'">
        <div class="flex-1 overflow-y-auto">
          <form @submit.prevent="saveForm" class="p-5 space-y-5 pb-28">

            <!-- Error -->
            <div v-if="formError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm">
              {{ formError }}
            </div>

            <!-- Item: category pills + selector -->
            <div>
              <p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Item <span class="text-red-500">*</span>
              </p>
              <div class="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  class="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                  :class="itemPickerCategory === '' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'"
                  @click="itemPickerCategory = ''"
                >All</button>
                <button
                  v-for="cat in itemCategoryOpts"
                  :key="cat"
                  type="button"
                  class="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                  :class="itemPickerCategory === cat ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'"
                  @click="itemPickerCategory = cat; form.item_definition_id = ''"
                >{{ cat }}</button>
              </div>
              <LocationSelector
                v-model="form.item_definition_id"
                :options="filteredItemOpts"
                label=""
                placeholder="Select item from catalog…"
                required
              />
            </div>

            <!-- Location type -->
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Location Type <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="type in ['unit', 'building', 'common_area']"
                  :key="type"
                  type="button"
                  class="py-3 border-2 rounded-xl text-sm font-semibold capitalize transition-colors"
                  :class="form.location_type === type
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'"
                  @click="form.location_type = type; form.location_id = ''"
                >{{ type === 'common_area' ? 'Common' : type }}</button>
              </div>
            </div>

            <!-- Location picker -->
            <LocationSelector
              v-model="form.location_id"
              :options="formLocationOpts"
              :label="form.location_type === 'unit' ? 'Unit' : form.location_type === 'building' ? 'Building' : 'Common Area'"
              :placeholder="`Select ${form.location_type === 'common_area' ? 'common area' : form.location_type}…`"
              required
            />

            <!-- Serial + Asset Tag -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                <input v-model="form.serial_number" type="text" placeholder="RF28R720123456" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Asset Tag <span class="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input v-model="form.asset_tag" type="text" placeholder="SB-000042" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm focus:outline-none focus:border-primary-500" />
                <p class="mt-1 text-xs text-gray-400 leading-snug">Skip for LEDs, bulk, or inaccessible items.</p>
              </div>
            </div>

            <!-- Quantity + Install + Warranty dates -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Qty</label>
                <input v-model.number="form.quantity" type="number" min="1" step="1" placeholder="1" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Install Date</label>
                <input v-model="form.install_date" type="date" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Warranty Exp.</label>
                <input v-model="form.warranty_expiration" type="date" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm" />
              </div>
            </div>

            <!-- Status + Condition -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Status <span class="text-red-500">*</span></label>
                <select v-model="form.status" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm">
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                <select v-model="form.condition" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm">
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>

            <!-- Price + Supplier -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
                <input v-model="form.purchase_price" type="number" step="0.01" placeholder="0.00" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                <input v-model="form.supplier" type="text" placeholder="Home Depot" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm" />
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea v-model="form.notes" rows="3" placeholder="Installation notes…" class="w-full px-3 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm resize-none focus:outline-none focus:border-primary-500" />
            </div>

          </form>
        </div>

        <!-- Fixed save button -->
        <div class="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 pt-3 pb-5">
          <button
            type="button"
            :disabled="formLoading || !form.item_definition_id || !form.location_id"
            class="w-full py-4 bg-primary-600 text-white rounded-xl font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
            @click="saveForm"
          >
            {{ formLoading ? 'Saving…' : (current.data.editing ? 'Save Changes' : 'Add Installation') }}
          </button>
        </div>
      </template>

    </template><!-- /v-else (not loading) -->

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TRANSFER CONFIRMATION SHEET                                            -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showTransfer"
        class="fixed inset-0 z-50 flex items-end bg-black/60"
        @click.self="showTransfer = false"
      >
        <div class="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Transfer Installation</h3>
            <button @click="showTransfer = false" class="p-1 text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-500">Asset tag, notes, and history are preserved. Only the location changes.</p>
          <div v-if="transferError" class="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{{ transferError }}</div>

          <!-- New location type -->
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="type in ['unit', 'building', 'common_area']"
              :key="type"
              type="button"
              class="py-2.5 border-2 rounded-xl text-sm font-semibold capitalize transition-colors"
              :class="transferForm.location_type === type
                ? 'bg-primary-600 text-white border-primary-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'"
              @click="transferForm.location_type = type; transferForm.location_id = ''"
            >{{ type === 'common_area' ? 'Common' : type }}</button>
          </div>

          <LocationSelector
            v-model="transferForm.location_id"
            :options="transferLocOpts"
            :label="transferForm.location_type === 'unit' ? 'New Unit' : transferForm.location_type === 'building' ? 'New Building' : 'New Location'"
            placeholder="Select new location…"
            required
          />

          <div class="flex gap-3 pt-1">
            <button
              type="button"
              class="flex-1 py-3.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300"
              @click="showTransfer = false"
            >Cancel</button>
            <button
              type="button"
              :disabled="transferLoading || !transferForm.location_id"
              class="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 active:scale-95 transition-transform"
              @click="executeTransfer"
            >{{ transferLoading ? 'Moving…' : 'Confirm Transfer' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- DELETE CONFIRMATION SHEET                                              -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showDelete"
        class="fixed inset-0 z-50 flex items-end bg-black/60"
        @click.self="showDelete = false"
      >
        <div class="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Delete Installation?</h3>
            <button @click="showDelete = false" class="p-1 text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-500 leading-relaxed">
            This marks the installation as <strong>inactive</strong>. All history, notes, and the asset tag link are kept. This action cannot be undone from the field app.
          </p>
          <div v-if="deleteError" class="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{{ deleteError }}</div>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 py-3.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300"
              @click="showDelete = false"
            >Cancel</button>
            <button
              type="button"
              :disabled="deleteLoading"
              class="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-40 active:scale-95 transition-transform"
              @click="executeDelete"
            >{{ deleteLoading ? 'Deleting…' : 'Yes, Delete' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
