<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { PROPERTY_LIST, getPropertyName } from '../../base/constants/properties'
import { USER_ROLES } from '../types/admin'
import type { AdminUser, UserPropertyAccess, UserPropertyRole } from '../types/admin'

const supabase = useSupabaseClient()
const toast = useToast()

const props = defineProps<{
  initialUserId?: string
}>()

const emit = defineEmits<{
  updated: [userId: string]
}>()

// Property options for select menu
const propertyOptions = PROPERTY_LIST.map(p => ({
  label: p.name,
  value: p.code
}))

const roleOptions = USER_ROLES.map(r => ({
  label: r,
  value: r
}))

// State
const state = reactive({
  isLoading: false,
  searchQuery: '',
  selectedUser: null as AdminUser | null,
  propertyAccess: [] as UserPropertyAccess[],
  newAccess: {
    property_code: '',
    role: '' as UserPropertyRole | ''
  }
})

const editSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_super_admin: z.boolean().default(false)
})

type EditSchema = z.output<typeof editSchema>

const editForm = reactive<EditSchema>({
  first_name: '',
  last_name: '',
  is_super_admin: false
})

// Table columns for property access
const accessColumns = [
  { key: 'property_code', label: 'Property' },
  { key: 'role', label: 'Role' },
  { key: 'actions', label: 'Actions' }
]

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => state.searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(searchUsers, 500)
})

// Load user if initialUserId provided
onMounted(() => {
  if (props.initialUserId) {
    loadUserById(props.initialUserId)
  }
})

async function loadUserById(userId: string) {
  state.isLoading = true
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error

    selectUser(data)
  } catch (error: any) {
    console.error('[AdminUserEdit] Load error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load user.',
      color: 'error'
    })
  } finally {
    state.isLoading = false
  }
}

async function searchUsers() {
  if (!state.searchQuery || state.searchQuery.length < 1) {
    return
  }

  state.isLoading = true
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${state.searchQuery}%,first_name.ilike.%${state.searchQuery}%,last_name.ilike.%${state.searchQuery}%`)
      .limit(10)

    if (error) throw error

    if (!data || data.length === 0) {
      toast.add({
        title: 'No Results',
        description: 'No user found matching your search.',
        color: 'warning'
      })
      state.selectedUser = null
    } else {
      selectUser(data[0])

      if (data.length > 1) {
        toast.add({
          title: 'Multiple Results',
          description: `Found ${data.length} users. Showing first match: ${data[0].email}`,
          color: 'info'
        })
      }
    }
  } catch (error: any) {
    console.error('[AdminUserEdit] Search error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to search users.',
      color: 'error'
    })
  } finally {
    state.isLoading = false
  }
}

function selectUser(user: AdminUser) {
  state.selectedUser = user
  editForm.first_name = user.first_name || ''
  editForm.last_name = user.last_name || ''
  editForm.is_super_admin = user.is_super_admin || false
  fetchPropertyAccess(user.id)
}

async function fetchPropertyAccess(userId: string) {
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
      color: 'error'
    })
  }
}

async function onUpdateProfile(event: FormSubmitEvent<EditSchema>) {
  if (!state.selectedUser) return

  state.isLoading = true
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: event.data.first_name || null,
        last_name: event.data.last_name || null,
        is_super_admin: event.data.is_super_admin
      })
      .eq('id', state.selectedUser.id)
      .select()
      .single()

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Profile updated successfully.',
      color: 'success'
    })

    state.selectedUser = data
    emit('updated', state.selectedUser.id)
  } catch (error: any) {
    console.error('[AdminUserEdit] Update error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to update profile.',
      color: 'error'
    })
  } finally {
    state.isLoading = false
  }
}

async function handleGrantAccess() {
  if (!state.selectedUser || !state.newAccess.property_code || !state.newAccess.role) {
    toast.add({
      title: 'Validation Error',
      description: 'Please select both property and role.',
      color: 'error'
    })
    return
  }

  try {
    const { error } = await supabase
      .from('user_property_access')
      .insert({
        user_id: state.selectedUser.id,
        property_code: state.newAccess.property_code,
        role: state.newAccess.role
      })

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Property access granted.',
      color: 'success'
    })

    state.newAccess.property_code = ''
    state.newAccess.role = ''
    await fetchPropertyAccess(state.selectedUser.id)
  } catch (error: any) {
    console.error('[AdminUserEdit] Grant access error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to grant access.',
      color: 'error'
    })
  }
}

async function handleRevokeAccess(accessId: string) {
  if (!state.selectedUser) return

  try {
    const { error } = await supabase
      .from('user_property_access')
      .delete()
      .eq('id', accessId)

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Property access revoked.',
      color: 'success'
    })

    await fetchPropertyAccess(state.selectedUser.id)
  } catch (error: any) {
    console.error('[AdminUserEdit] Revoke access error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to revoke access.',
      color: 'error'
    })
  }
}

// Computed for table rows with property names
const accessRows = computed(() => {
  return state.propertyAccess.map(access => ({
    ...access,
    property_name: getPropertyName(access.property_code)
  }))
})
</script>

<template>
  <div class="space-y-6">
    <!-- User Search -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Search User</h2>
      </template>

      <div class="flex gap-2">
        <UInput
          v-model="state.searchQuery"
          placeholder="Search by email or name..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
      </div>

      <div v-if="state.isLoading" class="text-sm text-muted mt-2">
        Searching...
      </div>
    </UCard>

    <!-- Profile Editor -->
    <UCard v-if="state.selectedUser">
      <template #header>
        <h2 class="text-lg font-semibold">Edit Profile</h2>
        <p class="text-sm text-muted">{{ state.selectedUser.email }}</p>
      </template>

      <UForm :schema="editSchema" :state="editForm" class="space-y-4" @submit="onUpdateProfile">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="First Name" name="first_name">
            <UInput
              v-model="editForm.first_name"
              type="text"
              placeholder="John"
            />
          </UFormField>

          <UFormField label="Last Name" name="last_name">
            <UInput
              v-model="editForm.last_name"
              type="text"
              placeholder="Doe"
            />
          </UFormField>
        </div>

        <UFormField name="is_super_admin">
          <UCheckbox v-model="editForm.is_super_admin" label="Super Admin" />
        </UFormField>

        <div class="pt-2">
          <UButton type="submit" color="primary" :loading="state.isLoading">
            Update Profile
          </UButton>
        </div>
      </UForm>
    </UCard>

    <!-- Property Access Manager -->
    <UCard v-if="state.selectedUser">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Property Access</h2>
          <UBadge color="neutral" variant="subtle">
            {{ state.propertyAccess.length }} properties
          </UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Access Table -->
        <UTable :columns="accessColumns" :rows="accessRows">
          <template #property_code-cell="{ row }">
            <div class="flex items-center gap-2">
              <UBadge color="primary" variant="subtle">{{ row.property_code }}</UBadge>
              <span>{{ row.property_name }}</span>
            </div>
          </template>

          <template #role-cell="{ row }">
            <UBadge color="neutral" variant="outline">{{ row.role }}</UBadge>
          </template>

          <template #actions-cell="{ row }">
            <UButton
              color="error"
              variant="ghost"
              icon="i-heroicons-trash"
              size="xs"
              @click="handleRevokeAccess(row.id)"
            />
          </template>

          <template #empty>
            <div class="text-center py-8 text-muted">
              <UIcon name="i-heroicons-circle-stack" class="w-12 h-12 mx-auto mb-2" />
              <p>No property access granted yet.</p>
            </div>
          </template>
        </UTable>

        <!-- Add New Access -->
        <div class="border-t border-default pt-4">
          <h3 class="text-sm font-semibold mb-3">Grant New Access</h3>
          <div class="grid gap-3 md:grid-cols-3">
            <USelectMenu
              v-model="state.newAccess.property_code"
              :items="propertyOptions"
              placeholder="Select property"
              value-key="value"
            />
            <USelectMenu
              v-model="state.newAccess.role"
              :items="roleOptions"
              placeholder="Select role"
              value-key="value"
            />
            <UButton color="primary" @click="handleGrantAccess" block>
              Grant Access
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
