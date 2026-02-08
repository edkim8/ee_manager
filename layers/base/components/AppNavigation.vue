<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSupabaseUser, useSupabaseClient, useRouter, useColorMode, navigateTo, useOverlay } from '#imports'
import { usePropertyState } from '../composables/usePropertyState'
import ConstantsModal from './modals/ConstantsModal.vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const router = useRouter()
const colorMode = useColorMode()

// Use shared property state
const { 
  activeProperty: active_property, 
  propertyOptions, 
  userContext,
  fetchProperties,
  setProperty,
  resetProperty 
} = usePropertyState()

// Mobile menu state
const isMobileMenuOpen = ref(false)
const profile = computed(() => userContext.value?.profile || {
  full_name: user.value?.email?.split('@')[0] || 'User',
  first_name: user.value?.email?.split('@')[0] || '',
  last_name: '',
  department: 'Staff'
})

// Dark mode toggle
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  },
})

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Compute user initials
const userInitials = computed(() => {
  if (!profile.value) return 'U'
  const first = profile.value.first_name?.charAt(0) || ''
  const last = profile.value.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || 'U'
})

// AppNavigation logic... user and fetchProperties are now synchronized automatically by the useAsyncData in usePropertyState
onMounted(async () => {
  console.log('[AppNavigation] Mounted. User status:', !!user.value)
})

// User menu items
const userMenuItems = computed(() => [
  [
    {
      label: profile.value?.full_name || 'User',
      slot: 'account',
      disabled: true,
    },
  ],
  [
    {
      label: 'My Profile',
      icon: 'i-heroicons-user-circle',
      to: '/user/profile',
    },
  ],
  [
    {
      label: isDark.value ? 'Light Mode' : 'Dark Mode',
      icon: isDark.value ? 'i-heroicons-sun' : 'i-heroicons-moon',
      onSelect: () => {
        toggleColorMode()
      }
    },
  ],
  [
    {
      label: 'Sign Out',
      icon: 'i-heroicons-arrow-left-on-rectangle',
      onSelect: async () => {
        await handleSignOut()
      }
    },
  ],
])

const handleSignOut = async () => {
  try {
    console.log('[AppNavigation] Signing out...')
    resetProperty() // Clear properties and user context
    await supabase.auth.signOut()
    
    // Use a hard redirect to login to ensure all state is cleared
    await navigateTo('/auth/login', { replace: true })
    
    // Optional: Refresh the window as a last resort if state persists
    // window.location.href = '/auth/login'
  } catch (e) {
    console.error('Sign out error:', e)
    resetProperty()
    await navigateTo('/auth/login', { replace: true })
  }
}

const overlay = useOverlay()
const modal = overlay.create(ConstantsModal)
const openConstantsModal = () => {
  console.log('[AppNavigation] Opening Global Constants Modal')
  modal.open({ 
    title: 'System Constants',
    propertyCode: active_property.value
  })
}

// Navigation items
const navigationItems = computed(() => {
  const items: { label: string; icon: string; to?: string; onSelect?:Function; children?: any[] }[] = [
    {
      label: 'Dashboard',
      icon: 'i-heroicons-home',
      to: '/',
    },
  ]

  // Add Assets menu
  items.push({
    label: 'Assets',
    icon: 'i-heroicons-building-library',
    to: '/assets/properties',
    children: [
      {
        label: 'Properties',
        icon: 'i-heroicons-building-office',
        to: '/assets/properties',
      },
      {
        label: 'Buildings',
        icon: 'i-heroicons-home-modern',
        to: '/assets/buildings',
      },
      {
        label: 'Floor Plans',
        icon: 'i-heroicons-map',
        to: '/assets/floor-plans',
      },
      {
        label: 'Units',
        icon: 'i-heroicons-key',
        to: '/assets/units',
      },
    ],
  })

  // Add Office menu
  items.push({
    label: 'Office',
    icon: 'i-heroicons-briefcase',
    to: '/office/availabilities',
    children: [
      {
        label: 'Availabilities',
        icon: 'i-heroicons-clipboard-document-list',
        to: '/office/availabilities',
      },
      {
        label: 'Leases',
        icon: 'i-heroicons-document-text',
        to: '/office/leases',
      },
      {
        label: 'Residents',
        icon: 'i-heroicons-users',
        to: '/office/residents',
      },
      {
        label: 'Delinquencies',
        icon: 'i-heroicons-chart-bar',
        to: '/office/delinquencies',
      },
    ],
  })

  // Add Admin menu
  if (userContext.value?.access?.is_super_admin) {
    items.push({
      label: 'Admin',
    icon: 'i-heroicons-cog-6-tooth',
    to: '/admin/upload',
    children: [
      {
        label: 'Users',
        icon: 'i-heroicons-users',
        to: '/admin/users',
      },
      {
        label: 'Solver Engine',
        icon: 'i-heroicons-cpu-chip',
        to: '/admin/solver',
      },
      {
        label: 'Solver Inspector',
        icon: 'i-heroicons-beaker',
        to: '/admin/solver/inspector',
      },
      {
        label: 'Legacy Import',
        icon: 'i-heroicons-arrow-up-tray',
        to: '/admin/upload',
      },
      {
        label: 'Edit Constants',
        icon: 'i-heroicons-adjustments-horizontal',
        onSelect: () => openConstantsModal()
      },
      {
        label: 'Parser Engine',
        icon: 'i-heroicons-document-text',
        to: '/admin/parse_engine',
      },
      {
        label: 'Unit Lookup Generator',
        icon: 'i-heroicons-code-bracket',
        to: '/admin/generators/unit-lookup',
      },
      {
        label: 'Email Notifications',
        icon: 'i-heroicons-envelope',
        to: '/admin/notifications',
      }
    ],
    })
  }

  return [items]
})
</script>

<template>
  <header v-if="user" class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Left: Logo and Brand -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white flex-shrink-0"
        >
          <span>EE Manager</span>
        </NuxtLink>

        <!-- Center: Desktop Navigation -->
        <div class="hidden lg:flex justify-center flex-grow mx-4">
          <UNavigationMenu :items="navigationItems" orientation="horizontal" />
        </div>

        <!-- Right: Controls and User Menu -->
        <div class="flex items-center gap-3">
          <!-- Property Switcher -->
          <div class="hidden lg:block">
            <div class="flex flex-col items-end">
              <USelectMenu
                v-if="propertyOptions.length > 0"
                v-model="active_property"
                :items="propertyOptions"
                value-key="value"
                class="min-w-[200px]"
              />
              <div v-else class="text-xs text-gray-400 italic px-2">
                No property access
              </div>
              <span class="text-[10px] text-primary-500 font-mono mt-1 px-1">
                DEBUG [Property: {{ active_property || 'NONE' }}]
              </span>
            </div>
          </div>

          <!-- User Menu (Desktop) -->
          <div class="hidden lg:block sm:flex items-center">
            <UDropdownMenu
              :items="userMenuItems"
              :popper="{ placement: 'bottom-end' }"
            >
              <UButton color="neutral" variant="ghost" class="w-10 h-10 p-0">
                <UAvatar
                  size="sm"
                  :alt="profile?.full_name || 'User'"
                  :text="userInitials"
                />
              </UButton>

              <template #account="{ item }">
                <div class="text-left">
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ item.label }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ profile?.department || 'Staff' }}
                  </p>
                </div>
              </template>
            </UDropdownMenu>
          </div>

          <!-- Mobile Menu Button -->
          <UButton
            icon="i-heroicons-bars-3"
            color="neutral"
            variant="ghost"
            class="lg:hidden"
            @click="isMobileMenuOpen = true"
            aria-label="Open menu"
          />
        </div>
      </div>
    </div>

    <!-- Mobile Slideover -->
    <USlideover v-model:open="isMobileMenuOpen" title="Menu">
      <template #body>
        <!-- Property Switcher (Mobile) -->
        <div v-if="propertyOptions.length > 0" class="mb-6">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
            Property
          </label>
            <USelectMenu
              v-model="active_property"
              :items="propertyOptions"
              value-key="value"
              class="w-full"
            />
        </div>

        <!-- Navigation Menu (Mobile) -->
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
          class="w-full"
          @click="isMobileMenuOpen = false"
        />
      </template>

      <template #footer>
        <div class="space-y-2">
          <!-- User Info -->
          <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ profile?.full_name || 'User' }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ profile?.department || 'Staff' }}
            </p>
          </div>

          <!-- Action Buttons -->
          <UButton
            label="My Profile"
            icon="i-heroicons-user-circle"
            color="neutral"
            variant="ghost"
            to="/user/profile"
            class="w-full justify-start"
            @click="isMobileMenuOpen = false"
          />

          <UButton
            :label="isDark ? 'Light Mode' : 'Dark Mode'"
            :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            color="neutral"
            variant="ghost"
            class="w-full justify-start"
            @click="toggleColorMode"
          />

          <UButton
            label="Sign Out"
            icon="i-heroicons-arrow-left-on-rectangle"
            color="error"
            variant="ghost"
            class="w-full justify-start"
            @click="async () => {
              await handleSignOut()
              isMobileMenuOpen = false
            }"
          />
        </div>
      </template>
    </USlideover>
  </header>
</template>
