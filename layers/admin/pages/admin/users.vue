<script setup lang="ts">
import { PROPERTY_LIST, getPropertyName } from '../../../base/constants/properties'
import type { AdminUser, UserPropertyAccess } from '../../types/admin'

definePageMeta({
  middleware: 'admin',
  layout: 'dashboard'
})

useHead({
  title: 'User Management'
})

const supabase = useSupabaseClient()
const toast = useToast()

// Tab state
const activeTab = ref(0)
const tabItems = [
  { label: 'User List', icon: 'i-heroicons-users' },
  { label: 'Create User', icon: 'i-heroicons-user-plus' },
  { label: 'Edit User', icon: 'i-heroicons-pencil-square' }
]

// Users list state
const users = ref<AdminUser[]>([])
const loading = ref(false)
const selectedUserId = ref<string | null>(null)

// Table columns
const columns = [
  { key: 'email', label: 'Email' },
  { key: 'name', label: 'Name' },
  { key: 'is_super_admin', label: 'Admin' },
  { key: 'is_active', label: 'Status' },
  { key: 'properties', label: 'Properties' },
  { key: 'actions', label: 'Actions' }
]

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
  <div class="p-4 max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">User Management</h1>
      <UButton
        v-if="activeTab === 0"
        icon="i-heroicons-arrow-path"
        variant="ghost"
        @click="fetchUsers"
        :loading="loading"
      />
    </div>

    <!-- Tab Navigation -->
    <UTabs v-model="activeTab" :items="tabItems" class="w-full">
      <template #item="{ item, index }">
        <div class="flex items-center gap-2">
          <UIcon :name="item.icon" class="w-4 h-4" />
          <span>{{ item.label }}</span>
        </div>
      </template>
    </UTabs>

    <!-- Tab Content -->
    <div class="mt-6">
      <!-- User List -->
      <div v-show="activeTab === 0">
        <UCard>
          <UTable :columns="columns" :rows="tableRows" :loading="loading">
            <template #is_super_admin-cell="{ row }">
              <UBadge v-if="row.is_super_admin" color="primary" variant="solid">
                Admin
              </UBadge>
              <span v-else class="text-muted">-</span>
            </template>

            <template #is_active-cell="{ row }">
              <UBadge
                :color="row.is_active !== false ? 'success' : 'error'"
                variant="subtle"
              >
                {{ row.is_active !== false ? 'Active' : 'Inactive' }}
              </UBadge>
            </template>

            <template #properties-cell="{ row }">
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="access in row.properties.slice(0, 3)"
                  :key="access.id"
                  color="neutral"
                  variant="outline"
                  size="xs"
                >
                  {{ access.property_code }}
                </UBadge>
                <UBadge
                  v-if="row.properties.length > 3"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  +{{ row.properties.length - 3 }}
                </UBadge>
                <span v-if="row.properties.length === 0" class="text-muted text-sm">
                  None
                </span>
              </div>
            </template>

            <template #actions-cell="{ row }">
              <UButton
                icon="i-heroicons-pencil-square"
                variant="ghost"
                size="xs"
                @click="handleEditUser(row.id)"
              />
            </template>

            <template #empty>
              <div class="text-center py-8 text-muted">
                <UIcon name="i-heroicons-users" class="w-12 h-12 mx-auto mb-2" />
                <p>No users found.</p>
              </div>
            </template>
          </UTable>
        </UCard>
      </div>

      <!-- Create User -->
      <div v-show="activeTab === 1">
        <AdminUserCreate @created="handleUserCreated" />
      </div>

      <!-- Edit User -->
      <div v-show="activeTab === 2">
        <AdminUserEdit
          :initial-user-id="selectedUserId || undefined"
          @updated="handleUserUpdated"
        />
      </div>
    </div>
  </div>
</template>
