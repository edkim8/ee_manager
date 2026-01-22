<script setup lang="ts">
definePageMeta({
  middleware: 'admin'
})

useHead({
  title: 'User Management'
})

// Active tab state
const activeTab = ref(0)

// Tab items
const items = [
  {
    label: 'Create User',
    icon: 'i-heroicons-user-plus',
    slot: 'create'
  },
  {
    label: 'Edit User',
    icon: 'i-heroicons-pencil-square',
    slot: 'edit'
  }
]
</script>

<template>
  <div class="p-4 max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
    </div>

    <!-- Simple Tab Buttons -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 0"
          :class="[
            activeTab === 0
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2'
          ]"
        >
          <UIcon name="i-heroicons-user-plus" class="w-5 h-5" />
          Create User
        </button>
        <button
          @click="activeTab = 1"
          :class="[
            activeTab === 1
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2'
          ]"
        >
          <UIcon name="i-heroicons-pencil-square" class="w-5 h-5" />
          Edit User
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="py-4">
      <div v-show="activeTab === 0">
        <AdminUserCreate />
      </div>
      <div v-show="activeTab === 1">
        <AdminUserEdit />
      </div>
    </div>
  </div>
</template>
