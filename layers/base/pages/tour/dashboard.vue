<script setup lang="ts">
import { computed } from 'vue'
import { usePropertyState } from '../../composables/usePropertyState'
import { useTourState, MAX_TOUR_SLOTS } from '../../composables/useTourState'
import { useSupabaseClient, useAsyncData, definePageMeta, navigateTo } from '#imports'

definePageMeta({
  layout: 'tour',
  middleware: 'auth',
})

const { activeProperty, userContext } = usePropertyState()
const supabase = useSupabaseClient()
const { shortlist, activeUnitId, isPresenting } = useTourState()

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

// ── Active property record (drives Page 4 neighborhood links) ──────────
const { data: propertyRecord } = await useAsyncData(
  () => `tour-property-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return null
    const { data } = await supabase
      .from('properties')
      .select('name, street_address, city, state_code, postal_code, latitude, longitude, website_url, instagram_url, facebook_url, site_map_url, walk_score_id')
      .eq('code', activeProperty.value)
      .single()
    return data || null
  },
  { watch: [activeProperty] }
)

const propertyAddress = computed(() => {
  const p = propertyRecord.value
  if (!p) return undefined
  return [p.street_address, p.city, p.state_code, p.postal_code].filter(Boolean).join(', ')
})

// ── Shortlist unit details ─────────────────────────────────────────────
const { data: shortlistData } = await useAsyncData(
  () => `tour-shortlist-${activeProperty.value}-${shortlist.value.join(',')}`,
  async () => {
    if (!shortlist.value.length || !activeProperty.value) return []
    const { data } = await supabase
      .from('view_leasing_pipeline')
      .select('unit_id, unit_name, floor_plan_name, b_b, sf, rent_offered, available_date, status, building_name, vacant_days')
      .eq('property_code', activeProperty.value)
      .in('unit_name', shortlist.value)
    return data || []
  },
  { watch: [shortlist, activeProperty] }
)

const activeUnitData = computed(() => {
  if (!activeUnitId.value || !shortlistData.value) return null
  return shortlistData.value.find((u: any) => u.unit_name === activeUnitId.value) ?? null
})

const propertyName = computed(() => activeProperty.value || 'Property')

const rentRange = computed(() => {
  if (!stats.value) return '—'
  const { minRent, maxRent } = stats.value
  if (!minRent) return '—'
  const f = (n: number) => `$${n.toLocaleString()}`
  return minRent === maxRent ? f(minRent) : `${f(minRent)} – ${f(maxRent)}`
})
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
      <template v-if="shortlist.length > 0">

        <!-- Shortlist bar — hidden in Presentation Mode to maximise dossier canvas -->
        <TourShortlist
          v-if="!isPresenting"
          :shortlist-data="shortlistData ?? []"
        />

        <!-- Unit detail area -->
        <div class="flex-1 overflow-hidden">

          <!-- No unit active yet -->
          <div
            v-if="!activeUnitData"
            class="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-3"
          >
            <UIcon name="i-heroicons-cursor-arrow-rays" class="w-12 h-12" />
            <p class="text-sm font-medium">Tap a unit above to open its dossier</p>
          </div>

          <!-- Unit Dossier (4-page swipeable component) -->
          <!-- Auto-imported as TourUnitDossier (layers/base/components/tour/UnitDossier.vue) -->
          <TourUnitDossier
            v-else
            :unit="activeUnitData"
            :property-address="propertyAddress"
            :walk-score-id="propertyRecord?.walk_score_id"
            :latitude="propertyRecord?.latitude"
            :longitude="propertyRecord?.longitude"
            :website-url="propertyRecord?.website_url"
            :instagram-url="propertyRecord?.instagram_url"
            :facebook-url="propertyRecord?.facebook_url"
            :site-map-url="propertyRecord?.site_map_url"
          />

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
