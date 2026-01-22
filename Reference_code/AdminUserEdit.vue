<script setup lang="ts">
import { DEPARTMENTS, ROLES } from '../../base/constants/app-constants'

const departmentOptions = DEPARTMENTS
const roleOptions = ROLES

const supabase = useSupabaseClient()
const toast = useToast()
const { properties, fetchProperties } = useProperties()

// Page Controller Pattern
const state = reactive({
  isLoading: false,
  searchQuery: '',
  selectedUser: null as any,
  editForm: {
    first_name: '',
    last_name: '',
    department: ''
  },
  propertyAccess: [] as any[],
  newAccess: {
    apt_code: '',
    role: ''
  }
})

// Fetch properties on mount
onMounted(() => {
  fetchProperties()
})

// Property Access Table Columns for GenericDataTable
const accessColumns = ref([
  { 
    header: 'Property Code', 
    accessorKey: 'apt_code', 
    sortable: true, 
    align: 'left' as const
  },
  { 
    header: 'Role', 
    accessorKey: 'role', 
    sortable: true, 
    align: 'left' as const
  },
  { 
    header: 'Actions', 
    accessorKey: 'actions', 
    sortable: false, 
    align: 'center' as const,
    disableRowClick: true
  }
])

// Column width configuration
const getColumnWidth = (key: string) => {
  const widths: Record<string, string> = {
    apt_code: '150px',
    role: '150px',
    actions: '120px'
  }
  return widths[key] || 'auto'
}

// Debounced search
let searchTimeout: NodeJS.Timeout | null = null
const searchUsers = async () => {
  // If search is empty or too short, list all users
  if (!state.searchQuery || state.searchQuery.length < 1) {
    await listAllUsers()
    return
  }

  state.isLoading = true
  try {
    console.log('[AdminUserEdit] Searching for:', state.searchQuery)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${state.searchQuery}%,full_name.ilike.%${state.searchQuery}%,first_name.ilike.%${state.searchQuery}%,last_name.ilike.%${state.searchQuery}%`)
      .limit(10)
    
    console.log('[AdminUserEdit] Search results:', { data, error, count: data?.length })

    if (error) {
      console.error('[AdminUserEdit] Search error:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      toast.add({
        title: 'No Results',
        description: 'No user found matching your search.',
        color: 'yellow'
      })
      state.selectedUser = null
    } else {
      // If multiple results, take the first one
      const user = data[0]
      console.log('[AdminUserEdit] Selected user:', user)
      
      state.selectedUser = user
      state.editForm.first_name = user.first_name || ''
      state.editForm.last_name = user.last_name || ''
      state.editForm.department = user.department || ''
      await fetchPropertyAccess(user.id)
      
      if (data.length > 1) {
        toast.add({
          title: 'Multiple Results',
          description: `Found ${data.length} users. Showing first match: ${user.email}`,
          color: 'blue'
        })
      }
    }
  } catch (error: any) {
    console.error('[AdminUserEdit] Search error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to search users.',
      color: 'red'
    })
  } finally {
    state.isLoading = false
  }
}

// List all users for debugging
const listAllUsers = async () => {
  state.isLoading = true
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, full_name, department')
      .order('email')
    
    console.log('[AdminUserEdit] All users in database:', data)
    
    if (error) {
      console.error('[AdminUserEdit] Error listing users:', error)
      throw error
    }
    
    // Clear selection when listing all
    state.selectedUser = null
  } catch (error: any) {
    console.error('[AdminUserEdit] Error:', error)
  } finally {
    state.isLoading = false
  }
}

// Watch search query with manual debounce
watch(() => state.searchQuery, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(searchUsers, 500)
})

// Fetch property access for selected user
const fetchPropertyAccess = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_property_access')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    state.propertyAccess = data || []
  } catch (error: any) {
    console.error('[AdminUserEdit] Fetch access error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to fetch property access.',
      color: 'red'
    })
  }
}

// Update user profile
const handleUpdateProfile = async () => {
  if (!state.selectedUser) return

  state.isLoading = true
  try {
    const response = await $fetch('/api/users/update', {
      method: 'PUT',
      body: {
        user_id: state.selectedUser.id,
        first_name: state.editForm.first_name,
        last_name: state.editForm.last_name,
        department: state.editForm.department
      }
    })

    toast.add({
      title: 'Success',
      description: 'Profile updated successfully.',
      color: 'green'
    })

    // Update local state
    state.selectedUser = response.profile
  } catch (error: any) {
    console.error('[AdminUserEdit] Update error:', error)
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to update profile.',
      color: 'red'
    })
  } finally {
    state.isLoading = false
  }
}

// Grant property access
const handleGrantAccess = async () => {
  if (!state.selectedUser || !state.newAccess.apt_code || !state.newAccess.role) {
    toast.add({
      title: 'Validation Error',
      description: 'Please select both property and role.',
      color: 'red'
    })
    return
  }

  try {
    const { error } = await supabase
      .from('user_property_access')
      .insert({
        user_id: state.selectedUser.id,
        apt_code: state.newAccess.apt_code,
        role: state.newAccess.role
      })

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Property access granted.',
      color: 'green'
    })

    // Reset form and refresh
    state.newAccess.apt_code = ''
    state.newAccess.role = ''
    await fetchPropertyAccess(state.selectedUser.id)
  } catch (error: any) {
    console.error('[AdminUserEdit] Grant access error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to grant access.',
      color: 'red'
    })
  }
}

// Revoke property access
const handleRevokeAccess = async (accessId: string) => {
  if (!confirm('Are you sure you want to revoke this access?')) return

  try {
    const { error } = await supabase
      .from('user_property_access')
      .delete()
      .eq('id', accessId)

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Property access revoked.',
      color: 'green'
    })

    await fetchPropertyAccess(state.selectedUser.id)
  } catch (error: any) {
    console.error('[AdminUserEdit] Revoke access error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to revoke access.',
      color: 'red'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- User Search -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Search User</h2>
      </template>

      <div class="space-y-4">
        <div class="flex gap-2">
          <UInput 
            v-model="state.searchQuery" 
            placeholder="Search by email or name..."
            icon="i-heroicons-magnifying-glass"
            class="flex-1"
          />
          <UButton 
            color="gray" 
            variant="outline"
            icon="i-heroicons-list-bullet"
            @click="listAllUsers"
          >
            List All
          </UButton>
        </div>

        <div v-if="state.isLoading" class="text-sm text-gray-500">
          Searching...
        </div>
      </div>
    </UCard>

    <!-- DEBUG INFO -->
    <UCard v-if="state.selectedUser" class="bg-yellow-50 dark:bg-yellow-900/20">
      <div class="text-xs space-y-1">
        <p><strong>DEBUG:</strong> User selected: {{ state.selectedUser?.email }}</p>
        <p>Property Access Count: {{ state.propertyAccess?.length || 0 }}</p>
        <p>Property Access Data: {{ JSON.stringify(state.propertyAccess) }}</p>
      </div>
    </UCard>

    <!-- Profile Editor -->
    <UCard v-if="state.selectedUser">
      <template #header>
        <h2 class="text-lg font-semibold">Edit Profile</h2>
      </template>

      <form @submit.prevent="handleUpdateProfile" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Email (Read-only)</label>
          <UInput 
            :model-value="state.selectedUser.email" 
            disabled
            class="w-full"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">First Name</label>
            <UInput 
              v-model="state.editForm.first_name" 
              type="text" 
              placeholder="John"
              class="w-full"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Last Name</label>
            <UInput 
              v-model="state.editForm.last_name" 
              type="text" 
              placeholder="Doe"
              class="w-full"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Department</label>
          <USelectMenu 
            v-model="state.editForm.department" 
            :items="DEPARTMENTS"
            class="w-full"
          />
        </div>

        <div class="pt-2">
          <UButton 
            type="submit" 
            color="primary" 
            :loading="state.isLoading"
            label="Update Profile"
          />
        </div>
      </form>
    </UCard>

    <!-- Property Access Manager -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Property Access</h2>
          <span v-if="state.selectedUser" class="text-sm text-gray-500">
            {{ state.propertyAccess.length }} properties
          </span>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Access Table -->
        <UTable 
          :columns="[
            { key: 'apt_code', label: 'Property Code', id: 'apt_code' },
            { key: 'role', label: 'Role', id: 'role' },
            { key: 'actions', label: 'Actions', id: 'actions' }
          ]"
          :rows="state.propertyAccess"
        >
          <template #actions-data="{ row }">
            <div class="flex justify-center">
              <UButton 
                color="red" 
                variant="ghost" 
                icon="i-heroicons-trash"
                size="sm"
                @click="handleRevokeAccess(row.id)"
              />
            </div>
          </template>
          
          <template #empty-state>
            <div class="text-center py-8 text-gray-500">
              <UIcon name="i-heroicons-circle-stack-20-solid" class="w-12 h-12 mx-auto mb-2" />
              <p>No property access granted yet.</p>
            </div>
          </template>
        </UTable>

        <!-- Add New Access -->
        <div class="border-t pt-4">
          <h3 class="text-sm font-semibold mb-3">Grant New Access</h3>
          <div class="grid gap-3 md:grid-cols-3">
            <USelectMenu 
              v-model="state.newAccess.apt_code" 
              :items="properties"
              placeholder="Select property"
              class="w-full"
            />
            <USelectMenu 
              v-model="state.newAccess.role" 
              :items="ROLES"
              placeholder="Select role"
              class="w-full"
            />
            <UButton 
              color="primary" 
              label="Grant Access"
              @click="handleGrantAccess"
              block
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
