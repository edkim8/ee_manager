<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { signIn } = useAuth()
const toast = useToast()

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

type Schema = z.output<typeof schema>

const state = reactive({
  email: '',
  password: ''
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  const { error } = await signIn(event.data.email, event.data.password)

  if (error) {
    toast.add({
      title: 'Login Failed',
      description: error.message,
      color: 'red'
    })
    loading.value = false
    return
  }

  await navigateTo('/dashboard')
}
</script>

<template>
  <UCard class="w-full max-w-md">
    <template #header>
      <h1 class="text-2xl font-bold text-center">EE Manager</h1>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" placeholder="you@example.com" />
      </UFormField>

      <UFormField label="Password" name="password">
        <UInput v-model="state.password" type="password" placeholder="Enter your password" />
      </UFormField>

      <UButton type="submit" block :loading="loading">
        Sign In
      </UButton>
    </UForm>
  </UCard>
</template>
