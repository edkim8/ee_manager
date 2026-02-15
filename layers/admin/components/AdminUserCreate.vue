<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useSupabaseClient, useToast } from '#imports'
import { DEPARTMENTS } from '../types/admin'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const supabase = useSupabaseClient()
const toast = useToast()

const emit = defineEmits<{
  created: [userId: string]
}>()

const departmentOptions = DEPARTMENTS.map(d => ({
  label: d,
  value: d
}))

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  department: z.string().optional().nullable(),
  is_super_admin: z.boolean().default(false)
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  department: '',
  is_super_admin: false
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  try {
    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: event.data.email,
      password: event.data.password,
      options: {
        data: {
          first_name: event.data.first_name || null,
          last_name: event.data.last_name || null,
          department: event.data.department || null,
          is_super_admin: event.data.is_super_admin
        }
      }
    })

    if (authError) throw authError

    if (!authData.user) {
      throw new Error('User creation failed - no user returned')
    }

    // Update profile with additional fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: event.data.first_name || null,
        last_name: event.data.last_name || null,
        department: event.data.department || null,
        is_super_admin: event.data.is_super_admin
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.warn('[AdminUserCreate] Profile update warning:', profileError)
    }

    toast.add({
      title: 'Success',
      description: `User ${event.data.email} created successfully.`,
      color: 'success'
    })

    // Reset form
    state.email = ''
    state.password = ''
    state.first_name = ''
    state.last_name = ''
    state.department = ''
    state.is_super_admin = false

    emit('created', authData.user.id)
  } catch (error: any) {
    console.error('[AdminUserCreate] Error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to create user.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <UIcon name="i-heroicons-user-plus" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Create New User</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Set up identity and system privileges</p>
          </div>
        </div>
      </template>

      <UForm :schema="schema" :state="state" class="space-y-8" @submit="onSubmit">
        <!-- Account Section -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
            <h3 class="text-sm font-bold uppercase tracking-widest text-gray-400">Account Credentials</h3>
          </div>

          <div class="grid gap-6">
            <UFormField label="Email Address" name="email" required>
              <UInput
                v-model="state.email"
                type="email"
                placeholder="user@example.com"
                icon="i-heroicons-envelope"
              />
            </UFormField>

            <UFormField label="Temporary Password" name="password" required>
              <UInput
                v-model="state.password"
                type="password"
                placeholder="Minimum 6 characters"
                icon="i-heroicons-lock-closed"
              />
            </UFormField>
          </div>
        </div>

        <hr class="border-gray-100 dark:border-gray-800" />

        <!-- Profile Section -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
            <h3 class="text-sm font-bold uppercase tracking-widest text-gray-400">Profile Information</h3>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <UFormField label="First Name" name="first_name">
              <UInput
                v-model="state.first_name"
                placeholder="John"
              />
            </UFormField>

            <UFormField label="Last Name" name="last_name">
              <UInput
                v-model="state.last_name"
                placeholder="Doe"
              />
            </UFormField>
          </div>

          <UFormField label="Department" name="department">
            <USelectMenu
              v-model="state.department"
              :items="departmentOptions"
              placeholder="Select department"
              value-key="value"
            />
          </UFormField>

          <div class="mt-4 p-4 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-xl flex items-center justify-between">
            <div class="space-y-0.5">
              <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">Super Admin Privileges</p>
              <p class="text-xs text-primary-700/70 dark:text-primary-400/60">Allow user to manage all system settings and users</p>
            </div>
            <UCheckbox v-model="state.is_super_admin" />
          </div>
        </div>

        <div class="pt-6">
          <UButton type="submit" color="primary" size="lg" :loading="loading" block>
            Create System User
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
