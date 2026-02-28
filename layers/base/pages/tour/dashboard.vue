<script setup lang="ts">
import { computed } from 'vue'
import { usePropertyState } from '../../composables/usePropertyState'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'

definePageMeta({
  layout: 'tour',
  middleware: 'auth'
})

const { activeProperty, userContext } = usePropertyState()
const supabase = useSupabaseClient()

// Fetch all pipeline records, filter client-side (matches PC page pattern)
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

const isMaintenance = computed(() => userContext.value?.profile?.department === 'Maintenance')

const propertyName = computed(() => {
  const ctx = userContext.value
  if (!ctx) return activeProperty.value || 'Property'
  const prop = ctx.access?.property_roles ? activeProperty.value : null
  return prop || activeProperty.value || 'Property'
})

const rentRange = computed(() => {
  if (!stats.value) return '—'
  const { minRent, maxRent } = stats.value
  if (!minRent) return '—'
  const fmt = (n: number) => `$${n.toLocaleString()}`
  return minRent === maxRent ? fmt(minRent) : `${fmt(minRent)} – ${fmt(maxRent)}`
})

const quickActions = [
  {
    label: 'View Available Units',
    description: 'Browse all open units with pricing and availability dates',
    icon: 'i-heroicons-building-office-2',
    to: '/tour/availabilities',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-950/30',
  },
  {
    label: 'Floor Plans',
    description: 'Coming soon',
    icon: 'i-heroicons-squares-2x2',
    to: null,
    color: 'text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    disabled: true,
  },
  {
    label: 'Amenities',
    description: 'Coming soon',
    icon: 'i-heroicons-sparkles',
    to: null,
    color: 'text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    disabled: true,
  },
]
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-8">

    <!-- Maintenance Dept: TBD placeholder -->
    <template v-if="isMaintenance">
      <section class="rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 p-12 flex flex-col items-center justify-center text-center gap-4">
        <UIcon name="i-heroicons-wrench-screwdriver" class="w-12 h-12 text-slate-400" />
        <div>
          <p class="font-black text-lg text-slate-600 dark:text-slate-300">Maintenance Tablet View</p>
          <p class="text-sm text-slate-400 mt-1">Coming soon — modules TBD</p>
        </div>
      </section>
    </template>

    <!-- Non-Maintenance: tour showcase -->
    <template v-else>

    <!-- Property Hero -->
    <section class="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white shadow-xl">
      <p class="text-primary-200 text-xs font-bold uppercase tracking-widest mb-1">Welcome to</p>
      <h1 class="text-3xl font-black tracking-tight mb-1">{{ propertyName }}</h1>
      <p class="text-primary-200 text-sm">Your new home starts here.</p>
    </section>

    <!-- At-a-Glance Stats -->
    <section class="grid grid-cols-2 gap-4">
      <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Available Now</p>
        <p class="text-4xl font-black text-gray-900 dark:text-white">
          {{ stats?.count ?? '—' }}
        </p>
        <p class="text-xs text-gray-400 mt-1">units ready to view</p>
      </div>
      <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Starting From</p>
        <p class="text-2xl font-black text-gray-900 dark:text-white leading-tight">
          {{ rentRange }}
        </p>
        <p class="text-xs text-gray-400 mt-1">per month</p>
      </div>
    </section>

    <!-- Quick Action Cards -->
    <section class="space-y-3">
      <h2 class="text-[10px] font-black uppercase tracking-widest text-gray-400">Explore</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <component
          :is="action.to ? 'NuxtLink' : 'div'"
          v-for="action in quickActions"
          :key="action.label"
          :to="action.to || undefined"
          class="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all"
          :class="[action.bg, action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.98]']"
        >
          <div class="w-12 h-12 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center shadow-inner flex-shrink-0">
            <UIcon :name="action.icon" class="w-6 h-6" :class="action.color" />
          </div>
          <div>
            <p class="font-black text-sm text-gray-900 dark:text-white">{{ action.label }}</p>
            <p class="text-xs text-gray-400">{{ action.description }}</p>
          </div>
          <UIcon v-if="!action.disabled" name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-300 ml-auto" />
        </component>
      </div>
    </section>

    </template><!-- end non-Maintenance -->

  </div>
</template>
