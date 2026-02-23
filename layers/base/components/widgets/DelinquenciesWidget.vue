<script setup lang="ts">
const { delinquencyStats, isLoading, fetchDelinquencyStats } = useDashboardData()

onMounted(() => {
  fetchDelinquencyStats()
})

const stats = computed(() => delinquencyStats.value || {
  total_unpaid_sum: 0,
  balance_sum: 0,
  days_0_30_sum: 0,
  days_31_60_sum: 0,
  days_61_90_sum: 0,
  days_90_plus_sum: 0,
  prepays_sum: 0,
  resident_count: 0
})

const highRiskTotal = computed(() => stats.value.days_61_90_sum + stats.value.days_90_plus_sum)

const getSafeWidth = (part: number, total: number) => {
  if (!total || total <= 0) return '0%'
  return `${Math.max(0, (part / total) * 100)}%`
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val)
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="isLoading && !delinquencyStats" class="flex flex-col items-center justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-primary-500 mb-2" />
      <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Analyzing Arrears...</span>
    </div>

    <template v-else>
      <div class="relative p-6 rounded-3xl bg-gradient-to-br from-gray-900 to-slate-800 text-white overflow-hidden shadow-2xl border border-white/5 group transition-all hover:scale-[1.01]">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl transition-all group-hover:bg-primary-500/20" />
        <div class="relative z-10 flex justify-between items-start">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total Unpaid</div>
            </div>
            <div class="text-4xl font-black tracking-tighter">{{ formatCurrency(stats.total_unpaid_sum) }}</div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <UIcon name="i-heroicons-users" class="w-3 h-3" />
              {{ stats.resident_count }} Active Cases
            </div>
          </div>
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
            <UIcon name="i-heroicons-banknotes" class="w-8 h-8 text-primary-400" />
          </div>
        </div>
      </div>

      <div class="space-y-4 px-1">
        <div class="flex justify-between items-end">
          <div class="space-y-0.5">
            <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">High Risk Aging</div>
            <div class="text-lg font-black text-red-500">{{ formatCurrency(highRiskTotal) }}</div>
          </div>
          <UBadge variant="subtle" color="error" size="xs" class="font-black italic">61+ Days</UBadge>
        </div>

        <div class="space-y-2">
          <div class="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex shadow-inner">
            <div 
              class="h-full bg-blue-500 transition-all duration-1000 ease-out" 
              :style="{ width: getSafeWidth(stats.days_0_30_sum, stats.total_unpaid_sum) }"
              title="0-30 Days"
            />
            <div 
              class="h-full bg-yellow-400 transition-all duration-1000 ease-out" 
              :style="{ width: getSafeWidth(stats.days_31_60_sum, stats.total_unpaid_sum) }"
              title="31-60 Days"
            />
            <div 
              class="h-full bg-orange-500 transition-all duration-1000 ease-out" 
              :style="{ width: getSafeWidth(stats.days_61_90_sum, stats.total_unpaid_sum) }"
              title="61-90 Days"
            />
            <div 
              class="h-full bg-red-600 transition-all duration-1000 ease-out shadow-[inset_-2px_0_4px_rgba(0,0,0,0.2)]" 
              :style="{ width: getSafeWidth(stats.days_90_plus_sum, stats.total_unpaid_sum) }"
              title="90+ Days"
            />
          </div>
          <div class="grid grid-cols-4 gap-1 mt-1">
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-tighter">0–30d</span>
              </div>
              <span class="text-[9px] font-bold text-blue-500 pl-3">{{ formatCurrency(stats.days_0_30_sum) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-tighter">31–60d</span>
              </div>
              <span class="text-[9px] font-bold text-yellow-500 pl-3">{{ formatCurrency(stats.days_31_60_sum) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-tighter">61–90d</span>
              </div>
              <span class="text-[9px] font-bold text-orange-500 pl-3">{{ formatCurrency(stats.days_61_90_sum) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-tighter">90d+</span>
              </div>
              <span class="text-[9px] font-bold text-red-500 pl-3">{{ formatCurrency(stats.days_90_plus_sum) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-green-500" />
          Recovery Active
        </div>
        <UButton 
          to="/office/delinquencies" 
          variant="ghost" 
          color="primary" 
          size="xs" 
          class="font-black uppercase tracking-tighter"
          trailing-icon="i-heroicons-arrow-right-16-solid"
        >
          View Analysis
        </UButton>
      </div>
    </template>
  </div>
</template>
