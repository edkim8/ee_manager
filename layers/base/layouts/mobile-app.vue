<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppMode } from '../composables/useAppMode'
import { usePropertyState } from '../composables/usePropertyState'
import { useTheme } from '../composables/useTheme'
import { useSupabaseClient, useSupabaseUser, useColorMode } from '#imports'

const { toggleMode } = useAppMode()
const { userContext, activeProperty, propertyOptions, resetProperty, setProperty } = usePropertyState()
const { THEMES, currentThemeId, setTheme } = useTheme()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const colorMode = useColorMode()

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
  { label: 'Home',   icon: 'i-heroicons-home',              to: '/mobile/dashboard' },
  { label: 'Assets', icon: 'i-heroicons-building-office-2', to: '/assets/locations' },
  { label: 'Alerts', icon: 'i-heroicons-bell-alert',        to: '/office/alerts' },
]

const isProfileOpen = ref(false)

const isDark = computed(() => colorMode.value === 'dark')
const toggleDark = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const handleSignOut = async () => {
  isProfileOpen.value = false
  resetProperty()
  await supabase.auth.signOut()
  window.location.href = '/auth/login'
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

    <!-- System Banner -->
    <div class="w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
      <div class="safe-area-top" />
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
      <div class="max-w-md mx-auto flex justify-around items-center h-16 rounded-2xl border border-white/30 dark:border-white/10 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80">
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

        <!-- Profile Button -->
        <button
          type="button"
          class="flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          @click="isProfileOpen = true"
        >
          <UIcon name="i-heroicons-user-circle" class="w-6 h-6" />
          <span class="text-[10px] font-black uppercase tracking-widest">Profile</span>
        </button>

        <!-- Mode Toggle -->
        <button
          type="button"
          class="flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 text-amber-500 dark:text-amber-400 hover:scale-110 active:scale-95"
          @click="toggleMode"
        >
          <UIcon name="i-heroicons-computer-desktop" class="w-6 h-6" />
          <span class="text-[10px] font-black uppercase tracking-widest text-center leading-tight">Switch<br>to Web</span>
        </button>
      </div>
    </nav>

    <!-- Profile Sheet Backdrop -->
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="isProfileOpen" class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" @click="isProfileOpen = false" />
    </Transition>

    <!-- Profile Sheet -->
    <Transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-y-full" enter-to-class="translate-y-0"
                leave-active-class="transition-transform duration-250 ease-in" leave-from-class="translate-y-0" leave-to-class="translate-y-full">
      <div v-if="isProfileOpen" class="fixed bottom-0 left-0 right-0 z-[61] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl safe-bottom-sheet">

        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ displayName || user?.email }}</p>
            <p class="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
              <template v-if="displayDept && displayRole">{{ displayDept }} · {{ displayRole }}</template>
              <template v-else-if="displayDept">{{ displayDept }}</template>
              <template v-else>Staff</template>
            </p>
          </div>
          <button class="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" @click="isProfileOpen = false">
            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
          </button>
        </div>

        <div class="px-5 py-4 space-y-5 overflow-y-auto max-h-[65vh]">

          <!-- Property -->
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Property</p>
            <USelectMenu
              v-model="activeProperty"
              :items="propertyOptions"
              value-key="value"
              label-key="label"
              size="md"
              class="w-full"
              @update:model-value="setProperty"
            />
          </div>

          <!-- Dark Mode -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon :name="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ isDark ? 'Dark Mode' : 'Light Mode' }}</span>
            </div>
            <button
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
              :class="isDark ? 'bg-primary-500' : 'bg-gray-200'"
              @click="toggleDark"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                    :class="isDark ? 'translate-x-6' : 'translate-x-1'" />
            </button>
          </div>

          <!-- Color Theme -->
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Color Theme</p>
            <div class="grid grid-cols-6 gap-2">
              <button
                v-for="theme in THEMES"
                :key="theme.id"
                :title="theme.label"
                class="flex flex-col items-center gap-1 group"
                @click="setTheme(theme.id)"
              >
                <span
                  class="w-8 h-8 rounded-full border-2 transition-transform duration-150 group-active:scale-90"
                  :style="{ backgroundColor: theme.swatch }"
                  :class="currentThemeId === theme.id ? 'border-gray-900 dark:border-white scale-110 shadow-md' : 'border-transparent'"
                />
                <span class="text-[8px] font-bold uppercase tracking-wider text-gray-400 truncate max-w-[40px] text-center leading-tight">{{ theme.label }}</span>
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2 pt-1">
            <NuxtLink
              to="/user/profile"
              class="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm"
              @click="isProfileOpen = false"
            >
              <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-gray-400" />
              My Profile
            </NuxtLink>

            <button
              class="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold text-sm"
              @click="handleSignOut"
            >
              <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-5 h-5" />
              Sign Out
            </button>
          </div>

        </div>

        <!-- safe area spacer -->
        <div class="safe-area-bottom" />
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.safe-area-top {
  height: env(safe-area-inset-top, 0px);
}
.pb-safe {
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
}
.safe-bottom-sheet {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.safe-area-bottom {
  height: env(safe-area-inset-bottom, 0px);
}

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
