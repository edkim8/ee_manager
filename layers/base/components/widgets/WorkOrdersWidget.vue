<script setup lang="ts">
import { onMounted, computed } from 'vue'

const { workOrdersStats, fetchWorkOrdersStats, activeProperty } = useDashboardData()
const supabase = useSupabaseClient()

onMounted(() => {
  fetchWorkOrdersStats()
})

const { data: agedOrders, status } = await useAsyncData(`aged-work-orders-${activeProperty.value}`, async () => {
  if (!activeProperty.value) return []
  const { data } = await supabase
    .from('work_orders')
    .select('*')
    .eq('property_code', activeProperty.value)
    .eq('is_active', true)
    .neq('status', 'Completed')
    .order('created_at', { ascending: true }) // Oldest first
    .limit(2)
  return data || []
}, {
  watch: [activeProperty]
})

const stats = computed(() => workOrdersStats.value || {
  totalOpen: 0,
  overdue: 0
})

const getDaysOpen = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <div class="flex -space-x-2">
        <div v-for="i in Math.min(stats.totalOpen, 3)" :key="i" class="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
          <UIcon name="i-heroicons-wrench" />
        </div>
        <div v-if="stats.totalOpen > 3" class="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-primary-500 flex items-center justify-center text-[10px] font-black text-white italic">+{{ stats.totalOpen - 3 }}</div>
      </div>
      <div class="text-right">
        <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{{ stats.totalOpen }}</div>
        <div class="text-[8px] uppercase font-black text-gray-500 tracking-[0.2em] -mt-1">Open Tickets</div>
      </div>
    </div>

    <div class="space-y-2">
      <div v-for="wo in agedOrders" :key="wo.id" class="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-black/20 border border-white/20 dark:border-gray-800/50 hover:border-primary-500/30 transition-all group">
        <div class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" v-if="getDaysOpen(wo.created_at) > 3" />
        <div class="w-2 h-2 rounded-full bg-blue-500" v-else />
        
        <div class="flex-grow min-w-0">
          <div class="flex items-center justify-between gap-2 overflow-hidden">
            <span class="text-[11px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">Unit {{ wo.unit_name || 'N/A' }}: {{ wo.category || 'Maintenance' }}</span>
            <span class="text-[9px] font-mono text-gray-400 whitespace-nowrap">{{ getDaysOpen(wo.created_at) }}d</span>
          </div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic group-hover:text-primary-500 transition-colors">{{ wo.description }}</p>
        </div>
      </div>

      <div v-if="stats.totalOpen === 0 && status !== 'pending'" class="flex flex-col items-center justify-center py-6 text-center bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
        <UIcon name="i-heroicons-sparkles" class="text-3xl text-primary-500/30 mb-2" />
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">All Clear!</span>
      </div>
    </div>

    <div class="flex gap-2">
      <UButton to="/maintenance/work-orders" block variant="ghost" color="neutral" size="xs" class="flex-grow font-black uppercase tracking-widest text-[9px] border border-gray-100 dark:border-gray-800">
        All Orders
      </UButton>
      <UButton to="/maintenance/work-orders" variant="soft" color="primary" icon="i-heroicons-arrow-right" size="xs" />
    </div>
  </div>
</template>
