<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePropertyState } from '../../composables/usePropertyState'
import { useTourSelection, MAX_TOUR_SLOTS } from '../../composables/useTourSelection'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'

definePageMeta({
  layout: 'tour',
  middleware: 'auth'
})

const { activeProperty } = usePropertyState()
const supabase = useSupabaseClient()
const { selectedUnits, activeUnit, isSelected, isFull, toggle, setActive, clear } = useTourSelection()

const isHydrated = ref(false)
onMounted(() => { isHydrated.value = true })

const statusFilter = ref<'Available' | 'Applied' | 'All'>('Available')

const { data: allUnits, pending } = await useAsyncData(
  () => `tour-avail-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return []
    const { data } = await supabase
      .from('view_leasing_pipeline')
      .select('unit_name, floor_plan_name, b_b, sf, rent_offered, available_date, status, building_name, vacant_days')
      .eq('property_code', activeProperty.value)
      .order('available_date', { ascending: true })
    return data || []
  },
  { watch: [activeProperty] }
)

// Deduplicate by unit_name (view can return multiple rows per unit)
const deduped = computed(() => {
  if (!allUnits.value) return []
  const seen = new Set<string>()
  return allUnits.value.filter((u: any) => {
    if (seen.has(u.unit_name)) return false
    seen.add(u.unit_name)
    return true
  })
})

const units = computed(() => {
  if (statusFilter.value === 'All')
    return deduped.value.filter((u: any) => ['Available', 'Applied'].includes(u.status))
  return deduped.value.filter((u: any) => u.status === statusFilter.value)
})

const tabCount = (opt: string) =>
  deduped.value.filter((u: any) =>
    opt === 'All' ? ['Available', 'Applied'].includes(u.status) : u.status === opt
  ).length

// Slot array — always MAX_TOUR_SLOTS entries, null = empty
const slots = computed(() =>
  Array.from({ length: MAX_TOUR_SLOTS }, (_, i) => selectedUnits.value[i] ?? null)
)

const unitByCode = (code: string) =>
  allUnits.value?.find((u: any) => u.unit_name === code) ?? null

const activeUnitData = computed(() =>
  activeUnit.value ? unitByCode(activeUnit.value) : null
)

const STATUS_SLOT = {
  Available: {
    active:   'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.02]',
    inactive: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400',
  },
  Applied: {
    active:   'bg-sky-500 border-sky-500 text-white shadow-lg scale-[1.02]',
    inactive: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:border-sky-400',
  },
} as const

const slotClass = (code: string, isActive: boolean) => {
  const status = unitByCode(code)?.status as keyof typeof STATUS_SLOT | undefined
  const map = STATUS_SLOT[status ?? 'Available'] ?? STATUS_SLOT.Available
  return isActive ? map.active : map.inactive
}

const STATUS_BADGE = {
  Available: 'bg-emerald-500 text-white',
  Applied:   'bg-sky-500 text-white',
} as const

const badgeClass = (status: string) =>
  STATUS_BADGE[status as keyof typeof STATUS_BADGE] ?? 'bg-gray-400 text-white'

const today = new Date().toISOString().slice(0, 10)

const fmt = (n: number | null) => n != null ? `$${Number(n).toLocaleString()}` : '—'

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  if (d <= today) return 'Now'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">

    <!-- ── Shortlist Bar ───────────────────────────────────────── -->
    <div class="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Tour Shortlist</span>
        <span class="text-[10px] text-gray-300 dark:text-gray-600">{{ selectedUnits.length }}/{{ MAX_TOUR_SLOTS }}</span>
        <div class="ml-auto flex items-center gap-3">
          <span class="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Available
          </span>
          <span class="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400">
            <span class="w-2 h-2 rounded-full bg-sky-500 inline-block" />
            Applied
          </span>
        </div>
      </div>

      <div class="grid gap-2" :style="`grid-template-columns: repeat(${MAX_TOUR_SLOTS}, 1fr)`">
        <!-- Filled slot -->
        <button
          v-for="(code, i) in slots"
          :key="i"
          type="button"
          class="flex flex-col items-center justify-center rounded-xl border-2 px-2 py-2 transition-all min-w-0"
          :class="code ? slotClass(code, activeUnit === code) : 'border-dashed border-gray-200 dark:border-gray-700 cursor-default'"
          @click="code ? setActive(code) : undefined"
        >
          <template v-if="code">
            <span class="font-black text-sm truncate w-full text-center">{{ code }}</span>
            <span class="text-[10px] opacity-70 truncate w-full text-center">
              {{ fmt(unitByCode(code)?.rent_offered) }}
            </span>
          </template>
          <UIcon v-else name="i-heroicons-plus" class="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </button>
      </div>

      <p v-if="isHydrated && isFull" class="text-[10px] text-amber-500 font-medium mt-2">
        Shortlist full — remove a unit to add another.
      </p>
    </div>

    <!-- ── Filter Tabs + Clear All ──────────────────────────── -->
    <div class="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800">
      <button
        v-for="opt in (['Available', 'Applied', 'All'] as const)"
        :key="opt"
        type="button"
        class="px-3 py-1 rounded-full text-xs font-bold border transition-all"
        :class="statusFilter === opt
          ? 'bg-primary-500 text-white border-primary-500'
          : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-400'"
        @click="statusFilter = opt"
      >
        {{ opt }}
        <span class="ml-1 opacity-60 font-normal">{{ tabCount(opt) }}</span>
      </button>

      <UButton
        v-if="isHydrated && selectedUnits.length > 0"
        label="Clear Shortlist"
        color="error"
        variant="soft"
        size="xs"
        class="ml-auto"
        @click="clear"
      />
    </div>

    <!-- ── Split View ─────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Left: Unit List (40%) -->
      <div class="w-[40%] flex-shrink-0 overflow-auto border-r border-gray-200 dark:border-gray-800">

        <!-- Loading -->
        <div v-if="pending" class="p-4 space-y-2">
          <div v-for="i in 8" :key="i" class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>

        <!-- Empty -->
        <div v-else-if="!units.length" class="flex flex-col items-center justify-center py-12 text-gray-400">
          <UIcon name="i-heroicons-building-office-2" class="w-8 h-8 mb-2 opacity-30" />
          <p class="text-xs">No units match this filter.</p>
        </div>

        <!-- Table -->
        <table v-else class="w-full text-sm">
          <thead class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
            <tr>
              <th class="w-8 px-2 py-2"></th>
              <th class="text-left px-2 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Unit</th>
              <th class="text-center px-2 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Bed</th>
              <th class="text-right px-2 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Rent</th>
              <th class="text-center px-2 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Avail</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="unit in units"
              :key="unit.unit_name"
              class="border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors"
              :class="activeUnit === unit.unit_name
                ? 'bg-primary-50 dark:bg-primary-950/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'"
              @click="setActive(unit.unit_name)"
            >
              <!-- Shortlist toggle -->
              <td class="px-2 py-2.5 text-center" @click.stop="toggle(unit.unit_name)">
                <div
                  class="w-6 h-6 rounded-md flex items-center justify-center transition-all mx-auto"
                  :class="isSelected(unit.unit_name)
                    ? unit.status === 'Applied' ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'
                    : isFull
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 cursor-not-allowed'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-900/30'"
                >
                  <UIcon
                    :name="isSelected(unit.unit_name) ? 'i-heroicons-check' : 'i-heroicons-plus'"
                    class="w-3 h-3"
                  />
                </div>
              </td>
              <td class="px-2 py-2.5 font-black text-xs text-gray-900 dark:text-white whitespace-nowrap">
                {{ unit.unit_name }}
              </td>
              <td class="px-2 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">
                {{ unit.b_b || '—' }}
              </td>
              <td class="px-2 py-2.5 text-right font-bold text-xs text-gray-900 dark:text-white whitespace-nowrap">
                {{ fmt(unit.rent_offered) }}
              </td>
              <td class="px-2 py-2.5 text-center text-xs text-gray-400 whitespace-nowrap">
                {{ fmtDate(unit.available_date) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Right: Detail Panel (60%) -->
      <div class="flex-1 overflow-auto">

        <!-- No unit selected -->
        <div
          v-if="!activeUnitData"
          class="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-3"
        >
          <UIcon name="i-heroicons-cursor-arrow-rays" class="w-12 h-12" />
          <p class="text-sm font-medium">Select a unit to view details</p>
        </div>

        <!-- Unit detail -->
        <div v-else class="flex flex-col h-full">

          <!-- Photo placeholder -->
          <div class="h-52 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-950/40 dark:to-primary-900/30 flex items-center justify-center flex-shrink-0 relative">
            <UIcon name="i-heroicons-photo" class="w-14 h-14 text-primary-200 dark:text-primary-800" />
          </div>

          <!-- Detail content -->
          <div class="p-6 space-y-6 flex-1 overflow-auto">

            <!-- Unit header -->
            <div>
              <h2 class="text-2xl font-black text-gray-900 dark:text-white">{{ activeUnitData.unit_name }}</h2>
              <p class="text-sm text-gray-400 mt-0.5">{{ activeUnitData.floor_plan_name || 'Floor plan N/A' }}</p>
              <p v-if="activeUnitData.building_name" class="text-xs text-gray-400">{{ activeUnitData.building_name }}</p>
            </div>

            <!-- Key stats grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Rent</p>
                <p class="text-xl font-black text-gray-900 dark:text-white">{{ fmt(activeUnitData.rent_offered) }}</p>
                <p class="text-[10px] text-gray-400">/month</p>
              </div>
              <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Available</p>
                <p class="text-xl font-black text-gray-900 dark:text-white">{{ fmtDate(activeUnitData.available_date) }}</p>
                <p class="text-[10px] text-gray-400">move-in date</p>
              </div>
              <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Layout</p>
                <p class="text-xl font-black text-gray-900 dark:text-white">{{ activeUnitData.b_b || '—' }}</p>
                <p class="text-[10px] text-gray-400">bed / bath</p>
              </div>
              <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Size</p>
                <p class="text-xl font-black text-gray-900 dark:text-white">
                  {{ activeUnitData.sf ? Number(activeUnitData.sf).toLocaleString() : '—' }}
                </p>
                <p class="text-[10px] text-gray-400">sq ft</p>
              </div>
            </div>

            <!-- Shortlist action -->
            <div>
              <UButton
                v-if="isSelected(activeUnitData.unit_name)"
                icon="i-heroicons-check"
                label="Remove from Tour Shortlist"
                color="primary"
                variant="soft"
                size="lg"
                class="w-full justify-center"
                @click="toggle(activeUnitData.unit_name)"
              />
              <UButton
                v-else-if="!isFull"
                icon="i-heroicons-plus"
                label="Add to Tour Shortlist"
                color="primary"
                variant="solid"
                size="lg"
                class="w-full justify-center"
                @click="toggle(activeUnitData.unit_name)"
              />
              <p v-else class="text-xs text-center text-amber-500 font-medium py-2">
                Shortlist full — remove a unit to add this one.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>

  </div>
</template>
