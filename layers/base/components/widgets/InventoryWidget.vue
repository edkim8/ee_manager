<script setup lang="ts">
const { inventoryStats, isLoading, fetchInventoryStats } = useDashboardData()

onMounted(() => {
  fetchInventoryStats()
})

const stats = computed(() => inventoryStats.value || {
  total: 0,
  healthy: 0,
  warning: 0,
  critical: 0,
  expired: 0,
  unknown: 0,
  atRisk: 0
})

const healthPct = computed(() => {
  if (!stats.value.total) return 0
  return (stats.value.healthy / stats.value.total) * 100
})

const getSafeWidth = (part: number, total: number) => {
  if (!total || total <= 0) return '0%'
  return `${Math.max(0, (part / total) * 100)}%`
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading && !inventoryStats" class="flex flex-col items-center justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-primary-500 mb-2" />
      <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scanning Assets...</span>
    </div>

    <template v-else>
      <!-- Hero count -->
      <div class="flex items-end justify-between">
        <div>
          <div class="text-4xl font-black text-gray-900 dark:text-white leading-none">{{ stats.total }}</div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Total Assets</div>
        </div>
        <div v-if="stats.atRisk > 0" class="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-right">
          <div class="text-lg font-black text-red-500">{{ stats.atRisk }}</div>
          <div class="text-[8px] font-black uppercase tracking-tighter text-red-400">At Risk</div>
        </div>
        <div v-else class="p-2 rounded-xl bg-green-500/10 border border-green-500/20 text-right">
          <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-green-500" />
        </div>
      </div>

      <!-- Health bar -->
      <div class="space-y-2">
        <div class="flex justify-between items-center text-xs">
          <span class="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Fleet Health</span>
          <span class="text-gray-900 dark:text-white font-black">{{ healthPct.toFixed(0) }}% Healthy</span>
        </div>
        <div class="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex shadow-inner">
          <div
            class="h-full bg-green-500 transition-all duration-1000 ease-out"
            :style="{ width: getSafeWidth(stats.healthy, stats.total) }"
            title="Healthy"
          />
          <div
            class="h-full bg-yellow-400 transition-all duration-1000 ease-out"
            :style="{ width: getSafeWidth(stats.warning, stats.total) }"
            title="Warning"
          />
          <div
            class="h-full bg-orange-500 transition-all duration-1000 ease-out"
            :style="{ width: getSafeWidth(stats.critical, stats.total) }"
            title="Critical"
          />
          <div
            class="h-full bg-red-600 transition-all duration-1000 ease-out"
            :style="{ width: getSafeWidth(stats.expired, stats.total) }"
            title="Expired"
          />
        </div>
        <div class="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-tighter">
          <span class="text-green-500">Healthy</span>
          <span class="text-red-500">Expired</span>
        </div>
      </div>

      <!-- Status badges -->
      <div class="flex flex-wrap gap-2">
        <UBadge v-if="stats.healthy" variant="subtle" color="success" size="xs" class="font-bold">
          <span class="opacity-70 mr-1">{{ stats.healthy }}</span> Healthy
        </UBadge>
        <UBadge v-if="stats.warning" variant="subtle" color="warning" size="xs" class="font-bold">
          <span class="opacity-70 mr-1">{{ stats.warning }}</span> Warning
        </UBadge>
        <UBadge v-if="stats.critical" variant="subtle" color="error" size="xs" class="font-bold">
          <span class="opacity-70 mr-1">{{ stats.critical }}</span> Critical
        </UBadge>
        <UBadge v-if="stats.expired" variant="subtle" color="error" size="xs" class="font-bold">
          <span class="opacity-70 mr-1">{{ stats.expired }}</span> Expired
        </UBadge>
        <UBadge v-if="stats.unknown" variant="subtle" color="neutral" size="xs" class="font-bold">
          <span class="opacity-70 mr-1">{{ stats.unknown }}</span> Unknown
        </UBadge>
      </div>

      <div class="pt-2 flex justify-end border-t border-gray-100 dark:border-gray-800">
        <UButton
          to="/office/inventory/installations"
          variant="ghost"
          color="primary"
          size="xs"
          class="font-black uppercase tracking-tighter"
          trailing-icon="i-heroicons-arrow-right-16-solid"
        >
          View Inventory
        </UButton>
      </div>
    </template>
  </div>
</template>
