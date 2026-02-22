<script setup lang="ts">
const { availabilityStats, availabilityTrend, isLoading, fetchAvailabilityStats, fetchAvailabilityTrend } = useDashboardData()

onMounted(() => {
  fetchAvailabilityStats()
  fetchAvailabilityTrend()
})

const trendIcon = computed(() => {
  if (!availabilityTrend.value) return null
  if (availabilityTrend.value.direction === 'up') return 'i-heroicons-arrow-trending-up'
  if (availabilityTrend.value.direction === 'down') return 'i-heroicons-arrow-trending-down'
  return 'i-heroicons-minus'
})

const trendColor = computed(() => {
  if (!availabilityTrend.value) return ''
  if (availabilityTrend.value.direction === 'up') return 'text-green-500'
  if (availabilityTrend.value.direction === 'down') return 'text-red-500'
  return 'text-gray-400'
})

const stats = computed(() => availabilityStats.value || {
  totalUnits: 0,
  occupied: 0,
  notice: 0,
  vacant: 0,
  totalAvailable: 0,
  applicants: 0,
  future: 0,
  ready: 0,
  occupancyPct: 0,
  leasedPct: 0
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="isLoading && !availabilityStats" class="flex flex-col items-center justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-primary-500 mb-2" />
      <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Loading Inventory...</span>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-4">
        <div class="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 shadow-inner group transition-all hover:scale-[1.02]">
          <div class="flex items-center gap-1.5">
            <div class="text-2xl font-black text-green-600 dark:text-green-400">{{ stats.occupancyPct.toFixed(1) }}%</div>
            <UIcon
              v-if="trendIcon"
              :name="trendIcon"
              :class="['w-4 h-4 shrink-0', trendColor]"
              :title="availabilityTrend ? `${availabilityTrend.direction === 'up' ? '+' : availabilityTrend.direction === 'down' ? '-' : ''}${availabilityTrend.delta}% vs ${availabilityTrend.previousDate}` : ''"
            />
          </div>
          <div class="text-[10px] font-bold text-green-700/60 dark:text-green-400/60 uppercase tracking-tight">Occupancy</div>
          <div v-if="availabilityTrend" class="text-[9px] text-gray-400 mt-0.5">
            {{ availabilityTrend.direction === 'up' ? '+' : availabilityTrend.direction === 'down' ? '-' : '' }}{{ availabilityTrend.delta }}% vs prev snapshot
          </div>
        </div>
        <div class="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 shadow-inner group transition-all hover:scale-[1.02]">
          <div class="text-2xl font-black text-blue-600 dark:text-blue-400">{{ stats.leasedPct.toFixed(1) }}%</div>
          <div class="text-[10px] font-bold text-blue-700/60 dark:text-blue-400/60 uppercase tracking-tight">Leased</div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex justify-between items-center text-xs">
          <span class="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Physical Occupancy</span>
          <span class="text-gray-900 dark:text-white font-black">{{ stats.occupied }} / {{ stats.totalUnits }} Units</span>
        </div>
        <div class="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
          <div 
            class="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
            :style="{ width: `${stats.occupancyPct}%` }" 
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <UBadge variant="subtle" color="info" size="md" class="font-black text-sm px-3 py-1">
          <span class="opacity-60 mr-1.5 font-black">{{ stats.totalAvailable }}</span> Availables
        </UBadge>
        <UBadge variant="subtle" color="warning" size="md" class="font-black text-sm px-3 py-1">
          <span class="opacity-60 mr-1.5 font-black">{{ stats.applicants }}</span> Applicants
        </UBadge>
        <UBadge variant="subtle" color="success" size="md" class="font-black text-sm px-3 py-1">
          <span class="opacity-60 mr-1.5 font-black">{{ stats.future }}</span> Future
        </UBadge>
        <UBadge variant="subtle" color="error" size="md" class="font-black text-sm px-3 py-1">
          <span class="opacity-60 mr-1.5 font-black">{{ stats.notice }}</span> Notices
        </UBadge>
        <UBadge variant="subtle" color="primary" size="md" class="font-black text-sm px-3 py-1">
          <span class="opacity-60 mr-1.5 font-black">{{ stats.vacant }}</span> Vacant
        </UBadge>
      </div>
    </template>
  </div>
</template>
