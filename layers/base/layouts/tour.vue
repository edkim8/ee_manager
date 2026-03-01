<script setup lang="ts">
import { computed } from 'vue'
import { usePropertyState } from '../composables/usePropertyState'
import { useAppMode } from '../composables/useAppMode'
import { useTourState } from '../composables/useTourState'

const { activeProperty, propertyOptions, setProperty, userContext } = usePropertyState()

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

const { setMode } = useAppMode()
const { isPresenting, togglePresenting } = useTourState()

// Rail open/closed state — useState is SSR-safe (no localStorage)
const railOpen = useState<boolean>('tour-rail-open', () => true)

const toggleRail = () => { railOpen.value = !railOpen.value }

const exitToWeb = () => {
  setMode('web')
  if (import.meta.client) window.location.href = '/'
}

const activePropertyLabel = computed(() => {
  const opt = propertyOptions.value.find((p: any) => p.value === activeProperty.value)
  return opt?.label || activeProperty.value || 'Select Property'
})

// Dept/role-aware sidebar items
// TBD items have to: null — rendered as disabled placeholders
const LEASING_ITEMS = [
  { label: 'Home',         icon: 'i-heroicons-home',                      to: '/tour/dashboard' },
  { label: 'Availability', icon: 'i-heroicons-building-office-2',          to: '/tour/availabilities' },
]

const MAINTENANCE_ITEMS = [
  { label: 'Home',         icon: 'i-heroicons-home',                      to: '/tour/dashboard' },
  { label: 'Work Orders',  icon: 'i-heroicons-clipboard-document-check',  to: null },
  { label: 'Inventory',    icon: 'i-heroicons-archive-box',               to: null },
  { label: 'Locations',    icon: 'i-heroicons-map-pin',                   to: null },
]

const ALL_ITEMS = [
  { label: 'Home',         icon: 'i-heroicons-home',                      to: '/tour/dashboard' },
  { label: 'Availability', icon: 'i-heroicons-building-office-2',          to: '/tour/availabilities' },
  { label: 'Work Orders',  icon: 'i-heroicons-clipboard-document-check',  to: null },
  { label: 'Inventory',    icon: 'i-heroicons-archive-box',               to: null },
  { label: 'Locations',    icon: 'i-heroicons-map-pin',                   to: null },
  { label: 'Alerts',       icon: 'i-heroicons-bell-alert',                to: null },
]

const navItems = computed(() => {
  const dept = userContext.value?.profile?.department || ''
  const isSuperAdmin = userContext.value?.access?.is_super_admin || false
  const roles = Object.values(userContext.value?.access?.property_roles || {})
  const isAsset = roles.includes('Asset')

  if (isSuperAdmin || isAsset) return ALL_ITEMS
  if (dept === 'Maintenance') return MAINTENANCE_ITEMS
  return LEASING_ITEMS  // Leasing, Management, default
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

    <!-- System Banner — collapses in Presentation Mode -->
    <div
      class="flex-shrink-0 overflow-hidden transition-all duration-300 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
      :class="isPresenting ? 'h-0' : 'h-8'"
    >
      <div class="h-8 flex items-center justify-between px-4">
        <span class="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400">EE Manager</span>
        <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[40%] text-center">{{ displayName }}</span>
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
          <template v-if="displayDept && displayRole">{{ displayDept }} · {{ displayRole }}</template>
          <template v-else-if="displayDept">{{ displayDept }}</template>
          <template v-else-if="displayRole">{{ displayRole }}</template>
        </span>
      </div>
    </div>

    <!-- Top Bar — collapses in Presentation Mode -->
    <header
      class="flex-shrink-0 overflow-hidden transition-all duration-300 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40"
      :class="isPresenting ? 'h-0' : 'h-14'"
    >
      <div class="h-14 flex items-center px-4 gap-3">
        <!-- Rail toggle -->
        <button
          type="button"
          class="w-11 h-11 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          :title="railOpen ? 'Collapse sidebar' : 'Expand sidebar'"
          @click="toggleRail"
        >
          <UIcon name="i-heroicons-bars-3" class="w-5 h-5" />
        </button>

        <!-- Property name / switcher -->
        <div class="flex-1 min-w-0">
          <USelectMenu
            v-if="propertyOptions.length > 1"
            v-model="activeProperty"
            :items="propertyOptions"
            value-key="value"
            size="sm"
            variant="ghost"
            class="font-semibold text-gray-900 dark:text-white min-w-[160px]"
          />
          <span v-else class="font-semibold text-gray-900 dark:text-white truncate">
            {{ activePropertyLabel }}
          </span>
        </div>

        <!-- Presentation Mode toggle — clearly labeled for discoverability -->
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 active:scale-95 transition-all text-xs font-black uppercase tracking-wide flex-shrink-0"
          title="Enter Presentation Mode"
          @click="togglePresenting"
        >
          <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
          <span>Present</span>
        </button>

        <!-- Exit to web (subtle, staff-only context) -->
        <button
          type="button"
          class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium px-2 py-1 rounded transition-colors min-h-[44px]"
          @click="exitToWeb"
        >
          Web
        </button>
      </div>
    </header>

    <!-- Body: side rail + page content -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Collapsible side rail — also collapses in Presentation Mode -->
      <aside
        class="flex-shrink-0 overflow-hidden transition-all duration-300 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800"
        :class="(!isPresenting && railOpen) ? 'w-14' : 'w-0'"
      >
        <nav class="flex flex-col items-center pt-3 gap-1 w-14">
          <!-- Active items -->
          <NuxtLink
            v-for="item in navItems.filter(i => i.to)"
            :key="item.label"
            :to="item.to!"
            class="w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200"
            active-class="bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400"
            inactive-class="text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
            :title="item.label"
          >
            <UIcon :name="item.icon" class="w-5 h-5" />
          </NuxtLink>

          <!-- Divider before TBD items (if any) -->
          <div
            v-if="navItems.some(i => !i.to)"
            class="w-6 border-t border-gray-200 dark:border-gray-700 my-1"
          />

          <!-- TBD / coming soon items -->
          <UTooltip
            v-for="item in navItems.filter(i => !i.to)"
            :key="item.label"
            :text="`${item.label} — coming soon`"
            :delay-duration="300"
          >
            <div
              class="w-11 h-11 flex items-center justify-center rounded-xl opacity-30 cursor-not-allowed"
              :title="item.label"
            >
              <UIcon :name="item.icon" class="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </UTooltip>
        </nav>
      </aside>

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </div>

    <!-- Exit Presentation overlay — appears when presenting -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <div v-if="isPresenting" class="fixed top-4 right-4 z-[70] pointer-events-auto">
        <button
          type="button"
          class="w-12 h-12 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 active:scale-95 transition-all shadow-lg"
          title="Exit Presentation Mode"
          @click="togglePresenting"
        >
          <UIcon name="i-heroicons-arrows-pointing-in" class="w-5 h-5" />
        </button>
      </div>
    </Transition>

    <!-- Mode toggle FAB: hidden in presentation mode -->
    <div
      class="fixed bottom-4 right-20 z-[60] pointer-events-auto transition-all duration-300"
      :class="isPresenting ? 'opacity-0 pointer-events-none' : 'opacity-100'"
    >
      <UButton
        icon="i-heroicons-computer-desktop"
        color="amber"
        variant="solid"
        size="xl"
        class="rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all w-12 h-12 flex items-center justify-center border-2 border-amber-600 dark:border-amber-400"
        title="Switch to Web"
        @click="exitToWeb"
      />
    </div>
  </div>
</template>
