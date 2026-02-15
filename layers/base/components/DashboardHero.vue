<script setup lang="ts">
import { computed } from 'vue'
import { usePropertyState } from '../composables/usePropertyState'

const user = useSupabaseUser()
const { userContext } = usePropertyState()

const profile = computed(() => userContext.value?.profile)

const displayName = computed(() => {
  const p = profile.value as any
  
  // 1. Prioritize explicit first/last name
  if (p?.first_name || p?.last_name) {
    return `${p.first_name || ''} ${p.last_name || ''}`.trim()
  }

  // 2. Fallback to full_name (computed or stored)
  if (p?.full_name) return p.full_name
  
  // 3. Fallback to auth metadata
  const meta = user.value?.user_metadata || {}
  const metaName = meta.full_name || meta.name || meta.display_name
  if (metaName) return metaName

  // 4. Default to capitalized email prefix
  const emailPrefix = user.value?.email?.split('@')[0] || ''
  if (emailPrefix) return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)

  return 'Guest'
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
})
</script>

<template>
  <div class="relative overflow-hidden rounded-3xl p-8 md:p-12 mb-8 border border-white/20 shadow-2xl">
    <!-- Animated Mesh Background -->
    <div class="absolute inset-0 -z-10 animate-mesh bg-gradient-to-br from-primary-600/30 via-purple-600/20 to-blue-600/30 blur-3xl" />
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px] animate-pulse" />
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse-slow" />

    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm">
          {{ greeting }}, <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">{{ displayName }}</span>
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-300 font-medium max-w-xl">
          Your property portfolio is looking healthy today. You have <span class="text-primary-600 dark:text-primary-400 font-bold">12</span> pending renewals and <span class="text-blue-600 dark:text-blue-400 font-bold">4</span> new maintenance requests.
        </p>
      </div>

      <div class="flex items-center gap-4 bg-white/40 dark:bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-inner">
        <div class="p-3 bg-primary-500 rounded-xl shadow-lg">
          <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-white" />
        </div>
        <div class="pr-4">
          <div class="text-sm font-bold text-gray-900 dark:text-white">Premium Status</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">All systems operational</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes mesh {
  0% { transform: scale(1) translate(0px, 0px); }
  33% { transform: scale(1.1) translate(20px, -30px); }
  66% { transform: scale(0.9) translate(-20px, 20px); }
  100% { transform: scale(1) translate(0px, 0px); }
}

.animate-mesh {
  animation: mesh 15s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.animate-pulse-slow {
  animation: pulse-slow 8s ease-in-out infinite;
}
</style>
