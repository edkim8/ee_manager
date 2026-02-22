<script setup lang="ts">
const { renewalsStats, isLoading, fetchRenewalsStats } = useDashboardData()

onMounted(() => {
  fetchRenewalsStats()
})

const stats = computed(() => renewalsStats.value || {
  total: 0,
  offered: 0,
  pending: 0,
  accepted: 0,
  declined: 0
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading && !renewalsStats" class="flex flex-col items-center justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-primary-500 mb-2" />
      <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Loading Renewals...</span>
    </div>

    <template v-else>
      <div class="flex items-end gap-2">
        <div class="text-4xl font-black text-gray-900 dark:text-white leading-none">{{ stats.total }}</div>
        <div class="text-sm font-bold text-gray-400 mb-1">Total Pipeline</div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="p-2 rounded-xl bg-primary-500/5 border border-primary-500/10 text-center">
          <div class="text-lg font-bold text-primary-600">{{ stats.offered }}</div>
          <div class="text-[8px] uppercase tracking-tighter text-gray-500 font-black">Offered</div>
        </div>
        <div class="p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
          <div class="text-lg font-bold text-blue-600">{{ stats.pending }}</div>
          <div class="text-[8px] uppercase tracking-tighter text-gray-500 font-black">Pending</div>
        </div>
        <div class="p-2 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
          <div class="text-lg font-bold text-green-600">{{ stats.accepted }}</div>
          <div class="text-[8px] uppercase tracking-tighter text-gray-500 font-black">Signed</div>
        </div>
      </div>

      <div v-if="stats.declined > 0" class="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
        <UIcon name="i-heroicons-x-circle" class="w-5 h-5 text-red-500 shrink-0" />
        <div class="text-[10px] font-bold text-red-900 dark:text-red-400">
          {{ stats.declined }} renewal{{ stats.declined !== 1 ? 's' : '' }} declined this cycle
        </div>
      </div>
      <div v-else class="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <UIcon name="i-heroicons-clock" class="w-5 h-5 text-amber-600 shrink-0" />
        <div class="text-[10px] font-bold text-amber-900 dark:text-amber-400 italic">
          {{ stats.pending }} renewal{{ stats.pending !== 1 ? 's' : '' }} pending — follow up to close the cycle.
        </div>
      </div>

      <div class="pt-2 flex justify-end border-t border-gray-100 dark:border-gray-800">
        <UButton
          to="/office/renewals"
          variant="ghost"
          color="primary"
          size="xs"
          class="font-black uppercase tracking-tighter"
          trailing-icon="i-heroicons-arrow-right-16-solid"
        >
          View Renewals
        </UButton>
      </div>
    </template>
  </div>
</template>
