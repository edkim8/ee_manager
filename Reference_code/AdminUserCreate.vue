<script setup lang="ts">
import { DEPARTMENTS } from '../../base/constants/app-constants'

const departmentOptions = DEPARTMENTS

const toast = useToast()

// Page Controller Pattern
const state = reactive({
  isLoading: false,
  form: {
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department: '',
    phone: '',
    organization_name: ''
  }
})


// Actions
const handleCreateUser = async () => {
  // Validate required fields (only email and password are required)
  if (!state.form.email || !state.form.password) {
    toast.add({
      title: 'Validation Error',
      description: 'Email and password are required.',
      color: 'red'
    })
    return
  }

  if (state.form.password.length < 6) {
    toast.add({
      title: 'Validation Error',
      description: 'Password must be at least 6 characters.',
      color: 'red'
    })
    return
  }

  state.isLoading = true
  try {
    const response = await $fetch('/api/users/create', {
      method: 'POST',
      body: {
        email: state.form.email,
        password: state.form.password,
        first_name: state.form.first_name || null,
        last_name: state.form.last_name || null,
        department: state.form.department || null,
        phone: state.form.phone || null,
        organization_name: state.form.organization_name || null
      }
    })

    toast.add({
      title: 'Success',
      description: `User ${state.form.email} created successfully.`,
      color: 'green'
    })

    // Reset form
    state.form.email = ''
    state.form.password = ''
    state.form.first_name = ''
    state.form.last_name = ''
    state.form.department = ''
    state.form.phone = ''
    state.form.organization_name = ''
  } catch (error: any) {
    console.error('[AdminUserCreate] Error:', error)
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to create user.',
      color: 'red'
    })
  } finally {
    state.isLoading = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">Create New User</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Required fields: Email and Password. All other fields are optional.
      </p>
    </template>

    <form @submit.prevent="handleCreateUser" class="space-y-4">
      <!-- Required Fields -->
      <div class="space-y-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Account Credentials *</h3>
        
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Email Address *</label>
          <UInput 
            v-model="state.form.email" 
            type="email" 
            placeholder="user@example.com"
            icon="i-heroicons-envelope"
            class="w-full"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Password *</label>
          <UInput 
            v-model="state.form.password" 
            type="password" 
            placeholder="Minimum 6 characters"
            icon="i-heroicons-lock-closed"
            class="w-full"
          />
        </div>
      </div>

      <!-- Optional Profile Fields -->
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Profile Information (Optional)</h3>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">First Name</label>
            <UInput 
              v-model="state.form.first_name" 
              type="text" 
              placeholder="John"
              icon="i-heroicons-user"
              class="w-full"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Last Name</label>
            <UInput 
              v-model="state.form.last_name" 
              type="text" 
              placeholder="Doe"
              icon="i-heroicons-user"
              class="w-full"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Department</label>
          <USelectMenu 
            v-model="state.form.department" 
            :items="DEPARTMENTS"
            class="w-full"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Phone</label>
          <UInput 
            v-model="state.form.phone" 
            type="tel" 
            placeholder="(555) 123-4567"
            icon="i-heroicons-phone"
            class="w-full"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Organization Name</label>
          <UInput 
            v-model="state.form.organization_name" 
            type="text" 
            placeholder="Company or organization"
            icon="i-heroicons-building-office"
            class="w-full"
          />
        </div>
      </div>

      <div class="pt-2">
        <UButton 
          type="submit" 
          color="primary" 
          :loading="state.isLoading"
          label="Create User"
          block
        />
      </div>
    </form>
  </UCard>
</template>
