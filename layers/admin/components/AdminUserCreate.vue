<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const supabase = useSupabaseClient()
const toast = useToast()

const emit = defineEmits<{
  created: [userId: string]
}>()

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_super_admin: z.boolean().default(false)
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
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
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">Create New User</h2>
      <p class="text-sm text-muted mt-1">
        Create a new user account with email and password.
      </p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <div class="space-y-4 pb-4 border-b border-default">
        <h3 class="text-sm font-semibold">Account Credentials</h3>

        <UFormField label="Email Address" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="user@example.com"
            icon="i-heroicons-envelope"
          />
        </UFormField>

        <UFormField label="Password" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            placeholder="Minimum 6 characters"
            icon="i-heroicons-lock-closed"
          />
        </UFormField>
      </div>

      <div class="space-y-4">
        <h3 class="text-sm font-semibold">Profile Information</h3>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="First Name" name="first_name">
            <UInput
              v-model="state.first_name"
              type="text"
              placeholder="John"
              icon="i-heroicons-user"
            />
          </UFormField>

          <UFormField label="Last Name" name="last_name">
            <UInput
              v-model="state.last_name"
              type="text"
              placeholder="Doe"
              icon="i-heroicons-user"
            />
          </UFormField>
        </div>

        <UFormField name="is_super_admin">
          <UCheckbox v-model="state.is_super_admin" label="Grant Super Admin privileges" />
        </UFormField>
      </div>

      <div class="pt-2">
        <UButton type="submit" color="primary" :loading="loading" block>
          Create User
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>
