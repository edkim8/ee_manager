<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const user = useSupabaseUser()
</script>

<template>
  <div class="space-y-6">
    <!-- Greeting -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Welcome back, {{ user?.email }}
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        Here's what's happening with your properties today.
      </p>
    </div>

    <!-- Stats Placeholders -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
            <UIcon name="i-heroicons-building-office" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Properties</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">--</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
            <UIcon name="i-heroicons-key" class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Units</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">--</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <UIcon name="i-heroicons-users" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Residents</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">--</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Open Tasks</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">--</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions Placeholder -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
      </template>
      <div class="flex flex-wrap gap-3">
        <UButton to="/assets/properties" variant="soft" icon="i-heroicons-building-office">
          View Properties
        </UButton>
        <UButton to="/office/residents" variant="soft" icon="i-heroicons-users">
          View Residents
        </UButton>
        <UButton to="/user/profile" variant="soft" icon="i-heroicons-user-circle">
          My Profile
        </UButton>
      </div>
    </UCard>
  </div>
</template>
