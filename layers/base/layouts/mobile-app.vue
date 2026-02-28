<script setup lang="ts">
import { computed } from 'vue'
import { useAppMode } from '../composables/useAppMode'
import { usePropertyState } from '../composables/usePropertyState'

const { toggleMode } = useAppMode()
const { userContext, activeProperty } = usePropertyState()

const displayName = computed(() => {
  const p = userContext.value?.profile
  if (!p) return ''
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
})

const displayDept = computed(() => userContext.value?.profile?.department || '')

const displayRole = computed(() => {
  if (!activeProperty.value || !userContext.value) return ''
  return userContext.value.access?.property_roles?.[activeProperty.value] || ''
})

const navItems = [
  { label: 'Home', icon: 'i-heroicons-home', to: '/mobile/dashboard' },
  { label: 'Assets', icon: 'i-heroicons-building-office-2', to: '/assets/locations' },
  { label: 'Alerts', icon: 'i-heroicons-bell-alert', to: '/office/alerts' },
  { label: 'Me', icon: 'i-heroicons-user-circle', to: '/user/profile' }
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

    <!-- System Banner -->
    <div class="w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
      <!-- Safe area spacer (iPhone notch / Dynamic Island) -->
      <div class="safe-area-top" />
      <!-- Banner row -->
      <div class="h-7 flex items-center justify-between px-4">
        <span class="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400">EE Manager</span>
        <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[40%] text-center">{{ displayName }}</span>
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 text-right whitespace-nowrap">
          <template v-if="displayDept && displayRole">{{ displayDept }} · {{ displayRole }}</template>
          <template v-else-if="displayDept">{{ displayDept }}</template>
          <template v-else-if="displayRole">{{ displayRole }}</template>
        </span>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 safe-bottom pb-24">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-2">
      <div 
        class="max-w-md mx-auto flex justify-around items-center h-16 rounded-2xl border border-white/30 dark:border-white/10 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80"
      >
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300"
          active-class="text-primary-600 dark:text-primary-400 scale-105"
          inactive-class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span class="text-[10px] font-black uppercase tracking-widest">{{ item.label }}</span>
        </NuxtLink>

        <!-- Mode Toggle (Duplicate for prominence as requested) -->
        <button
          type="button"
          class="flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 text-amber-500 dark:text-amber-400 hover:scale-110 active:scale-95"
          @click="toggleMode"
        >
          <UIcon name="i-heroicons-computer-desktop" class="w-6 h-6 shadow-amber-500/20" />
          <span class="text-[10px] font-black uppercase tracking-widest text-center leading-tight">Switch<br>to Web</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.safe-area-top {
  height: env(safe-area-inset-top, 0px);
}
.pb-safe {
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
}

/* Subtle active indicator */
.router-link-active {
  position: relative;
}

.router-link-active::after {
  content: '';
  position: absolute;
  top: -4px;
  width: 12px;
  height: 2px;
  border-radius: 9999px;
  background-color: currentColor;
  box-shadow: 0 0 8px currentColor;
}
</style>
