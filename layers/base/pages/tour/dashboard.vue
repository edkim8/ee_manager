<script setup lang="ts">
import { computed } from 'vue'
import { usePropertyState } from '../../composables/usePropertyState'
import { useTourSelection, MAX_TOUR_SLOTS } from '../../composables/useTourSelection'
import { useSupabaseClient, useAsyncData, definePageMeta, navigateTo } from '#imports'

definePageMeta({
  layout: 'tour',
  middleware: 'auth',
})

const { activeProperty, userContext } = usePropertyState()
const supabase = useSupabaseClient()
const { selectedUnits, activeUnit, isSelected, isFull, toggle, setActive } = useTourSelection()

const isMaintenance = computed(() => userContext.value?.profile?.department === 'Maintenance')


// ── Property stats (shown when no shortlist selected) ──────────────────
const { data: stats } = await useAsyncData(
  () => `tour-stats-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return null
    const { data } = await supabase
      .from('view_leasing_pipeline')
      .select('status, rent_offered')
      .eq('property_code', activeProperty.value)
    if (!data || data.length === 0) return { count: 0, minRent: null, maxRent: null }
    const available = data.filter((r: any) => ['Available', 'Applied'].includes(r.status))
    const rents = available.map((r: any) => r.rent_offered).filter(Boolean)
    return {
      count: available.length,
      minRent: rents.length ? Math.min(...rents) : null,
      maxRent: rents.length ? Math.max(...rents) : null,
    }
  },
  { watch: [activeProperty] }
)

// ── Selected unit details (fetched only when shortlist has entries) ─────
const { data: shortlistData } = await useAsyncData(
  () => `tour-shortlist-${activeProperty.value}-${selectedUnits.value.join(',')}`,
  async () => {
    if (!selectedUnits.value.length || !activeProperty.value) return []
    const { data } = await supabase
      .from('view_leasing_pipeline')
      .select('unit_name, floor_plan_name, b_b, sf, rent_offered, available_date, status, building_name')
      .eq('property_code', activeProperty.value)
      .in('unit_name', selectedUnits.value)
    return data || []
  },
  { watch: [selectedUnits, activeProperty] }
)

const activeUnitData = computed(() => {
  if (!activeUnit.value || !shortlistData.value) return null
  return shortlistData.value.find((u: any) => u.unit_name === activeUnit.value) ?? null
})

const propertyName = computed(() => activeProperty.value || 'Property')

const today = new Date().toISOString().slice(0, 10)

const fmt = (n: number | null) => n != null ? `$${Number(n).toLocaleString()}` : '—'

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  if (d <= today) return 'Now'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const rentRange = computed(() => {
  if (!stats.value) return '—'
  const { minRent, maxRent } = stats.value
  if (!minRent) return '—'
  const f = (n: number) => `$${n.toLocaleString()}`
  return minRent === maxRent ? f(minRent) : `${f(minRent)} – ${f(maxRent)}`
})

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
  const status = shortlistData.value?.find((u: any) => u.unit_name === code)?.status as keyof typeof STATUS_SLOT | undefined
  const map = STATUS_SLOT[status ?? 'Available'] ?? STATUS_SLOT.Available
  return isActive ? map.active : map.inactive
}

const STATUS_BADGE = {
  Available: 'bg-emerald-500 text-white',
  Applied:   'bg-sky-500 text-white',
} as const

const badgeClass = (status: string) =>
  STATUS_BADGE[status as keyof typeof STATUS_BADGE] ?? 'bg-gray-400 text-white'
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">

    <!-- ── Maintenance placeholder ──────────────────────────── -->
    <template v-if="isMaintenance">
      <div class="flex-1 flex flex-col items-center justify-center p-8">
        <section class="rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 p-12 flex flex-col items-center text-center gap-4 max-w-md w-full">
          <UIcon name="i-heroicons-wrench-screwdriver" class="w-12 h-12 text-slate-400" />
          <div>
            <p class="font-black text-lg text-slate-600 dark:text-slate-300">Maintenance Tablet View</p>
            <p class="text-sm text-slate-400 mt-1">Coming soon — modules TBD</p>
          </div>
        </section>
      </div>
    </template>

    <!-- ── Tour companion view (non-Maintenance) ─────────────── -->
    <template v-else>

      <!-- Shortlist has units → tour companion mode -->
      <template v-if="selectedUnits.length > 0">

        <!-- Unit picker row -->
        <div class="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Units</span>
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
            <button
              v-for="(code, i) in Array.from({ length: MAX_TOUR_SLOTS }, (_, i) => selectedUnits[i] ?? null)"
              :key="i"
              type="button"
              class="flex flex-col items-center justify-center rounded-xl border-2 px-2 py-2.5 transition-all min-w-0"
              :class="code ? slotClass(code, activeUnit === code) : 'border-dashed border-gray-200 dark:border-gray-700 cursor-default'"
              @click="code ? setActive(code) : navigateTo('/tour/availabilities')"
            >
              <template v-if="code">
                <span class="font-black text-sm truncate w-full text-center">{{ code }}</span>
                <span class="text-[10px] opacity-70 truncate w-full text-center">
                  {{ fmt(shortlistData?.find((u: any) => u.unit_name === code)?.rent_offered) }}
                </span>
              </template>
              <UIcon v-else name="i-heroicons-plus" class="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </button>
          </div>
        </div>

        <!-- Unit detail area -->
        <div class="flex-1 overflow-auto">

          <!-- No unit active yet -->
          <div
            v-if="!activeUnitData"
            class="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-3"
          >
            <UIcon name="i-heroicons-cursor-arrow-rays" class="w-12 h-12" />
            <p class="text-sm font-medium">Tap a unit above to view details</p>
          </div>

          <!-- Unit detail -->
          <div v-else class="flex flex-col h-full">

            <!-- Photo placeholder -->
            <div class="h-56 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-950/40 dark:to-primary-900/30 flex items-center justify-center flex-shrink-0 relative">
              <UIcon name="i-heroicons-photo" class="w-14 h-14 text-primary-200 dark:text-primary-800" />
            </div>

            <!-- Detail content -->
            <div class="p-6 space-y-6">

              <!-- Unit header -->
              <div>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white">{{ activeUnitData.unit_name }}</h2>
                <p class="text-sm text-gray-400 mt-0.5">{{ activeUnitData.floor_plan_name || 'Floor plan N/A' }}</p>
                <p v-if="activeUnitData.building_name" class="text-xs text-gray-400">{{ activeUnitData.building_name }}</p>
              </div>

              <!-- Key stats -->
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Rent</p>
                  <p class="text-2xl font-black text-gray-900 dark:text-white">{{ fmt(activeUnitData.rent_offered) }}</p>
                  <p class="text-[10px] text-gray-400">/month</p>
                </div>
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Available</p>
                  <p class="text-2xl font-black text-gray-900 dark:text-white">{{ fmtDate(activeUnitData.available_date) }}</p>
                  <p class="text-[10px] text-gray-400">move-in date</p>
                </div>
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Layout</p>
                  <p class="text-2xl font-black text-gray-900 dark:text-white">{{ activeUnitData.b_b || '—' }}</p>
                  <p class="text-[10px] text-gray-400">bed / bath</p>
                </div>
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Size</p>
                  <p class="text-2xl font-black text-gray-900 dark:text-white">
                    {{ activeUnitData.sf ? Number(activeUnitData.sf).toLocaleString() : '—' }}
                  </p>
                  <p class="text-[10px] text-gray-400">sq ft</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </template>

      <!-- No shortlist yet → property overview + CTA ──────── -->
      <template v-else>
        <div class="flex-1 overflow-auto p-6 space-y-8">

          <!-- Property hero -->
          <section class="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white shadow-xl">
            <p class="text-primary-200 text-xs font-bold uppercase tracking-widest mb-1">Welcome to</p>
            <h1 class="text-3xl font-black tracking-tight mb-1">{{ propertyName }}</h1>
            <p class="text-primary-200 text-sm">Your new home starts here.</p>
          </section>

          <!-- At-a-glance stats -->
          <section class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Available Now</p>
              <p class="text-4xl font-black text-gray-900 dark:text-white">{{ stats?.count ?? '—' }}</p>
              <p class="text-xs text-gray-400 mt-1">units ready to view</p>
            </div>
            <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Starting From</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white leading-tight">{{ rentRange }}</p>
              <p class="text-xs text-gray-400 mt-1">per month</p>
            </div>
          </section>

          <!-- CTA to build shortlist -->
          <NuxtLink
            to="/tour/availabilities"
            class="flex items-center gap-4 p-5 rounded-2xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 hover:shadow-md active:scale-[0.98] transition-all"
          >
            <div class="w-12 h-12 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center shadow-inner flex-shrink-0">
              <UIcon name="i-heroicons-building-office-2" class="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p class="font-black text-sm text-gray-900 dark:text-white">Build Tour Shortlist</p>
              <p class="text-xs text-gray-400">Select up to {{ MAX_TOUR_SLOTS }} units to tour today</p>
            </div>
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-300 ml-auto" />
          </NuxtLink>

        </div>
      </template>

    </template>
  </div>
</template>
