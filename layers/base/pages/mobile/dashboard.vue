<script setup lang="ts">
import { computed } from 'vue'
import { usePropertyState } from '../../composables/usePropertyState'

definePageMeta({
  layout: 'mobile-app',
  middleware: 'auth',
  ssr: false,
})

const { userContext } = usePropertyState()
const department = computed(() => userContext.value?.profile?.department || '')
const isAdminOrAsset = computed(() => {
  const ctx = userContext.value
  if (!ctx) return false
  if (ctx.access?.is_super_admin) return true
  const roles = Object.values(ctx.access?.property_roles || {})
  return roles.includes('Asset')
})

const menuItems = computed(() => {
  // Admin / Asset: all modules combined
  if (isAdminOrAsset.value) {
    return [
      { label: 'New Application', icon: 'i-heroicons-document-plus',           to: '/office/applications/new',  color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
      { label: 'Availability',    icon: 'i-heroicons-building-office-2',        to: '/mobile/availabilities',    color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-900/20' },
      { label: 'Residents',       icon: 'i-heroicons-users',                    to: '/office/residents',         color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
      { label: 'Quick Scan',      icon: 'i-heroicons-qr-code',                  to: '/office/inventory',         color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Work Orders',     icon: 'i-heroicons-clipboard-document-check', to: '/maintenance/work-orders',  color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
      { label: 'Inventory',       icon: 'i-heroicons-archive-box',              to: '/office/inventory',         color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      { label: 'Locations',       icon: 'i-heroicons-map-pin',                  to: '/assets/locations',         color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
      { label: 'Alerts',          icon: 'i-heroicons-bell-alert',               to: '/office/alerts',            color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ]
  }

  // Maintenance: "Quick Scan", "My Work Orders", "Inventory"
  if (department.value === 'Maintenance') {
    return [
      { label: 'Quick Scan', icon: 'i-heroicons-qr-code', to: '/office/inventory', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'My Work Orders', icon: 'i-heroicons-clipboard-document-check', to: '/maintenance/work-orders', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
      { label: 'Inventory', icon: 'i-heroicons-archive-box', to: '/office/inventory', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      { label: 'Locations', icon: 'i-heroicons-map-pin', to: '/assets/locations', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' }
    ]
  } 
  // Leasing: "New Application", "Availability", "Residents"
  else if (department.value === 'Leasing' || department.value === 'Management') {
    return [
      { label: 'New Application', icon: 'i-heroicons-document-plus', to: '/office/applications/new', color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
      { label: 'Availability', icon: 'i-heroicons-building-office-2', to: '/mobile/availabilities', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
      { label: 'Residents', icon: 'i-heroicons-users', to: '/office/residents', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
      { label: 'Alerts', icon: 'i-heroicons-bell-alert', to: '/office/alerts', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { label: 'Locations', icon: 'i-heroicons-map-pin', to: '/assets/locations', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' }
    ]
  }
  // Admin / Default
  return [
    { label: 'Locations', icon: 'i-heroicons-map-pin', to: '/assets/locations', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' },
    { label: 'Alerts', icon: 'i-heroicons-bell-alert', to: '/office/alerts', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' },
    { label: 'My Profile', icon: 'i-heroicons-user-circle', to: '/user/profile', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' }
  ]
})
</script>

<template>
  <div class="px-6 pt-6 space-y-8">

    <!-- Navigation Hub -->
    <div class="grid grid-cols-2 gap-4">
      <NuxtLink
        v-for="item in menuItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none transition-all active:scale-95 min-h-[140px]"
        :class="item.bg"
      >
        <div class="p-3 rounded-2xl bg-white/50 dark:bg-black/20 mb-3 shadow-inner">
          <UIcon :name="item.icon" class="w-8 h-8" :class="item.color" />
        </div>
        <span class="font-black text-xs text-center uppercase tracking-wider text-gray-800 dark:text-gray-200">
          {{ item.label }}
        </span>
      </NuxtLink>
    </div>

    <!-- Quick Status Card -->
    <section class="space-y-4">
      <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">System Pulse</h3>
      <div class="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
            <UIcon name="i-heroicons-bolt" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <p class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Ready for work</p>
            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tight">System online</p>
          </div>
        </div>
        <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-300" />
      </div>
    </section>
  </div>
</template>
