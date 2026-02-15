<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupabaseClient, useSupabaseUser, useToast, useHead } from '#imports'
import { usePropertyState } from '../../composables/usePropertyState'

definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'My Profile'
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()
const { userContext } = usePropertyState()

// Password update state
const newPassword = ref('')
const confirmPassword = ref('')
const updatingPassword = ref(false)

const profile = computed(() => userContext.value?.profile || {
  first_name: '',
  last_name: '',
  full_name: user.value?.email?.split('@')[0] || 'User',
  department: 'External'
})

const access = computed(() => userContext.value?.access || {
  is_super_admin: false,
  allowed_codes: []
})

// Compute initials
const userInitials = computed(() => {
  if (profile.value.first_name && profile.value.last_name) {
    return (profile.value.first_name.charAt(0) + profile.value.last_name.charAt(0)).toUpperCase()
  }
  const parts = profile.value.full_name?.split(' ') || []
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  return (profile.value.full_name?.charAt(0) || 'U').toUpperCase()
})

async function handlePasswordUpdate() {
  if (!newPassword.value) return
  
  if (newPassword.value !== confirmPassword.value) {
    toast.add({
      title: 'Error',
      description: 'Passwords do not match.',
      color: 'error'
    })
    return
  }

  if (newPassword.value.length < 6) {
    toast.add({
      title: 'Error',
      description: 'Password must be at least 6 characters.',
      color: 'error'
    })
    return
  }

  updatingPassword.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value
    })

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Password updated successfully.',
      color: 'success'
    })
    
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to update password.',
      color: 'error'
    })
  } finally {
    updatingPassword.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-8">
    <!-- Header Section -->
    <div class="flex items-center gap-6 pb-8 border-b border-gray-200 dark:border-gray-800">
      <UAvatar
        size="xl"
        :alt="profile.full_name"
        :text="userInitials"
        class="w-20 h-20 text-2xl"
      />
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          <template v-if="profile.first_name || profile.last_name">
            {{ profile.first_name }} {{ profile.last_name }}
          </template>
          <template v-else>
            {{ profile.full_name }}
          </template>
        </h1>
        <div class="flex items-center gap-2 mt-1">
          <UBadge v-if="access.is_super_admin" color="primary" variant="subtle">Super Admin</UBadge>
          <span class="text-gray-500 dark:text-gray-400">{{ profile.department }}</span>
          <span class="text-gray-300 dark:text-gray-600">•</span>
          <span class="text-gray-500 dark:text-gray-400">{{ user?.email }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Property Access Section -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-building-office" class="text-primary-500" />
          Property Access
        </h2>
        <UCard>
          <div v-if="access.allowed_codes.length > 0" class="space-y-3">
            <div v-for="code in access.allowed_codes" :key="code" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span class="font-mono font-bold text-primary-600">{{ code }}</span>
              <span class="text-sm text-gray-600 dark:text-gray-400">Authorized Territory</span>
            </div>
            <p v-if="access.is_super_admin" class="text-xs text-primary-500 italic pt-2">
              Note: As a Super Admin, you have access to all system properties.
            </p>
          </div>
          <div v-else class="text-center py-6">
            <UIcon name="i-heroicons-shield-exclamation" class="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p class="text-gray-500">No specific property access assigned.</p>
          </div>
        </UCard>
      </div>

      <!-- Security Section -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-lock-closed" class="text-primary-500" />
          Security
        </h2>
        <UCard>
          <form @submit.prevent="handlePasswordUpdate" class="space-y-4">
            <UFormField label="New Password" help="At least 6 characters.">
              <UInput
                v-model="newPassword"
                type="password"
                placeholder="••••••••"
                icon="i-heroicons-key"
              />
            </UFormField>
            
            <UFormField label="Confirm Password">
              <UInput
                v-model="confirmPassword"
                type="password"
                placeholder="••••••••"
                icon="i-heroicons-check-badge"
              />
            </UFormField>

            <UButton
              type="submit"
              color="primary"
              block
              :loading="updatingPassword"
              :disabled="!newPassword || newPassword !== confirmPassword"
            >
              Update Password
            </UButton>
          </form>
        </UCard>
      </div>
    </div>
  </div>
</template>
