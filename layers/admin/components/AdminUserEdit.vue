<script setup lang="ts">
import { reactive, watch, onMounted, computed } from 'vue'
import { useSupabaseClient, useToast } from '#imports'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { PROPERTY_LIST, getPropertyName } from '../../base/constants/properties'
import { USER_ROLES, DEPARTMENTS } from '../types/admin'
import type { AdminUser, UserPropertyAccess, UserPropertyRole, Department } from '../types/admin'

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

const departmentOptions = DEPARTMENTS.map(d => ({
  label: d,
  value: d
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
  department: z.string().optional().nullable(),
  is_super_admin: z.boolean().default(false)
})

type EditSchema = z.output<typeof editSchema>

const editForm = reactive<EditSchema>({
  first_name: '',
  last_name: '',
  department: '',
  is_super_admin: false
})

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
  editForm.department = user.department || ''
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
        department: event.data.department || null,
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
    await $fetch('/api/users/access', {
      method: 'POST',
      body: {
        user_id: state.selectedUser.id,
        property_code: state.newAccess.property_code,
        role: state.newAccess.role
      }
    })

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
      description: error.data?.message || 'Failed to grant access.',
      color: 'error'
    })
  }
}

async function handleRevokeAccess(accessId: string) {
  if (!state.selectedUser) return

  try {
    await $fetch(`/api/users/access?id=${accessId}`, {
      method: 'DELETE'
    })

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
      description: error.data?.message || 'Failed to revoke access.',
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
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Profile & Search -->
    <div class="space-y-8">
      <!-- User Search -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400" />
            <h2 class="text-lg font-semibold">Find User</h2>
          </div>
        </template>

        <div class="flex gap-2">
          <UInput
            v-model="state.searchQuery"
            placeholder="Search by email or name..."
            variant="outline"
            class="flex-1"
          />
        </div>

        <div v-if="state.isLoading" class="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
          Searching database...
        </div>
      </UCard>

      <!-- Profile Editor -->
      <UCard v-if="state.selectedUser">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
            <span class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">
              {{ state.selectedUser.id.substring(0, 8) }}...
            </span>
          </div>
        </template>

        <UForm :schema="editSchema" :state="editForm" class="space-y-6" @submit="onUpdateProfile">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
            <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              {{ state.selectedUser.email }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="First Name" name="first_name">
              <UInput
                v-model="editForm.first_name"
                placeholder="John"
              />
            </UFormField>

            <UFormField label="Last Name" name="last_name">
              <UInput
                v-model="editForm.last_name"
                placeholder="Doe"
              />
            </UFormField>
          </div>

          <UFormField label="Department" name="department">
            <USelectMenu
              v-model="editForm.department"
              :items="departmentOptions"
              placeholder="Select department"
              value-key="value"
            />
          </UFormField>

          <div class="flex items-center justify-between p-4 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-xl">
            <div class="space-y-0.5">
              <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">Super Admin Access</p>
              <p class="text-xs text-primary-700/70 dark:text-primary-400/60">Grant full access to all system modules</p>
            </div>
            <UCheckbox v-model="editForm.is_super_admin" />
          </div>

          <div class="pt-2">
            <UButton type="submit" color="primary" icon="i-heroicons-check" :loading="state.isLoading" block>
              Save Changes
            </UButton>
          </div>
        </UForm>
      </UCard>
    </div>

    <!-- Property Access Manager -->
    <div class="space-y-8">
      <UCard v-if="state.selectedUser">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-lock-closed" class="w-5 h-5 text-gray-400" />
              <h2 class="text-lg font-semibold">Property Access</h2>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {{ state.propertyAccess.length }} Active
            </span>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Custom Access Table -->
          <div class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th class="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Property</th>
                  <th class="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Role</th>
                  <th class="px-4 py-3 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-if="accessRows.length === 0">
                  <td colspan="3" class="px-4 py-12 text-center text-gray-400 text-sm italic">
                    No property access granted yet
                  </td>
                </tr>
                <tr 
                  v-for="row in accessRows" 
                  :key="row.id"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                >
                  <td class="px-4 py-3">
                    <div class="flex flex-col">
                      <span class="text-sm font-bold text-gray-900 dark:text-white">{{ row.property_code }}</span>
                      <span class="text-xs text-gray-500">{{ row.property_name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {{ row.role }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      size="sm"
                      @click="handleRevokeAccess(row.id)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add New Access -->
          <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50">
            <h3 class="text-sm font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 text-primary-500" />
              Grant New Property Access
            </h3>
            <div class="grid gap-4">
              <USelectMenu
                v-model="state.newAccess.property_code"
                :items="propertyOptions"
                placeholder="Select property"
                value-key="value"
                class="w-full"
              />
              <USelectMenu
                v-model="state.newAccess.role"
                :items="roleOptions"
                placeholder="Select role"
                value-key="value"
                class="w-full"
              />
              <UButton color="neutral" variant="soft" icon="i-heroicons-key" @click="handleGrantAccess" block>
                Grant Access
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
      
      <!-- Select User Prompt -->
      <div v-else class="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
        <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-user" class="w-8 h-8 text-gray-300" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Admin Access Controller</h3>
        <p class="text-sm text-gray-500 mt-2 max-w-[240px]">Search and select a user on the left to manage their permissions.</p>
      </div>
    </div>
  </div>
</template>
