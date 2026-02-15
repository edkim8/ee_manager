<script setup lang="ts">
import { getPropertyName } from '../../constants/properties'

const { latestRun, isLoading, fetchLatestRun } = useDashboardData()

onMounted(() => {
  fetchLatestRun()
})

const properties = computed(() => {
  if (!latestRun.value || !latestRun.value.summary) return []
  return Object.entries(latestRun.value.summary).map(([code, summary]: [string, any]) => ({
    code,
    name: getPropertyName(code),
    summary
  }))
})

const lastUploadTime = computed(() => {
  if (!latestRun.value?.created_at) return 'Unknown'
  const date = new Date(latestRun.value.created_at)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
})

const totalChanges = computed(() => {
  return properties.value.reduce((acc, p) => {
    const s = p.summary
    return acc + 
      (s.tenanciesNew || 0) + 
      (s.tenanciesUpdated || 0) + 
      (s.leasesRenewed || 0) + 
      (s.availabilitiesUpdated || 0) + 
      (s.applicationsSaved || 0)
  }, 0)
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-primary-500 mb-2" />
      <span class="text-xs text-gray-400 font-bold uppercase tracking-widest">Fetching latest data...</span>
    </div>

    <template v-else-if="latestRun">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-3xl font-black text-gray-900 dark:text-white">{{ totalChanges }}</div>
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Total Changes Today</div>
        </div>
        <div class="w-16 h-16 relative">
          <svg class="w-full h-full" viewBox="0 0 36 36">
            <path class="text-gray-200 dark:text-gray-800" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="text-primary-500" stroke-width="3" stroke-dasharray="100, 100" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold">100%</div>
        </div>
      </div>
      
      <div class="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        <div v-for="prop in properties" :key="prop.code" class="group flex flex-col p-3 rounded-xl bg-white/40 dark:bg-black/20 border border-white/20 dark:border-gray-800/50 hover:border-primary-500/30 transition-colors">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">{{ prop.name }}</span>
            </div>
            <span class="text-[10px] text-gray-500 font-mono">{{ lastUploadTime }}</span>
          </div>

          <div class="grid grid-cols-2 gap-y-1 gap-x-4">
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-gray-500">Leased Units</span>
              <span class="font-bold text-gray-900 dark:text-gray-300">{{ (prop.summary.tenanciesNew || 0) + (prop.summary.tenanciesUpdated || 0) }}</span>
            </div>
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-gray-500">New Leases</span>
              <span class="font-bold text-gray-900 dark:text-gray-300">{{ prop.summary.leasesRenewed || 0 }}</span>
            </div>
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-gray-500">Availabilities</span>
              <span class="font-bold text-gray-900 dark:text-gray-300">{{ prop.summary.availabilitiesUpdated || 0 }}</span>
            </div>
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-gray-500">Applications</span>
              <span class="font-bold text-gray-900 dark:text-gray-300">{{ prop.summary.applicationsSaved || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex flex-col items-center justify-center py-8 text-center bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
      <UIcon name="i-heroicons-cloud-slash" class="text-3xl text-gray-300 mb-2" />
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No uploads detected today</span>
    </div>
  </div>
</template>
