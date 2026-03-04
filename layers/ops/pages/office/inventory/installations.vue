<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

// Composables
const { activeProperty } = usePropertyState()
const { fetchInstallations, createInstallation, updateInstallation, deleteInstallation } = useInventoryInstallations()
const { fetchItemDefinitions } = useInventoryItemDefinitions()
const { fetchUnits, fetchBuildings, fetchLocations } = useLocationSelector()

// ── Data ──────────────────────────────────────────────────────────────────
const allInstallations = ref([])
const itemDefinitions   = ref([])
const loading = ref(false)
const error   = ref(null)

// Location data for the install form
const units     = ref([])
const buildings = ref([])
const locations = ref([])
const locationOptions = computed(() => {
  if (installationForm.value.location_type === 'unit')        return units.value
  if (installationForm.value.location_type === 'building')    return buildings.value
  if (installationForm.value.location_type === 'common_area') return locations.value
  return []
})

onMounted(async () => { await loadData() })

const loadData = async () => {
  try {
    loading.value = true
    error.value   = null
    itemDefinitions.value = await fetchItemDefinitions({ propertyCode: activeProperty.value })
    allInstallations.value = await fetchInstallations({ propertyCode: activeProperty.value })
    if (activeProperty.value) {
      units.value     = await fetchUnits(activeProperty.value)
      buildings.value = await fetchBuildings(activeProperty.value)
      locations.value = await fetchLocations(activeProperty.value)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// ── Sidebar Filter State ───────────────────────────────────────────────────
const searchText              = ref('')
const filterCategories        = ref<string[]>([])
const filterStatuses          = ref<string[]>([])
const filterHealth            = ref<string[]>([])
const filterWarranty          = ref<string[]>([])
const filterConditions        = ref<string[]>([])
const filterLocationTypes     = ref<string[]>([])

// Collapsible sections — all collapsed by default
const SECTION_KEYS = ['category', 'status', 'health', 'warranty', 'condition', 'locationType'] as const
const expanded = ref<Record<string, boolean>>(Object.fromEntries(SECTION_KEYS.map(k => [k, false])))
const toggleSection = (key: string) => { expanded.value[key] = !expanded.value[key] }
const allExpanded = computed(() => SECTION_KEYS.every(k => expanded.value[k]))
const toggleAllSections = () => {
  const target = !allExpanded.value
  for (const key of SECTION_KEYS) expanded.value[key] = target
}

// ── Filter Option Lists (derived from loaded data) ─────────────────────────
const categoryOptions = computed(() => {
  const set = new Set<string>()
  for (const i of allInstallations.value) { if (i.category_name) set.add(i.category_name) }
  return [...set].sort()
})

const STATUS_OPTIONS    = ['active', 'maintenance', 'retired', 'disposed']
const HEALTH_OPTIONS    = ['healthy', 'warning', 'critical', 'expired']
const WARRANTY_OPTIONS  = ['active', 'expiring_soon', 'expired', 'unknown']
const CONDITION_OPTIONS = ['excellent', 'good', 'fair', 'poor']
const LOCATION_OPTIONS  = ['unit', 'building', 'common_area']

// ── Active Filter Count & Chips ────────────────────────────────────────────
const activeFilterCount = computed(() => {
  let n = 0
  if (searchText.value)              n++
  if (filterCategories.value.length) n++
  if (filterStatuses.value.length)   n++
  if (filterHealth.value.length)     n++
  if (filterWarranty.value.length)   n++
  if (filterConditions.value.length) n++
  if (filterLocationTypes.value.length) n++
  return n
})

const clearAllFilters = () => {
  searchText.value          = ''
  filterCategories.value    = []
  filterStatuses.value      = []
  filterHealth.value        = []
  filterWarranty.value      = []
  filterConditions.value    = []
  filterLocationTypes.value = []
}

type FilterChip = { key: string; label: string; remove: () => void }
const activeChips = computed((): FilterChip[] => {
  const chips: FilterChip[] = []
  if (searchText.value) {
    chips.push({ key: 'search', label: `"${searchText.value}"`, remove: () => { searchText.value = '' } })
  }
  for (const v of filterCategories.value) {
    chips.push({ key: `cat-${v}`, label: v, remove: () => { filterCategories.value = filterCategories.value.filter(x => x !== v) } })
  }
  for (const v of filterStatuses.value) {
    chips.push({ key: `st-${v}`, label: v, remove: () => { filterStatuses.value = filterStatuses.value.filter(x => x !== v) } })
  }
  for (const v of filterHealth.value) {
    chips.push({ key: `hl-${v}`, label: v, remove: () => { filterHealth.value = filterHealth.value.filter(x => x !== v) } })
  }
  for (const v of filterWarranty.value) {
    chips.push({ key: `wr-${v}`, label: v.replace('_', ' '), remove: () => { filterWarranty.value = filterWarranty.value.filter(x => x !== v) } })
  }
  for (const v of filterConditions.value) {
    chips.push({ key: `co-${v}`, label: v, remove: () => { filterConditions.value = filterConditions.value.filter(x => x !== v) } })
  }
  for (const v of filterLocationTypes.value) {
    chips.push({ key: `lt-${v}`, label: v.replace('_', ' '), remove: () => { filterLocationTypes.value = filterLocationTypes.value.filter(x => x !== v) } })
  }
  return chips
})

function toggleStringFilter(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

// ── Client-Side Filtered Results ───────────────────────────────────────────
const filteredInstallations = computed(() => {
  return allInstallations.value.filter(inst => {
    if (searchText.value) {
      const q = searchText.value.toLowerCase()
      const hit =
        inst.serial_number?.toLowerCase().includes(q) ||
        inst.asset_tag?.toLowerCase().includes(q) ||
        inst.brand?.toLowerCase().includes(q) ||
        inst.model?.toLowerCase().includes(q) ||
        inst.location_name?.toLowerCase().includes(q) ||
        inst.category_name?.toLowerCase().includes(q)
      if (!hit) return false
    }
    if (filterCategories.value.length    && !filterCategories.value.includes(inst.category_name))    return false
    if (filterStatuses.value.length      && !filterStatuses.value.includes(inst.status))             return false
    if (filterHealth.value.length        && !filterHealth.value.includes(inst.health_status))        return false
    if (filterWarranty.value.length      && !filterWarranty.value.includes(inst.warranty_status))    return false
    if (filterConditions.value.length    && !filterConditions.value.includes(inst.condition))        return false
    if (filterLocationTypes.value.length && !filterLocationTypes.value.includes(inst.location_type)) return false
    return true
  })
})

// ── Install Form ───────────────────────────────────────────────────────────
const showInstallationForm  = ref(false)
const editingInstallation   = ref(null)

const installationForm = ref({
  item_definition_id: '',
  serial_number: '',
  asset_tag: '',
  install_date: '',
  warranty_expiration: '',
  purchase_price: null,
  supplier: '',
  location_type: 'unit',
  location_id: '',
  status: 'active',
  condition: 'excellent',
  notes: '',
})

const openInstallationForm = (installation = null) => {
  if (installation) {
    editingInstallation.value = installation
    installationForm.value = {
      item_definition_id: installation.item_definition_id,
      serial_number:      installation.serial_number || '',
      asset_tag:          installation.asset_tag || '',
      install_date:       installation.install_date || '',
      warranty_expiration:installation.warranty_expiration || '',
      purchase_price:     installation.purchase_price || null,
      supplier:           installation.supplier || '',
      location_type:      installation.location_type || 'unit',
      location_id:        installation.location_id || '',
      status:             installation.status,
      condition:          installation.condition || 'excellent',
      notes:              installation.notes || '',
    }
  } else {
    editingInstallation.value = null
    installationForm.value = {
      item_definition_id: '',
      serial_number: '',
      asset_tag: '',
      install_date: new Date().toISOString().split('T')[0],
      warranty_expiration: '',
      purchase_price: null,
      supplier: '',
      location_type: 'unit',
      location_id: '',
      status: 'active',
      condition: 'excellent',
      notes: '',
    }
  }
  showInstallationForm.value = true
}

const saveInstallationForm = async () => {
  try {
    loading.value = true
    if (editingInstallation.value) {
      await updateInstallation(editingInstallation.value.id, installationForm.value)
    } else {
      await createInstallation({
        ...installationForm.value,
        property_code: activeProperty.value,
        purchase_price: installationForm.value.purchase_price ? parseFloat(installationForm.value.purchase_price) : null
      })
    }
    showInstallationForm.value = false
    allInstallations.value = await fetchInstallations({ propertyCode: activeProperty.value })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleDeleteInstallation = async (installationId: string) => {
  if (!confirm('Are you sure you want to delete this installation?')) return
  try {
    loading.value = true
    await deleteInstallation(installationId)
    allInstallations.value = await fetchInstallations({ propertyCode: activeProperty.value })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// ── Badge helpers ──────────────────────────────────────────────────────────
const getHealthBadgeClass = (s: string) => ({
  healthy:  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  warning:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  critical: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  expired:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}[s] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')

const getStatusBadgeClass = (s: string) => ({
  active:      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  retired:     'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  disposed:    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}[s] ?? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300')

const getWarrantyBadgeClass = (s: string) => ({
  active:         'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  expiring_soon:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  expired:        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}[s] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')

const formatLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
</script>

<template>
  <div class="flex gap-0 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">

    <!-- ── Left Sidebar ──────────────────────────────────────────────────── -->
    <aside
      class="w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col"
      style="min-height: calc(100vh - 72px);"
    >
      <!-- Sticky header -->
      <div class="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-gray-900 dark:text-white text-sm">
            Filters
            <span v-if="activeFilterCount" class="ml-1.5 text-xs font-bold text-primary-600 dark:text-primary-400">({{ activeFilterCount }})</span>
          </span>
          <button
            class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
            @click="toggleAllSections"
          >
            {{ allExpanded ? 'Collapse All' : 'Expand All' }}
          </button>
        </div>
        <UInput
          v-model="searchText"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search installations..."
          size="sm"
        />
        <!-- Active filter chips -->
        <div v-if="activeChips.length" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Filters</span>
            <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium" @click="clearAllFilters">
              Clear all
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="chip in activeChips"
              :key="chip.key"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              @click="chip.remove()"
            >
              {{ chip.label }}<span class="text-primary-400 font-bold ml-0.5">×</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Scrollable filter sections -->
      <div class="flex-1 overflow-y-auto">

        <!-- Category -->
        <div v-if="categoryOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" @click="toggleSection('category')">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Category
              <span v-if="filterCategories.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterCategories.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none">{{ expanded.category ? '−' : '+' }}</span>
          </button>
          <div v-show="expanded.category" class="px-4 pb-3 space-y-1.5">
            <label v-for="opt in categoryOptions" :key="opt" class="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="filterCategories.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterCategories = toggleStringFilter(filterCategories, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- Status -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" @click="toggleSection('status')">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Status
              <span v-if="filterStatuses.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterStatuses.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none">{{ expanded.status ? '−' : '+' }}</span>
          </button>
          <div v-show="expanded.status" class="px-4 pb-3 space-y-1.5">
            <label v-for="opt in STATUS_OPTIONS" :key="opt" class="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="filterStatuses.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterStatuses = toggleStringFilter(filterStatuses, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white capitalize">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- Health -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" @click="toggleSection('health')">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Health
              <span v-if="filterHealth.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterHealth.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none">{{ expanded.health ? '−' : '+' }}</span>
          </button>
          <div v-show="expanded.health" class="px-4 pb-3 space-y-1.5">
            <label v-for="opt in HEALTH_OPTIONS" :key="opt" class="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="filterHealth.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterHealth = toggleStringFilter(filterHealth, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white capitalize">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- Warranty -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" @click="toggleSection('warranty')">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Warranty
              <span v-if="filterWarranty.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterWarranty.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none">{{ expanded.warranty ? '−' : '+' }}</span>
          </button>
          <div v-show="expanded.warranty" class="px-4 pb-3 space-y-1.5">
            <label v-for="opt in WARRANTY_OPTIONS" :key="opt" class="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="filterWarranty.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterWarranty = toggleStringFilter(filterWarranty, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{{ formatLabel(opt) }}</span>
            </label>
          </div>
        </div>

        <!-- Condition -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" @click="toggleSection('condition')">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Condition
              <span v-if="filterConditions.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterConditions.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none">{{ expanded.condition ? '−' : '+' }}</span>
          </button>
          <div v-show="expanded.condition" class="px-4 pb-3 space-y-1.5">
            <label v-for="opt in CONDITION_OPTIONS" :key="opt" class="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="filterConditions.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterConditions = toggleStringFilter(filterConditions, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white capitalize">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- Location Type -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" @click="toggleSection('locationType')">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Location Type
              <span v-if="filterLocationTypes.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterLocationTypes.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none">{{ expanded.locationType ? '−' : '+' }}</span>
          </button>
          <div v-show="expanded.locationType" class="px-4 pb-3 space-y-1.5">
            <label v-for="opt in LOCATION_OPTIONS" :key="opt" class="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="filterLocationTypes.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterLocationTypes = toggleStringFilter(filterLocationTypes, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{{ formatLabel(opt) }}</span>
            </label>
          </div>
        </div>

      </div>
    </aside>

    <!-- ── Main Content ──────────────────────────────────────────────────── -->
    <div class="flex-1 min-w-0 flex flex-col">

      <!-- Header -->
      <div class="px-6 pt-6 pb-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Installations</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ filteredInstallations.length }} of {{ allInstallations.length }} installed items
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            to="/office/inventory"
            icon="i-heroicons-archive-box"
            color="neutral"
            variant="outline"
            size="sm"
          >
            Item Management
          </UButton>
          <UButton
            icon="i-heroicons-plus"
            color="primary"
            variant="solid"
            size="sm"
            @click="openInstallationForm()"
          >
            Add Installation
          </UButton>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-400 p-4 rounded-lg">
        {{ error }}
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto p-6">

        <!-- Loading skeletons -->
        <div v-if="loading && allInstallations.length === 0" class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>

        <!-- Empty -->
        <div v-else-if="filteredInstallations.length === 0" class="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <UIcon name="i-heroicons-archive-box" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p class="text-gray-500 dark:text-gray-400 font-medium mb-1">No installations found</p>
          <p v-if="activeFilterCount" class="text-sm text-gray-400">
            Try clearing some filters.
            <button class="text-primary-600 dark:text-primary-400 hover:underline ml-1" @click="clearAllFilters">Clear all</button>
          </p>
          <p v-else class="text-sm text-gray-400">Add your first installation to get started.</p>
        </div>

        <!-- Cards -->
        <div v-else class="space-y-3">
          <div
            v-for="inst in filteredInstallations"
            :key="inst.id"
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            @click="openInstallationForm(inst)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 class="font-semibold text-gray-900 dark:text-white">{{ inst.brand }} {{ inst.model }}</h3>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ inst.category_name }}</span>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span class="text-gray-400 dark:text-gray-500 block text-xs uppercase tracking-wide font-medium">Serial / Asset</span>
                    <span class="font-mono text-gray-700 dark:text-gray-300">{{ inst.serial_number || '—' }}</span>
                    <span v-if="inst.asset_tag" class="text-gray-400"> / {{ inst.asset_tag }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400 dark:text-gray-500 block text-xs uppercase tracking-wide font-medium">Location</span>
                    <span class="text-gray-700 dark:text-gray-300">{{ inst.location_name || formatLabel(inst.location_type) || '—' }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400 dark:text-gray-500 block text-xs uppercase tracking-wide font-medium">Age / Life Left</span>
                    <span v-if="inst.age_years !== null" class="text-gray-700 dark:text-gray-300">{{ inst.age_years }}y / {{ inst.life_remaining_years }}y</span>
                    <span v-else class="text-gray-400">—</span>
                  </div>
                  <div>
                    <span class="text-gray-400 dark:text-gray-500 block text-xs uppercase tracking-wide font-medium">Installed</span>
                    <span class="text-gray-700 dark:text-gray-300">{{ inst.install_date || '—' }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full" :class="getStatusBadgeClass(inst.status)">{{ inst.status }}</span>
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full" :class="getHealthBadgeClass(inst.health_status)">{{ inst.health_status }}</span>
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full" :class="getWarrantyBadgeClass(inst.warranty_status)">{{ formatLabel(inst.warranty_status) }}</span>
                  <span v-if="inst.condition" class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">{{ inst.condition }}</span>
                </div>
              </div>

              <button
                class="ml-4 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                @click.stop="handleDeleteInstallation(inst.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Installation Form Modal ───────────────────────────────────────── -->
    <div
      v-if="showInstallationForm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="showInstallationForm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-3xl w-full my-8">
        <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {{ editingInstallation ? 'Edit Installation' : 'Add Installation' }}
        </h2>

        <form @submit.prevent="saveInstallationForm" class="space-y-4">
          <LocationSelector
            v-model="installationForm.item_definition_id"
            :options="itemDefinitions.map(item => ({ id: item.id, name: `${item.category_name} - ${item.brand} ${item.model}` }))"
            label="Item"
            placeholder="Select item from catalog..."
            required
          />

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Serial Number</label>
              <input v-model="installationForm.serial_number" type="text" placeholder="e.g. RF28R720123456" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Asset Tag</label>
              <input v-model="installationForm.asset_tag" type="text" placeholder="e.g. WO-REF-0101" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Install Date</label>
              <input v-model="installationForm.install_date" type="date" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Warranty Expiration</label>
              <input v-model="installationForm.warranty_expiration" type="date" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Purchase Price</label>
              <input v-model="installationForm.purchase_price" type="number" step="0.01" placeholder="0.00" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Supplier</label>
              <input v-model="installationForm.supplier" type="text" placeholder="e.g. Home Depot" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Location Type *</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="type in ['unit', 'building', 'common_area']"
                  :key="type"
                  type="button"
                  class="px-4 py-3 border-2 rounded-lg font-medium transition-colors capitalize"
                  :class="installationForm.location_type === type
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-primary-500'"
                  @click="installationForm.location_type = type; installationForm.location_id = ''"
                >
                  {{ type === 'common_area' ? 'Common' : type }}
                </button>
              </div>
            </div>
            <LocationSelector
              v-model="installationForm.location_id"
              :options="locationOptions"
              :label="installationForm.location_type === 'unit' ? 'Unit' : installationForm.location_type === 'building' ? 'Building' : 'Common Area'"
              :placeholder="`Select ${installationForm.location_type === 'common_area' ? 'common area' : installationForm.location_type}...`"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Status *</label>
              <select v-model="installationForm.status" required class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700">
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Condition</label>
              <select v-model="installationForm.condition" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Notes</label>
            <textarea v-model="installationForm.notes" rows="3" placeholder="Installation notes, maintenance history, etc." class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t">
            <button type="button" @click="showInstallationForm = false" class="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" :disabled="loading" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
