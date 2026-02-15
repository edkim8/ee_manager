<script setup lang="ts">
import { onMounted, computed } from 'vue'

const { alertsStats, fetchAlertsStats, activeProperty } = useDashboardData()
const supabase = useSupabaseClient()

onMounted(() => {
  fetchAlertsStats()
})

const { data: recentAlerts, status } = await useAsyncData(`recent-alerts-${activeProperty.value}`, async () => {
  if (!activeProperty.value) return []
  const { data } = await supabase
    .from('view_table_alerts_unified')
    .select('*')
    .eq('property_code', activeProperty.value)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3)
  return data || []
}, {
  watch: [activeProperty]
})

const stats = computed(() => alertsStats.value || {
  totalActive: 0,
  overdue: 0
})

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="stats.totalActive > 0" class="flex gap-2">
      <UBadge color="red" variant="subtle" size="xs" class="font-black">
        {{ stats.overdue }} Overdue
      </UBadge>
      <UBadge color="orange" variant="subtle" size="xs" class="font-black">
        {{ stats.totalActive }} Active
      </UBadge>
    </div>

    <div class="space-y-2">
      <div v-for="alert in recentAlerts" :key="alert.id" class="group flex items-start gap-3 p-3 rounded-xl bg-white/40 dark:bg-black/20 border border-white/20 dark:border-gray-800/50 hover:border-orange-500/30 transition-colors">
        <div class="mt-1 p-1.5 bg-orange-500/10 rounded-lg text-orange-600">
          <UIcon :name="alert.is_overdue ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-bell'" class="w-4 h-4" />
        </div>
        <div class="flex-grow space-y-0.5 min-w-0">
          <div class="text-[11px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">{{ alert.title }}</div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">{{ alert.message }}</p>
          <div class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{{ formatTimeAgo(alert.created_at) }} • {{ alert.source }}</div>
        </div>
        <UButton :to="`/office/alerts`" variant="ghost" color="neutral" icon="i-heroicons-chevron-right" size="xs" />
      </div>

      <div v-if="recentAlerts?.length === 0 && status !== 'pending'" class="flex flex-col items-center justify-center py-6 text-center bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
        <UIcon name="i-heroicons-shield-check" class="text-3xl text-green-500/30 mb-2" />
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Active Alerts</span>
      </div>
    </div>
    
    <UButton to="/office/alerts" block variant="ghost" color="orange" size="xs" label="View All Alerts" class="font-black uppercase tracking-widest text-[9px]" />
  </div>
</template>
