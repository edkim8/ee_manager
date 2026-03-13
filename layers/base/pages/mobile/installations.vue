<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useRoute } from '#imports'
import { usePropertyState } from '../../composables/usePropertyState'

definePageMeta({
  layout: 'mobile-app',
  middleware: 'auth',
})

const route = useRoute()
const { activeProperty } = usePropertyState()
const { fetchInstallations, createInstallation } = useInventoryInstallations()
const { fetchItemDefinitions } = useInventoryItemDefinitions()
const { fetchUnits, fetchBuildings, fetchLocations } = useLocationSelector()

// ── Data ──────────────────────────────────────────────────────────────────
const allInstallations = ref([])
const itemDefinitions  = ref([])
const units     = ref([])
const buildings = ref([])
const locations = ref([])
const loading   = ref(false)
const error     = ref(null)

const loadData = async () => {
  try {
    loading.value = true
    error.value   = null
    itemDefinitions.value  = await fetchItemDefinitions({ propertyCode: activeProperty.value })
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

onMounted(async () => {
  await loadData()
  // If arriving from Quick Scan with an unregistered asset tag, pre-open wizard
  const tag = route.query.assetTag as string | undefined
  if (tag) {
    openWizard()
    assetTag.value = tag
  }
})

// ── Wizard State ───────────────────────────────────────────────────────────
const showWizard = ref(false)
const step       = ref(1)
const saving     = ref(false)
const formError  = ref(null)

// Step 1 — Item
const itemSearch    = ref('')
const selectedItem  = ref(null)

// Step 2 — Location
const locationType  = ref('unit')
const locationSearch = ref('')
const selectedLoc   = ref(null)

// Step 3 — Details
const installDate   = ref(new Date().toISOString().split('T')[0])
const condition     = ref('excellent')
const serialNumber  = ref('')
const assetTag      = ref('')
const notes         = ref('')

// ── Computed lists ─────────────────────────────────────────────────────────
// Items grouped by category, filtered by search
const filteredItems = computed(() => {
  const q = itemSearch.value.toLowerCase()
  return itemDefinitions.value.filter(i =>
    !q ||
    i.brand?.toLowerCase().includes(q) ||
    i.name?.toLowerCase().includes(q) ||
    i.category_name?.toLowerCase().includes(q)
  )
})

const itemsByCategory = computed(() => {
  const map = new Map<string, any[]>()
  for (const item of filteredItems.value) {
    const cat = item.category_name || 'Uncategorized'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(item)
  }
  return [...map.entries()]
})

const locationList = computed(() => {
  const list = locationType.value === 'unit' ? units.value
    : locationType.value === 'building' ? buildings.value
    : locations.value
  const q = locationSearch.value.toLowerCase()
  return q ? list.filter(l => l.name?.toLowerCase().includes(q)) : list
})

// ── Wizard actions ─────────────────────────────────────────────────────────
const openWizard = () => {
  step.value         = 1
  itemSearch.value   = ''
  selectedItem.value = null
  locationType.value = 'unit'
  locationSearch.value = ''
  selectedLoc.value  = null
  installDate.value  = new Date().toISOString().split('T')[0]
  condition.value    = 'excellent'
  serialNumber.value = ''
  assetTag.value     = ''
  notes.value        = ''
  formError.value    = null
  showWizard.value   = true
}

const selectItem = (item: any) => {
  selectedItem.value = item
  step.value = 2
}

const selectLocation = (loc: any) => {
  selectedLoc.value = loc
  step.value = 3
}

const saveInstallation = async () => {
  try {
    saving.value    = true
    formError.value = null
    await createInstallation({
      property_code:      activeProperty.value,
      item_definition_id: selectedItem.value.id,
      location_type:      locationType.value,
      location_id:        selectedLoc.value.id,
      install_date:       installDate.value,
      condition:          condition.value,
      serial_number:      serialNumber.value || null,
      asset_tag:          assetTag.value || null,
      notes:              notes.value || null,
      status:             'active',
    })
    showWizard.value = false
    allInstallations.value = await fetchInstallations({ propertyCode: activeProperty.value })
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700' },
  { value: 'good',      label: 'Good',      color: 'text-sky-600 dark:text-sky-400',         bg: 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700' },
  { value: 'fair',      label: 'Fair',      color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' },
  { value: 'poor',      label: 'Poor',      color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' },
]

const getHealthColor = (s: string) => ({
  healthy:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  expired:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}[s] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400')

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
</script>

<template>
  <div class="px-4 pt-4 pb-6 space-y-3">

    <h1 class="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Installations</h1>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-2xl">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading && !allInstallations.length" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="!allInstallations.length" class="py-12 text-center text-sm text-gray-400">
      No installations yet. Tap <strong>Add</strong> to record your first item.
    </div>

    <!-- List -->
    <div v-else class="space-y-2">
      <div
        v-for="inst in allInstallations"
        :key="inst.id"
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="font-black text-sm text-gray-900 dark:text-white truncate">{{ inst.brand }} {{ inst.name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ inst.category_name }}</p>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {{ inst.location_name || inst.location_type || '—' }}
              <span v-if="inst.install_date" class="text-gray-400"> · {{ fmtDate(inst.install_date) }}</span>
            </p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0" :class="getHealthColor(inst.health_status)">
            {{ inst.health_status }}
          </span>
        </div>
        <div v-if="inst.serial_number || inst.asset_tag" class="mt-1.5 font-mono text-[10px] text-gray-400 truncate">
          {{ [inst.serial_number, inst.asset_tag].filter(Boolean).join(' / ') }}
        </div>
      </div>
    </div>

  </div>

  <!-- ── Fixed Bottom Action Bar ────────────────────────────────────────── -->
  <div class="fixed left-0 right-0 z-40 px-4" style="bottom: calc(env(safe-area-inset-bottom, 0px) + 6.5rem)">
    <div class="max-w-md mx-auto">
      <button
        class="w-full h-14 rounded-2xl bg-primary-600 text-white font-black text-sm uppercase tracking-widest shadow-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
        @click="openWizard"
      >
        <UIcon name="i-heroicons-plus" class="w-5 h-5" />
        Add Installation
      </button>
    </div>
  </div>

  <!-- ── Wizard Full-Screen Overlay ─────────────────────────────────────── -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-250 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="showWizard"
      class="fixed inset-0 z-[70] bg-slate-50 dark:bg-slate-950 flex flex-col"
      style="padding-bottom: env(safe-area-inset-bottom, 0px);"
    >

      <!-- ── Wizard Header ── -->
      <div class="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div style="height: env(safe-area-inset-top, 0px)" />
        <div class="flex items-center gap-3 px-4 h-14">
          <!-- Back button (steps 2–3) or spacer (step 1) -->
          <button
            v-if="step > 1"
            class="p-2 -ml-2 rounded-full text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
            @click="step--"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-6 h-6" />
          </button>
          <div v-else class="w-8" />

          <div class="flex-1">
            <p class="text-base font-black text-gray-900 dark:text-white">
              {{ step === 1 ? 'Select Item' : step === 2 ? 'Select Location' : 'Installation Details' }}
            </p>
            <p class="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Step {{ step }} of 3</p>
          </div>

          <!-- Step dots -->
          <div class="flex gap-1.5 mr-2">
            <div v-for="s in 3" :key="s" class="w-2 h-2 rounded-full transition-colors" :class="s <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'" />
          </div>

          <!-- Cancel — always visible -->
          <button
            class="p-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
            @click="showWizard = false"
          >
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- STEP 1 — Item Selection                                           -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div v-if="step === 1" class="flex-1 flex flex-col overflow-hidden">

        <!-- Search bar -->
        <div class="px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="relative">
            <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="itemSearch"
              type="search"
              placeholder="Search by brand, name, or category..."
              class="w-full pl-10 pr-4 py-3 text-base bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <!-- Item list grouped by category -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="!itemsByCategory.length" class="py-16 text-center text-gray-400">No items match your search.</div>
          <div v-for="[category, items] in itemsByCategory" :key="category">
            <!-- Category header -->
            <div class="px-4 py-2 bg-gray-100 dark:bg-gray-800/60">
              <span class="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{{ category }}</span>
            </div>
            <!-- Items in category -->
            <button
              v-for="item in items"
              :key="item.id"
              class="w-full flex items-center gap-4 px-4 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800 active:bg-primary-50 dark:active:bg-primary-900/20 transition-colors text-left"
              @click="selectItem(item)"
            >
              <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <UIcon name="i-heroicons-archive-box" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-base font-bold text-gray-900 dark:text-white">{{ item.brand }} {{ item.name }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ item.category_name }}</p>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- STEP 2 — Location Selection                                        -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div v-else-if="step === 2" class="flex-1 flex flex-col overflow-hidden">

        <!-- Selected item summary -->
        <div v-if="selectedItem" class="flex items-center gap-3 px-4 py-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800 flex-shrink-0">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-bold text-primary-800 dark:text-primary-200 truncate">{{ selectedItem.brand }} {{ selectedItem.name }}</p>
            <p class="text-[11px] text-primary-600 dark:text-primary-400">{{ selectedItem.category_name }}</p>
          </div>
        </div>

        <!-- Location type toggle -->
        <div class="px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="(label, type) in { unit: 'Unit', building: 'Building', common_area: 'Common Area' }"
              :key="type"
              class="py-3 rounded-xl text-sm font-bold border-2 transition-colors"
              :class="locationType === type
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              @click="locationType = type; locationSearch = ''; selectedLoc = null"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Search -->
        <div class="px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="relative">
            <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="locationSearch"
              type="search"
              :placeholder="`Search ${locationType === 'common_area' ? 'common areas' : locationType + 's'}...`"
              class="w-full pl-10 pr-4 py-3 text-base bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <!-- Location list -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="!locationList.length" class="py-16 text-center text-gray-400 text-sm">No results found.</div>
          <button
            v-for="loc in locationList"
            :key="loc.id"
            class="w-full flex items-center gap-4 px-4 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800 active:bg-primary-50 dark:active:bg-primary-900/20 transition-colors text-left"
            @click="selectLocation(loc)"
          >
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <UIcon
                :name="locationType === 'unit' ? 'i-heroicons-home' : locationType === 'building' ? 'i-heroicons-building-office-2' : 'i-heroicons-map-pin'"
                class="w-5 h-5 text-slate-500 dark:text-slate-400"
              />
            </div>
            <p class="flex-1 text-base font-bold text-gray-900 dark:text-white text-left">{{ loc.name }}</p>
            <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
          </button>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- STEP 3 — Details                                                   -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div v-else-if="step === 3" class="flex-1 overflow-y-auto">

        <!-- Selection summary -->
        <div class="mx-4 mt-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-archive-box" class="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ selectedItem?.brand }} {{ selectedItem?.name }}</p>
              <p class="text-xs text-gray-400">{{ selectedItem?.category_name }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <UIcon
              :name="locationType === 'unit' ? 'i-heroicons-home' : locationType === 'building' ? 'i-heroicons-building-office-2' : 'i-heroicons-map-pin'"
              class="w-5 h-5 text-slate-500 flex-shrink-0"
            />
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ selectedLoc?.name }}</p>
          </div>
        </div>

        <div class="px-4 py-4 space-y-5">

          <!-- Install Date -->
          <div>
            <label class="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Install Date</label>
            <input
              v-model="installDate"
              type="date"
              class="w-full px-4 py-3.5 text-base border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- Condition -->
          <div>
            <label class="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Condition</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="opt in CONDITION_OPTIONS"
                :key="opt.value"
                class="py-4 rounded-2xl text-base font-bold border-2 transition-all active:scale-95"
                :class="condition === opt.value
                  ? `${opt.bg} ${opt.color} border-current`
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'"
                @click="condition = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Serial Number -->
          <div>
            <label class="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Serial Number</label>
            <input
              v-model="serialNumber"
              type="text"
              placeholder="e.g. RF28R720123456"
              class="w-full px-4 py-3.5 text-base border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- Asset Tag -->
          <div>
            <label class="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Asset Tag</label>
            <input
              v-model="assetTag"
              type="text"
              placeholder="e.g. WO-REF-0101"
              class="w-full px-4 py-3.5 text-base border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Notes</label>
            <textarea
              v-model="notes"
              rows="4"
              placeholder="Installation notes, maintenance history, etc."
              class="w-full px-4 py-3.5 text-base border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          <!-- Error -->
          <div v-if="formError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-2xl">
            {{ formError }}
          </div>

          <!-- Save -->
          <button
            :disabled="saving"
            class="w-full h-14 rounded-2xl bg-primary-600 text-white font-black text-base uppercase tracking-widest shadow-lg disabled:opacity-50 active:scale-[0.97] transition-transform"
            @click="saveInstallation"
          >
            {{ saving ? 'Saving...' : 'Save Installation' }}
          </button>

          <div style="height: 1rem" />

        </div>
      </div>

    </div>
  </Transition>

</template>
