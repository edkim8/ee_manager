<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import { allColumns } from '../../../../../configs/table-configs/units-complete.generated'
import { filterColumnsByAccess } from '../../../../table/composables/useTableColumns'
import type { TableColumn } from '../../../../table/types'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { activeProperty, userContext } = usePropertyState()

// ── Data Fetching ──────────────────────────────────────────────────────────

// Units scoped to active property
const { data: allUnits, status } = await useAsyncData('units-search-all', async () => {
  if (!activeProperty.value) return []
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('unit_name')
  if (error) throw error
  return data ?? []
}, { watch: [activeProperty] })

// Unit amenities (linkage) — property-scoped and reactive, used for filter MATCHING
const { data: unitAmenitiesRaw } = await useAsyncData('units-search-amenities', async () => {
  if (!activeProperty.value) return []
  // Step 1: get unit IDs for the active property
  const { data: propertyUnits } = await supabase
    .from('units')
    .select('id')
    .eq('property_code', activeProperty.value)
  const unitIds = (propertyUnits ?? []).map(u => u.id)
  if (!unitIds.length) return []
  // Step 2: fetch amenity linkages only for those units
  const { data } = await supabase
    .from('unit_amenities')
    .select('unit_id, amenities(id, yardi_name, type, amount, active)')
    .eq('active', true)
    .in('unit_id', unitIds)
  return data ?? []
}, { watch: [activeProperty] })

// Property amenity catalog — used to build filter OPTION LISTS per active property.
// Fetched from the amenities table (not unit_amenities) so all defined amenities appear
// even if no units have been linked yet. Reactive to property change.
const { data: propertyAmenitiesRaw } = await useAsyncData('units-search-property-amenities', async () => {
  if (!activeProperty.value) return []
  const { data } = await supabase
    .from('amenities')
    .select('id, yardi_name, type')
    .eq('property_code', activeProperty.value)
    .eq('active', true)
    .order('yardi_name')
  return data ?? []
}, { watch: [activeProperty] })

// Resident counts via active tenancies
const { data: tenanciesData } = await useAsyncData('units-search-tenancies', async () => {
  const { data } = await supabase
    .from('tenancies')
    .select('unit_id, residents(id)')
    .in('status', ['Current', 'Notice', 'Eviction'])
  return data ?? []
})

// Inventory installations at unit locations for active property
const { data: inventoryRaw } = await useAsyncData('units-search-inventory', async () => {
  if (!activeProperty.value) return []
  const { data } = await supabase
    .from('view_inventory_installations')
    .select('location_id, category_name, brand, model')
    .eq('location_type', 'unit')
    .eq('property_code', activeProperty.value)
  return data ?? []
}, { watch: [activeProperty] })

// ── Derived Maps ───────────────────────────────────────────────────────────

type AmenityRow = { id: string; yardi_name: string; type: string; amount: number; active: boolean }

// unit_id → AmenityRow[] (already property-scoped by the fetch above)
const unitAmenitiesMap = computed(() => {
  const map = new Map<string, AmenityRow[]>()
  for (const row of (unitAmenitiesRaw.value ?? [])) {
    const amenity = (row as any).amenities as AmenityRow | null
    if (!amenity?.id || !amenity.active) continue
    const list = map.get(row.unit_id) ?? []
    list.push(amenity)
    map.set(row.unit_id, list)
  }
  return map
})

// unit_id → resident count
const residentCountMap = computed(() => {
  const map = new Map<string, number>()
  for (const t of (tenanciesData.value ?? [])) {
    const residents = (t as any).residents as Array<{ id: string }> | null
    if (!t.unit_id || !Array.isArray(residents)) continue
    map.set(t.unit_id, (map.get(t.unit_id) ?? 0) + residents.length)
  }
  return map
})

// unit_id → category_name[] (distinct installed categories per unit)
const unitInventoryMap = computed(() => {
  const map = new Map<string, string[]>()
  for (const row of (inventoryRaw.value ?? [])) {
    const unitId = (row as any).location_id as string | null
    const cat = (row as any).category_name as string | null
    if (!unitId || !cat) continue
    const list = map.get(unitId) ?? []
    if (!list.includes(cat)) list.push(cat)
    map.set(unitId, list)
  }
  return map
})

// ── Filter Option Lists ────────────────────────────────────────────────────

const bbOptions = computed(() => {
  const set = new Set<string>()
  for (const u of (allUnits.value ?? [])) {
    if (u.b_b) set.add(u.b_b)
  }
  return [...set].sort((a, b) => {
    const [a1, a2] = a.split('x').map(Number)
    const [b1, b2] = b.split('x').map(Number)
    return a1 !== b1 ? a1 - b1 : a2 - b2
  })
})

// Distinct SF values — radio (exact match)
const sfOptions = computed(() => {
  const set = new Set<number>()
  for (const u of (allUnits.value ?? [])) {
    if (u.sf != null) set.add(u.sf)
  }
  return [...set].sort((a, b) => a - b)
})

const floorPlanOptions = computed(() => {
  const set = new Set<string>()
  for (const u of (allUnits.value ?? [])) {
    if (u.floor_plan_marketing_name) set.add(u.floor_plan_marketing_name)
  }
  return [...set].sort()
})

const floorLevelOptions = computed(() => {
  const set = new Set<number>()
  for (const u of (allUnits.value ?? [])) {
    if (u.floor_number != null) set.add(u.floor_number)
  }
  return [...set].sort((a, b) => a - b)
})

const buildingOptions = computed(() => {
  const set = new Set<string>()
  for (const u of (allUnits.value ?? [])) {
    if (u.building_name) set.add(u.building_name)
  }
  return [...set].sort()
})

// Inventory category options — empty until data exists, auto-populates as installs are added
const inventoryCategoryOptions = computed(() => {
  const set = new Set<string>()
  for (const cats of unitInventoryMap.value.values()) {
    for (const cat of cats) set.add(cat)
  }
  return [...set].sort()
})

const tenancyStatusOptions = ['Current', 'Future', 'Notice', 'Past']
const residentCountOptions = ['0', '1', '2', '3', '4', '5', '6', '7+']

// Options sourced from the amenities CATALOG for the active property.
// unitAmenitiesMap is NOT used here — we show all defined amenities regardless of
// whether any unit currently has them applied (fixes missing options on other properties).
function buildAmenityOptions(type: string) {
  return computed(() =>
    (propertyAmenitiesRaw.value ?? [])
      .filter(a => a.type?.toLowerCase() === type.toLowerCase())
      .map(a => ({ id: a.id, name: a.yardi_name }))
  )
}

const fixedAmenityOptions = buildAmenityOptions('fixed')
const premiumAmenityOptions = buildAmenityOptions('premium')
const discountAmenityOptions = buildAmenityOptions('discount')

// ── Section Expand / Collapse — default ALL collapsed ─────────────────────

const SECTION_KEYS = ['bb', 'sf', 'floorPlan', 'floor', 'residents', 'tenancy', 'building', 'inventory', 'fixed', 'premium', 'discount'] as const

const expanded = ref<Record<string, boolean>>(
  Object.fromEntries(SECTION_KEYS.map(k => [k, false]))
)

function toggleSection(key: string) {
  expanded.value[key] = !expanded.value[key]
}

const allExpanded = computed(() => SECTION_KEYS.every(k => expanded.value[k]))

function toggleAllSections() {
  const target = !allExpanded.value
  for (const key of SECTION_KEYS) {
    expanded.value[key] = target
  }
}

// ── Active Filter State ────────────────────────────────────────────────────

const searchText = ref('')
const filterBB = ref<string[]>([])
const filterSF = ref<number | null>(null)
const filterFloorPlans = ref<string[]>([])
const filterFloors = ref<number[]>([])
const filterResidentCounts = ref<string[]>([])
const filterTenancyStatuses = ref<string[]>([])
const filterBuildings = ref<string[]>([])
const filterInventoryCategories = ref<string[]>([])
const filterFixedAmenities = ref<string[]>([])
const filterPremiumAmenities = ref<string[]>([])
const filterDiscountAmenities = ref<string[]>([])

const activeFilterCount = computed(() => {
  let n = 0
  if (searchText.value) n++
  if (filterBB.value.length) n++
  if (filterSF.value !== null) n++
  if (filterFloorPlans.value.length) n++
  if (filterFloors.value.length) n++
  if (filterResidentCounts.value.length) n++
  if (filterTenancyStatuses.value.length) n++
  if (filterBuildings.value.length) n++
  if (filterInventoryCategories.value.length) n++
  if (filterFixedAmenities.value.length) n++
  if (filterPremiumAmenities.value.length) n++
  if (filterDiscountAmenities.value.length) n++
  return n
})

const clearAllFilters = () => {
  searchText.value = ''
  filterBB.value = []
  filterSF.value = null
  filterFloorPlans.value = []
  filterFloors.value = []
  filterResidentCounts.value = []
  filterTenancyStatuses.value = []
  filterBuildings.value = []
  filterInventoryCategories.value = []
  filterFixedAmenities.value = []
  filterPremiumAmenities.value = []
  filterDiscountAmenities.value = []
}

// ── Active filter chips (one per selected value — mirrors New Balance pattern) ──

type FilterChip = { key: string; label: string; remove: () => void }

const activeChips = computed((): FilterChip[] => {
  const chips: FilterChip[] = []

  if (searchText.value) {
    chips.push({ key: 'search', label: `"${searchText.value}"`, remove: () => { searchText.value = '' } })
  }

  for (const v of filterBB.value) {
    chips.push({ key: `bb-${v}`, label: v, remove: () => { filterBB.value = filterBB.value.filter(x => x !== v) } })
  }

  if (filterSF.value !== null) {
    const sf = filterSF.value
    chips.push({ key: 'sf', label: `${sf.toLocaleString()} SF`, remove: () => { filterSF.value = null } })
  }

  for (const v of filterFloorPlans.value) {
    chips.push({ key: `fp-${v}`, label: v, remove: () => { filterFloorPlans.value = filterFloorPlans.value.filter(x => x !== v) } })
  }

  for (const v of filterFloors.value) {
    chips.push({ key: `fl-${v}`, label: `Floor ${v}`, remove: () => { filterFloors.value = filterFloors.value.filter(x => x !== v) } })
  }

  for (const v of filterResidentCounts.value) {
    chips.push({ key: `rc-${v}`, label: `${v} resident${v === '1' ? '' : 's'}`, remove: () => { filterResidentCounts.value = filterResidentCounts.value.filter(x => x !== v) } })
  }

  for (const v of filterTenancyStatuses.value) {
    chips.push({ key: `ts-${v}`, label: v, remove: () => { filterTenancyStatuses.value = filterTenancyStatuses.value.filter(x => x !== v) } })
  }

  for (const v of filterBuildings.value) {
    chips.push({ key: `bld-${v}`, label: v, remove: () => { filterBuildings.value = filterBuildings.value.filter(x => x !== v) } })
  }

  for (const v of filterInventoryCategories.value) {
    chips.push({ key: `inv-${v}`, label: v, remove: () => { filterInventoryCategories.value = filterInventoryCategories.value.filter(x => x !== v) } })
  }

  // Amenities: resolve UUID → display name
  const fixedMap = new Map(fixedAmenityOptions.value.map(a => [a.id, a.name]))
  for (const id of filterFixedAmenities.value) {
    chips.push({ key: `fa-${id}`, label: fixedMap.get(id) ?? id, remove: () => { filterFixedAmenities.value = filterFixedAmenities.value.filter(x => x !== id) } })
  }

  const premiumMap = new Map(premiumAmenityOptions.value.map(a => [a.id, a.name]))
  for (const id of filterPremiumAmenities.value) {
    chips.push({ key: `pa-${id}`, label: premiumMap.get(id) ?? id, remove: () => { filterPremiumAmenities.value = filterPremiumAmenities.value.filter(x => x !== id) } })
  }

  const discountMap = new Map(discountAmenityOptions.value.map(a => [a.id, a.name]))
  for (const id of filterDiscountAmenities.value) {
    chips.push({ key: `da-${id}`, label: discountMap.get(id) ?? id, remove: () => { filterDiscountAmenities.value = filterDiscountAmenities.value.filter(x => x !== id) } })
  }

  return chips
})

// ── Toggle helpers ─────────────────────────────────────────────────────────

function toggleStringFilter(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

function toggleNumberFilter(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

// ── Filtered Results ───────────────────────────────────────────────────────

const filteredUnits = computed(() => {
  const units = allUnits.value ?? []
  return units.filter(u => {
    // Text search
    if (searchText.value) {
      const q = searchText.value.toLowerCase()
      const hit =
        u.unit_name?.toLowerCase().includes(q) ||
        u.building_name?.toLowerCase().includes(q) ||
        u.resident_name?.toLowerCase().includes(q) ||
        u.floor_plan_marketing_name?.toLowerCase().includes(q) ||
        u.tenancy_status?.toLowerCase().includes(q)
      if (!hit) return false
    }

    // Bed/Bath
    if (filterBB.value.length && !filterBB.value.includes(u.b_b)) return false

    // SF — exact match via radio
    if (filterSF.value !== null && u.sf !== filterSF.value) return false

    // Floor plan
    if (filterFloorPlans.value.length && !filterFloorPlans.value.includes(u.floor_plan_marketing_name)) return false

    // Floor level
    if (filterFloors.value.length && !filterFloors.value.includes(u.floor_number)) return false

    // Tenancy status
    if (filterTenancyStatuses.value.length && !filterTenancyStatuses.value.includes(u.tenancy_status)) return false

    // Building
    if (filterBuildings.value.length && !filterBuildings.value.includes(u.building_name)) return false

    // Resident count
    if (filterResidentCounts.value.length) {
      const count = residentCountMap.value.get(u.id) ?? 0
      const match = filterResidentCounts.value.some(slot =>
        slot === '7+' ? count >= 7 : count === parseInt(slot)
      )
      if (!match) return false
    }

    // Inventory categories — OR: unit has at least one of the selected categories
    if (filterInventoryCategories.value.length) {
      const unitCats = unitInventoryMap.value.get(u.id) ?? []
      if (!filterInventoryCategories.value.some(cat => unitCats.includes(cat))) return false
    }

    // Fixed amenities — OR: unit has at least one of the selected
    if (filterFixedAmenities.value.length) {
      const ids = new Set((unitAmenitiesMap.value.get(u.id) ?? []).map(a => a.id))
      if (!filterFixedAmenities.value.some(id => ids.has(id))) return false
    }

    // Premium amenities — OR
    if (filterPremiumAmenities.value.length) {
      const ids = new Set((unitAmenitiesMap.value.get(u.id) ?? []).map(a => a.id))
      if (!filterPremiumAmenities.value.some(id => ids.has(id))) return false
    }

    // Discount amenities — OR
    if (filterDiscountAmenities.value.length) {
      const ids = new Set((unitAmenitiesMap.value.get(u.id) ?? []).map(a => a.id))
      if (!filterDiscountAmenities.value.some(id => ids.has(id))) return false
    }

    return true
  })
})

// ── Table config ───────────────────────────────────────────────────────────

const columns = computed<TableColumn[]>(() => {
  return filterColumnsByAccess(allColumns, {
    userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
    userDepartment: userContext.value?.profile?.department,
    isSuperAdmin: !!userContext.value?.access?.is_super_admin,
    filterGroup: 'all'
  })
})

const tenancyStatusColors: Record<string, string> = {
  Current: 'primary',
  Past: 'error',
  Future: 'primary',
  Notice: 'warning'
}

const handleRowClick = (row: any) => {
  if (row?.id) navigateTo(`/assets/units/${row.id}`)
}
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
        <!-- Row 1: title + expand/collapse toggle -->
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-gray-900 dark:text-white text-sm">Filters</span>
          <button
            class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
            @click="toggleAllSections"
          >
            {{ allExpanded ? 'Collapse All' : 'Expand All' }}
          </button>
        </div>
        <!-- Row 2: search input -->
        <UInput
          v-model="searchText"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search units..."
          size="sm"
        />
        <!-- Row 3: Selected Filters chips — only shown when something is active -->
        <div v-if="activeChips.length" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Selected Filters</span>
            <button
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
              @click="clearAllFilters"
            >
              Clear all
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="chip in activeChips"
              :key="chip.key"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/50"
              @click="chip.remove()"
            >
              <span>{{ chip.label }}</span>
              <span class="text-primary-400 dark:text-primary-500 font-bold leading-none ml-0.5">×</span>
            </button>
          </div>
        </div>
      </div>

      <!-- No property selected -->
      <div v-if="!activeProperty" class="p-4 text-sm text-gray-400 italic">
        Select a property to load filters.
      </div>

      <!-- Scrollable filter sections -->
      <div v-else class="flex-1 overflow-y-auto">

        <!-- ─ Bed / Bath ─────────────────────────────────────────────────── -->
        <div v-if="bbOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('bb')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Bed / Bath
              <span v-if="filterBB.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterBB.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.bb ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.bb" class="px-4 pb-3 space-y-1.5">
            <label
              v-for="opt in bbOptions"
              :key="opt"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="filterBB.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterBB = toggleStringFilter(filterBB, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white font-mono">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- ─ Square Feet (radio — exact) ───────────────────────────────── -->
        <div v-if="sfOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('sf')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Square Feet
              <span v-if="filterSF !== null" class="ml-1 text-primary-500 normal-case font-normal font-mono">({{ filterSF.toLocaleString() }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.sf ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.sf" class="px-4 pb-3 space-y-1.5">
            <label class="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                :value="null"
                :checked="filterSF === null"
                name="sf-radio"
                class="border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterSF = null"
              />
              <span class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 italic">Any</span>
            </label>
            <label
              v-for="sf in sfOptions"
              :key="sf"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="radio"
                :value="sf"
                :checked="filterSF === sf"
                name="sf-radio"
                class="border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterSF = sf"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white font-mono">{{ sf.toLocaleString() }} SF</span>
            </label>
          </div>
        </div>

        <!-- ─ Floor Plan ─────────────────────────────────────────────────── -->
        <div v-if="floorPlanOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('floorPlan')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Floor Plan
              <span v-if="filterFloorPlans.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterFloorPlans.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.floorPlan ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.floorPlan" class="px-4 pb-3 space-y-1.5">
            <label
              v-for="opt in floorPlanOptions"
              :key="opt"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="filterFloorPlans.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterFloorPlans = toggleStringFilter(filterFloorPlans, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- ─ Floor Level ─────────────────────────────────────────────────── -->
        <div v-if="floorLevelOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('floor')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Floor Level
              <span v-if="filterFloors.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterFloors.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.floor ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.floor" class="px-4 pb-3">
            <div class="flex flex-wrap gap-1">
              <button
                v-for="floor in floorLevelOptions"
                :key="floor"
                class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors"
                :class="filterFloors.includes(floor)
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'"
                @click="filterFloors = toggleNumberFilter(filterFloors, floor)"
              >
                {{ floor }}
              </button>
            </div>
          </div>
        </div>

        <!-- ─ Number of Residents ─────────────────────────────────────────── -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('residents')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Residents
              <span v-if="filterResidentCounts.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterResidentCounts.join(', ') }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.residents ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.residents" class="px-4 pb-3">
            <div class="flex flex-wrap gap-1">
              <button
                v-for="opt in residentCountOptions"
                :key="opt"
                class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors"
                :class="filterResidentCounts.includes(opt)
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'"
                @click="filterResidentCounts = toggleStringFilter(filterResidentCounts, opt)"
              >
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        <!-- ─ Tenancy Status ──────────────────────────────────────────────── -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('tenancy')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Tenancy Status
              <span v-if="filterTenancyStatuses.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterTenancyStatuses.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.tenancy ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.tenancy" class="px-4 pb-3 space-y-1.5">
            <label
              v-for="opt in tenancyStatusOptions"
              :key="opt"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="filterTenancyStatuses.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterTenancyStatuses = toggleStringFilter(filterTenancyStatuses, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- ─ Building ────────────────────────────────────────────────────── -->
        <div v-if="buildingOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('building')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Building
              <span v-if="filterBuildings.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterBuildings.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.building ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.building" class="px-4 pb-3 space-y-1.5">
            <label
              v-for="opt in buildingOptions"
              :key="opt"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="filterBuildings.includes(opt)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterBuildings = toggleStringFilter(filterBuildings, opt)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- ─ Inventory ───────────────────────────────────────────────────── -->
        <!-- Section always visible — empty state shown until installs exist -->
        <div class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('inventory')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Inventory
              <span v-if="filterInventoryCategories.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterInventoryCategories.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.inventory ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.inventory" class="px-4 pb-3">
            <div v-if="inventoryCategoryOptions.length" class="space-y-1.5">
              <label
                v-for="opt in inventoryCategoryOptions"
                :key="opt"
                class="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  :checked="filterInventoryCategories.includes(opt)"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                  @change="filterInventoryCategories = toggleStringFilter(filterInventoryCategories, opt)"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">{{ opt }}</span>
              </label>
            </div>
            <p v-else class="text-xs text-gray-400 dark:text-gray-500 italic py-1">
              No inventory installed in this property yet.
            </p>
          </div>
        </div>

        <!-- ─ Fixed Amenities ─────────────────────────────────────────────── -->
        <div v-if="fixedAmenityOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('fixed')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Fixed Amenities
              <span v-if="filterFixedAmenities.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterFixedAmenities.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.fixed ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.fixed" class="px-4 pb-3 space-y-1.5">
            <label
              v-for="opt in fixedAmenityOptions"
              :key="opt.id"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="filterFixedAmenities.includes(opt.id)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterFixedAmenities = toggleStringFilter(filterFixedAmenities, opt.id)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">{{ opt.name }}</span>
            </label>
          </div>
        </div>

        <!-- ─ Premium Amenities ───────────────────────────────────────────── -->
        <div v-if="premiumAmenityOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('premium')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Premium Amenities
              <span v-if="filterPremiumAmenities.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterPremiumAmenities.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.premium ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.premium" class="px-4 pb-3 space-y-1.5">
            <label
              v-for="opt in premiumAmenityOptions"
              :key="opt.id"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="filterPremiumAmenities.includes(opt.id)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterPremiumAmenities = toggleStringFilter(filterPremiumAmenities, opt.id)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">{{ opt.name }}</span>
            </label>
          </div>
        </div>

        <!-- ─ Discount Amenities ──────────────────────────────────────────── -->
        <div v-if="discountAmenityOptions.length" class="border-b border-gray-100 dark:border-gray-800">
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            @click="toggleSection('discount')"
          >
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Discount Amenities
              <span v-if="filterDiscountAmenities.length" class="ml-1 text-primary-500 normal-case font-normal">({{ filterDiscountAmenities.length }})</span>
            </span>
            <span class="text-sm font-medium text-gray-400 w-4 text-center select-none leading-none">
              {{ expanded.discount ? '−' : '+' }}
            </span>
          </button>
          <div v-show="expanded.discount" class="px-4 pb-3 space-y-1.5">
            <label
              v-for="opt in discountAmenityOptions"
              :key="opt.id"
              class="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="filterDiscountAmenities.includes(opt.id)"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                @change="filterDiscountAmenities = toggleStringFilter(filterDiscountAmenities, opt.id)"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">{{ opt.name }}</span>
            </label>
          </div>
        </div>

      </div>
    </aside>

    <!-- ── Right Content ──────────────────────────────────────────────────── -->
    <main class="flex-1 min-w-0 p-6">
      <div class="mb-5 flex items-center justify-between">
        <div class="flex items-baseline gap-3">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Unit Search</h1>
          <span class="text-lg text-gray-500 font-medium">
            &middot; {{ filteredUnits.length }} {{ filteredUnits.length === 1 ? 'unit' : 'units' }}
          </span>
          <span v-if="allUnits && filteredUnits.length < allUnits.length" class="text-sm text-gray-400">
            of {{ allUnits.length }} total
          </span>
        </div>
        <UButton
          icon="i-heroicons-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="navigateTo('/assets/units')"
        >
          Back to Units
        </UButton>
      </div>

      <GenericDataTable
        :data="filteredUnits"
        :columns="columns"
        :loading="status === 'pending'"
        row-key="id"
        enable-pagination
        :page-size="50"
        default-sort-field="unit_name"
        clickable
        striped
        enable-export
        export-filename="unit-search"
        @row-click="handleRowClick"
      >
        <template #cell-unit_name="{ value, row }">
          <CellsLinkCell :value="value" :to="`/assets/units/${row.id}`" />
        </template>

        <template #cell-building_name="{ value, row }">
          <CellsLinkCell v-if="value" :value="value" :to="`/assets/buildings/${row.building_id}`" />
          <span v-else>-</span>
        </template>

        <template #cell-floor_plan_marketing_name="{ value, row }">
          <CellsLinkCell v-if="value" :value="value" :to="`/assets/floor-plans/${row.floor_plan_id}`" />
          <span v-else>-</span>
        </template>

        <template #cell-tenancy_status="{ value }">
          <CellsBadgeCell
            v-if="value"
            :text="value"
            :color="tenancyStatusColors[value] || 'neutral'"
            variant="outline"
          />
          <span v-else class="text-gray-400">-</span>
        </template>

        <template #cell-sf="{ value, row }">
          <CellsLinkCell
            v-if="value"
            :value="value.toLocaleString()"
            :to="`/assets/floor-plans/${row.floor_plan_id}`"
            class="text-gray-600"
          />
          <span v-else class="text-gray-400">-</span>
        </template>

        <template #cell-resident_name="{ value, row }">
          <div v-if="value" class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
            <CellsLinkCell :value="value" :to="`/office/residents/${row.resident_id}`" class="text-gray-600 font-medium" />
          </div>
          <span v-else class="text-gray-400 italic text-xs">Vacant</span>
        </template>

        <template #cell-move_in_date="{ value }">
          <span v-if="value" class="text-sm text-gray-600 font-mono">
            {{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>

        <template #cell-move_out_date="{ value }">
          <span v-if="value" class="text-sm text-gray-600 font-mono">
            {{ new Date(value).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }}
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>
      </GenericDataTable>
    </main>

  </div>
</template>
