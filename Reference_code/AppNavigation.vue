<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/useAuthStore'
import { getPropertyName, type PropertyCode } from '../constants/properties'

const authStore = useAuthStore()
const { user, profile, access_list, active_property } = storeToRefs(authStore)
const supabase = useSupabaseClient()
const router = useRouter()
const colorMode = useColorMode()

// Layout mode toggle
const { toggleLayoutMode, toggleIcon } = useLayoutMode()

// Mobile menu state
const isMobileMenuOpen = ref(false)

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

// Property switcher options
const propertyOptions = computed(() => {
  return access_list.value.map(access => access.apt_code)
})

const handlePropertyChange = (newProperty: string) => {
  active_property.value = newProperty
}

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
      to: '/profile',
    },
  ],
  [
    {
      label: isDark.value ? 'Light Mode' : 'Dark Mode',
      icon: isDark.value ? 'i-heroicons-sun' : 'i-heroicons-moon',
      onSelect: () => {
        console.log('Toggling color mode')
        toggleColorMode()
      },
      click: () => {
        console.log('Click: Toggling color mode')
        toggleColorMode()
      }
    },
  ],
  [
    {
      label: 'Sign Out',
      icon: 'i-heroicons-arrow-left-on-rectangle',
      onSelect: async () => {
        console.log('Sign out selected')
        await handleSignOut()
      },
      click: async () => {
        console.log('Click: Sign out')
        await handleSignOut()
      }
    },
  ],
])

const handleSignOut = async () => {
  try {
    console.log('Signing out...')
    await supabase.auth.signOut()
    console.log('Sign out successful, redirecting...')
    window.location.href = '/login'
  } catch (e) {
    console.error('Sign out error:', e)
    router.push('/login')
  }
}

// Navigation items - will expand as features are added
const navigationItems = computed(() => {
  const items: { label: string; icon: string; to?: string; children?: any[] }[] = [
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

  // Add Office menu (Leasing Layer)
  items.push({
    label: 'Office',
    icon: 'i-heroicons-briefcase',
    to: '/office/availabilities',
    children: [
      {
        label: 'Availability',
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
    ],
  })

  // Add more items based on user permissions
  if (profile.value?.is_super_admin) {
    items.push({
      label: 'Admin',
      icon: 'i-heroicons-shield-check',
      to: '/admin',
      children: [
        {
          label: 'Users',
          icon: 'i-heroicons-user-group',
          to: '/admin/users',
          description: 'Manage users and permissions',
        },
        {
          label: 'Properties',
          icon: 'i-heroicons-building-office-2',
          to: '/admin/properties',
          description: 'Manage properties',
        },
        {
          label: 'Sync Command',
          icon: 'i-heroicons-cloud-arrow-up',
          to: '/admin/upload',
          description: 'Unified Ingestion Orchestrator',
        },
        {
          label: 'Health Check',
          icon: 'i-heroicons-shield-check',
          to: '/admin/health-check',
          description: 'V4.4 Diagnostic Firewall',
        },
        {
          label: 'Laboratory',
          icon: 'i-heroicons-beaker',
          to: '/admin/lab-registry',
          description: 'Scenario status board',
        },
      ],
    })

    items.push({
      label: 'Playgrounds',
      icon: 'i-heroicons-rocket-launch',
      children: [
        {
          label: 'Base Tech',
          icon: 'i-heroicons-cpu-chip',
          to: '/playground/table-test',
        },
        {
          label: 'Table Engine',
          to: '/playground/table-test',
          icon: 'i-heroicons-table-cells',
        },
        {
          label: 'Cell Renderer',
          to: '/playground/cell-test',
          icon: 'i-heroicons-cube',
        },
        {
          label: 'Unit Search',
          to: '/playground/unit-lookup-test',
          icon: 'i-heroicons-magnifying-glass',
        },
        {
          label: 'Base Command',
          to: '/playground/command-center',
          icon: 'i-heroicons-command-line',
        },
        {
          label: 'Ops & Ingestion',
          icon: 'i-heroicons-adjustments-horizontal',
          to: '/ops/playground/sanity',
        },
        {
          label: 'Ops Sanity',
          to: '/ops/playground/sanity',
          icon: 'i-heroicons-shield-check',
        },
        {
          label: 'Ingestion V0',
          to: '/playground/ingestion-v0',
          icon: 'i-heroicons-cloud-arrow-up',
        },
        {
          label: 'Leasing Logistics',
          icon: 'i-heroicons-calculator',
          to: '/playground/solver-test',
        },
        {
          label: 'Solver Test',
          to: '/playground/solver-test',
          icon: 'i-heroicons-bug-ant',
        },
        {
          label: 'Scenario Engine',
          to: '/playground/scenario-01-check',
          icon: 'i-heroicons-academic-cap',
        },
        {
          label: 'Smart Cards',
          to: '/leasing/playground/smart-cards',
          icon: 'i-heroicons-rectangle-group',
        },
        {
          label: 'UI Components',
          to: '/playground/smart-components',
          icon: 'i-heroicons-sparkles',
        },
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
          <span>SupaNuxt Yardi</span>
        </NuxtLink>

        <!-- Center: Desktop Navigation -->
        <div class="hidden lg:flex justify-center flex-grow mx-4">
          <UNavigationMenu :items="navigationItems" orientation="horizontal" />
        </div>

        <!-- Right: Controls and User Menu -->
        <div class="flex items-center gap-3">
          <!-- Property Switcher -->
					<div class="hidden lg:block">
						<USelectMenu
            v-if="propertyOptions.length > 0"
            v-model="active_property"
            :items="propertyOptions"
            @update:model-value="handlePropertyChange"
            class="min-w-[80px]"
          />
					</div>
          
          <!-- Layout Width Toggle -->
          <div class="hidden lg:block">
            <UButton
              :icon="toggleIcon"
              color="neutral"
              variant="ghost"
              aria-label="Toggle content width"
              @click="toggleLayoutMode"
            />
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
            @update:model-value="handlePropertyChange"
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
            to="/profile"
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
              await supabase.auth.signOut()
              router.push('/login')
              isMobileMenuOpen = false
            }"
          />
        </div>
      </template>
    </USlideover>
  </header>
</template>
