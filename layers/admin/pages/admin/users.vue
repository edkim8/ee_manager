<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient, useToast, useHead } from '#imports'
import { PROPERTY_LIST, getPropertyName } from '../../../base/constants/properties'
import type { AdminUser, UserPropertyAccess } from '../../types/admin'

definePageMeta({
  layout: 'dashboard',
  middleware: ['admin']
})

useHead({
  title: 'User Management'
})

const supabase = useSupabaseClient()
const toast = useToast()

// Tab state
const activeTab = ref(0)
const tabItems = [
  { id: 0, label: 'User List', icon: 'i-heroicons-users' },
  { id: 1, label: 'Create User', icon: 'i-heroicons-user-plus' },
  { id: 2, label: 'Edit User', icon: 'i-heroicons-pencil-square' }
]

// Users list state
const users = ref<AdminUser[]>([])
const loading = ref(false)
const selectedUserId = ref<string | null>(null)

// Fetch all users with their property access
async function fetchUsers() {
  loading.value = true
  try {
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('email')

    if (profilesError) throw profilesError

    // Fetch all property access
    const { data: accessData, error: accessError } = await supabase
      .from('user_property_access')
      .select('*')

    if (accessError) throw accessError

    // Map access to users
    const accessByUser = (accessData || []).reduce((acc, access) => {
      if (!acc[access.user_id]) acc[access.user_id] = []
      acc[access.user_id].push(access)
      return acc
    }, {} as Record<string, UserPropertyAccess[]>)

    users.value = (profilesData || []).map(profile => ({
      ...profile,
      propertyAccess: accessByUser[profile.id] || []
    }))
  } catch (error: any) {
    console.error('[AdminUsers] Fetch error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load users.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Edit user handler
function handleEditUser(userId: string) {
  selectedUserId.value = userId
  activeTab.value = 2 // Switch to Edit tab
}

// Handle user created
function handleUserCreated(userId: string) {
  fetchUsers()
  activeTab.value = 0 // Switch back to list
}

// Handle user updated
function handleUserUpdated(userId: string) {
  fetchUsers()
}

// Computed rows for table
const tableRows = computed(() => {
  return users.value.map(user => ({
    id: user.id,
    email: user.email || '-',
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || '-',
    is_super_admin: user.is_super_admin,
    is_active: user.is_active,
    properties: user.propertyAccess || []
  }))
})

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Manage system access and property permissions</p>
      </div>
      <UButton
        v-if="activeTab === 0"
        icon="i-heroicons-arrow-path"
        color="neutral"
        variant="ghost"
        @click="fetchUsers"
        :loading="loading"
      />
    </div>

    <!-- Custom Tab Bar -->
    <div class="flex border-b border-gray-200 dark:border-gray-800">
      <button
        v-for="tab in tabItems"
        :key="tab.id"
        class="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2"
        :class="[
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        ]"
        @click="activeTab = tab.id"
      >
        <UIcon :name="tab.icon" class="w-5 h-5" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="mt-8 transition-all duration-300">
      <!-- User List -->
      <div v-if="activeTab === 0" class="space-y-4">
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                  <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                  <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Properties</th>
                  <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-if="loading" v-for="i in 3" :key="i" class="animate-pulse">
                  <td colspan="6" class="px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div></td>
                </tr>
                <tr v-else-if="tableRows.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <UIcon name="i-heroicons-users" class="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No users found</p>
                  </td>
                </tr>
                <tr 
                  v-else 
                  v-for="row in tableRows" 
                  :key="row.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="px-6 py-4 text-sm font-medium">{{ row.email }}</td>
                  <td class="px-6 py-4 text-sm">{{ row.name }}</td>
                  <td class="px-6 py-4 text-sm">
                    <span 
                      v-if="row.is_super_admin" 
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    >
                      Admin
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <span 
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      :class="row.is_active !== false ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
                    >
                      {{ row.is_active !== false ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <div class="flex flex-wrap gap-1">
                      <span 
                        v-for="access in row.properties.slice(0, 3)" 
                        :key="access.id"
                        class="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      >
                        {{ access.property_code }}
                      </span>
                      <span 
                        v-if="row.properties.length > 3"
                        class="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-400"
                      >
                        +{{ row.properties.length - 3 }}
                      </span>
                      <span v-if="row.properties.length === 0" class="text-gray-400 italic text-xs">None</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-center">
                    <UButton
                      icon="i-heroicons-pencil-square"
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      @click="handleEditUser(row.id)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Create User -->
      <div v-else-if="activeTab === 1">
        <AdminUserCreate @created="handleUserCreated" />
      </div>

      <!-- Edit User -->
      <div v-else-if="activeTab === 2">
        <div v-if="!selectedUserId" class="bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center">
          <UIcon name="i-heroicons-user-plus" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 class="text-lg font-semibold">No User Selected</h3>
          <p class="text-gray-500 mt-2">Please select a user from the list to edit their profile.</p>
          <UButton 
            class="mt-6"
            label="Go to User List"
            variant="soft"
            @click="activeTab = 0"
          />
        </div>
        <AdminUserEdit
          v-else
          :initial-user-id="selectedUserId"
          @updated="handleUserUpdated"
        />
      </div>
    </div>
  </div>
</template>
