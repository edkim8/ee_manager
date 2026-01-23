<script setup lang="ts">
const supabase = useSupabaseClient()

const { data: logs, status, refresh } = await useAsyncData('leasing-sync-logs-mini', async () => {
    const { data } = await supabase
        .from('leasing_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(3)
    return data
})

const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

// Polling for live feeling during tests
onMounted(() => {
    const interval = setInterval(() => {
        refresh()
    }, 5000)
    onUnmounted(() => clearInterval(interval))
})
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <UIcon name="i-heroicons-bolt" class="text-orange-500" />
                    Live Solver Logs
                </h3>
                <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-path" size="xs" :loading="status === 'pending'" @click="refresh" />
            </div>
        </template>

        <div v-if="logs && logs.length > 0" class="space-y-4">
            <div v-for="log in logs" :key="log.id" class="text-sm border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                <div class="flex items-center justify-between mb-2">
                    <UBadge :color="log.status === 'Success' ? 'green' : 'orange'" variant="subtle" size="xs">
                        {{ log.status }}
                    </UBadge>
                    <span class="text-[10px] text-gray-400 font-mono">{{ formatTime(log.started_at) }}</span>
                </div>
                
                <ul class="space-y-1">
                    <li v-for="(event, idx) in log.summary_json?.events" :key="idx" class="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <span class="text-primary-500 mt-1">•</span>
                        <span class="leading-tight">{{ event }}</span>
                    </li>
                    <li v-if="!log.summary_json?.events?.length" class="text-gray-400 italic">
                        No specific changes detected.
                    </li>
                </ul>
            </div>
        </div>
        <div v-else class="text-center py-6 text-gray-500 italic text-sm">
            No sync logs found.
        </div>
    </UCard>
</template>
