<script setup lang="ts">
import { usePropertyState } from '../../composables/usePropertyState'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'

definePageMeta({
  layout: 'mobile-app',
  middleware: 'auth',
})

const { activeProperty } = usePropertyState()
const supabase = useSupabaseClient()

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  Available: { label: 'Available', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  Applied:   { label: 'Applied',   color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  Notice:    { label: 'Notice',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
}

const { data: units, pending } = await useAsyncData(
  () => `mobile-avail-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return []
    const { data } = await supabase
      .from('view_leasing_pipeline')
      .select('unit_name, floor_plan_name, rent_offered, status, available_date')
      .eq('property_code', activeProperty.value)
      .in('status', ['Available', 'Applied', 'Notice'])
      .order('unit_name')
    return data || []
  },
  { watch: [activeProperty] }
)

const fmt = (n: number | null) => n != null ? `$${n.toLocaleString()}` : '—'
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
</script>

<template>
  <div class="px-4 pt-4 pb-6 space-y-3">

    <h1 class="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Available Units</h1>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="!units?.length" class="py-12 text-center text-sm text-gray-400">
      No units available right now.
    </div>

    <!-- Unit rows -->
    <div v-else class="space-y-2">
      <div
        v-for="unit in units"
        :key="unit.unit_name"
        class="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm active:scale-[0.98] transition-all"
      >
        <div class="flex flex-col min-w-0">
          <span class="font-black text-sm text-gray-900 dark:text-white">{{ unit.unit_name }}</span>
          <span class="text-[11px] text-gray-400 truncate">{{ unit.floor_plan_name || '—' }}</span>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0 ml-3">
          <div class="text-right">
            <p class="font-black text-sm text-gray-900 dark:text-white">{{ fmt(unit.rent_offered) }}</p>
            <p class="text-[10px] text-gray-400">{{ fmtDate(unit.available_date) }}</p>
          </div>
          <span
            class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            :class="(STATUS_BADGE[unit.status] || STATUS_BADGE['Available']).color"
          >
            {{ (STATUS_BADGE[unit.status] || { label: unit.status }).label }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>
