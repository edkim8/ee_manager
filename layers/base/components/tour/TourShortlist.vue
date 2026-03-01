<script setup lang="ts">
import { navigateTo } from '#imports'
import { useTourState } from '../../composables/useTourState'

const props = defineProps<{
  shortlistData: Array<{
    unit_name: string
    rent_offered?: number | null
    status?: string | null
  }>
}>()

const { shortlist, activeUnitId, MAX_TOUR_SLOTS } = useTourState()

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toLocaleString()}` : '—'

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
  const status = props.shortlistData.find(u => u.unit_name === code)?.status as keyof typeof STATUS_SLOT | undefined
  const map = STATUS_SLOT[status ?? 'Available'] ?? STATUS_SLOT.Available
  return isActive ? map.active : map.inactive
}

// Always set activeUnitId (no toggle) — touching a slot always opens its dossier
const handleSlotTap = (code: string | null) => {
  if (code) {
    activeUnitId.value = code
  } else {
    navigateTo('/tour/availabilities')
  }
}
</script>

<template>
  <div class="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
    <!-- Label row -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Tour Lineup</span>
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

    <!-- Slot grid -->
    <div class="grid gap-2" :style="`grid-template-columns: repeat(${MAX_TOUR_SLOTS}, 1fr)`">
      <button
        v-for="(code, i) in Array.from({ length: MAX_TOUR_SLOTS }, (_, idx) => shortlist[idx] ?? null)"
        :key="i"
        type="button"
        class="flex flex-col items-center justify-center rounded-xl border-2 px-2 py-2.5 transition-all min-w-0 min-h-[52px]"
        :class="code
          ? slotClass(code, activeUnitId === code)
          : 'border-dashed border-gray-200 dark:border-gray-700'"
        @click="handleSlotTap(code)"
      >
        <template v-if="code">
          <span class="font-black text-sm truncate w-full text-center leading-tight">{{ code }}</span>
          <span class="text-[10px] opacity-70 truncate w-full text-center">
            {{ fmt(shortlistData.find(u => u.unit_name === code)?.rent_offered) }}
          </span>
        </template>
        <UIcon v-else name="i-heroicons-plus" class="w-4 h-4 text-gray-300 dark:text-gray-600" />
      </button>
    </div>
  </div>
</template>
