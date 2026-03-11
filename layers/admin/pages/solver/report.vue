<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { data, pending, error, refresh } = await useFetch('/api/solver/email-preview', {
  lazy: true,
})
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Live Solver Report</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Rendered from the most recent completed solver run
        </p>
      </div>
      <div class="flex gap-3">
        <UButton
          icon="i-heroicons-arrow-path"
          variant="outline"
          :loading="pending"
          @click="refresh()"
        >
          Refresh
        </UButton>
        <UButton
          icon="i-heroicons-question-mark-circle"
          variant="soft"
          color="gray"
          to="/solver/report-help"
        >
          Report Guide
        </UButton>
      </div>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-24">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-indigo-500 animate-spin" />
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950 p-6 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mx-auto mb-3" />
      <p class="font-semibold text-red-800 dark:text-red-200">Failed to load report</p>
      <p class="text-sm text-red-600 dark:text-red-400 mt-1">{{ error.message }}</p>
    </div>

    <div v-else-if="data?.html">
      <!-- Email HTML rendered inline -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="data.html" />
    </div>

    <div v-else class="text-center py-24 text-gray-400">
      No report data available.
    </div>
  </div>
</template>
