<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const today = new Date().toISOString().split('T')[0]

// Empty string means "most recent run" — matches the API default behaviour.
const selectedDate = ref('')

// When true, show full pipeline (no truncation). Default: truncated to overdue + 7 days.
const showAllPipeline = ref(false)

// Reactive fetch: re-requests automatically when selectedDate or showAllPipeline changes.
const { data, pending, error, refresh } = useFetch(
  () => {
    const base = `/api/solver/email-preview`
    const params = new URLSearchParams()
    if (selectedDate.value) params.set('date', selectedDate.value)
    if (showAllPipeline.value) params.set('showAll', '1')
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  },
  { lazy: true }
)

const displayDate = computed(() => {
  if (!data.value?.run?.upload_date) return null
  return new Date(data.value.run.upload_date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
})

// Navigate to the day before the currently displayed run.
function goToPrevDay() {
  const base = selectedDate.value || data.value?.run?.upload_date?.split('T')[0] || today
  const d = new Date(base)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d.toISOString().split('T')[0]
}

// Navigate forward. When we reach today, clear selectedDate so the API
// returns the most recent run (which may have been uploaded mid-day).
function goToNextDay() {
  if (!selectedDate.value) return
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  const next = d.toISOString().split('T')[0]
  selectedDate.value = next >= today ? '' : next
}

// Fetch the structured audit text payload and copy it to the clipboard.
const copyLoading = ref(false)
const copySuccess = ref(false)

async function copyAuditPayload() {
  copyLoading.value = true
  copySuccess.value = false
  try {
    const dateArg = selectedDate.value || data.value?.run?.upload_date?.split('T')[0] || ''
    const res = await $fetch<{ text: string }>(
      `/api/solver/audit-export${dateArg ? `?date=${dateArg}` : ''}`
    )
    await navigator.clipboard.writeText(res.text)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 3000)
  } catch (e) {
    console.error('[report] Failed to copy audit payload:', e)
  } finally {
    copyLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Solver Report</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <template v-if="displayDate">
            {{ displayDate }}
            <span
              v-if="data?.run?.batch_id"
              class="ml-2 font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
            >
              {{ data.run.batch_id }}
            </span>
          </template>
          <template v-else-if="!selectedDate">
            Most recent completed run
          </template>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Date navigation -->
        <UButton
          icon="i-heroicons-chevron-left"
          variant="ghost"
          size="sm"
          title="Previous day"
          @click="goToPrevDay"
        />
        <UInput
          v-model="selectedDate"
          type="date"
          :max="today"
          size="sm"
          class="w-40"
        />
        <UButton
          icon="i-heroicons-chevron-right"
          variant="ghost"
          size="sm"
          :disabled="!selectedDate"
          title="Next day"
          @click="goToNextDay"
        />

        <UDivider orientation="vertical" class="h-6 mx-1" />

        <!-- Pipeline toggle -->
        <UButton
          :icon="showAllPipeline ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          variant="soft"
          :color="showAllPipeline ? 'primary' : 'neutral'"
          size="sm"
          title="Toggle full pipeline view"
          @click="showAllPipeline = !showAllPipeline"
        >
          {{ showAllPipeline ? 'Compact Pipeline' : 'Full Pipeline' }}
        </UButton>

        <UDivider orientation="vertical" class="h-6 mx-1" />

        <!-- Copy audit payload — eliminates console-log copy-paste from daily audit workflow -->
        <UButton
          :icon="copySuccess ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
          :color="copySuccess ? 'green' : 'gray'"
          variant="soft"
          size="sm"
          :loading="copyLoading"
          title="Copy structured audit payload to clipboard — paste into daily audit prompt"
          @click="copyAuditPayload"
        >
          {{ copySuccess ? 'Copied!' : 'Copy Audit Payload' }}
        </UButton>

        <!-- Refresh -->
        <UButton
          icon="i-heroicons-arrow-path"
          variant="outline"
          size="sm"
          :loading="pending"
          @click="refresh()"
        >
          Refresh
        </UButton>

        <UButton
          icon="i-heroicons-question-mark-circle"
          variant="soft"
          color="gray"
          size="sm"
          to="/solver/report-help"
        >
          Guide
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-24">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-indigo-500 animate-spin" />
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950 p-6 text-center"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mx-auto mb-3" />
      <p class="font-semibold text-red-800 dark:text-red-200">Failed to load report</p>
      <p class="text-sm text-red-600 dark:text-red-400 mt-1">{{ error.message }}</p>
    </div>

    <!-- Report HTML (rendered inline from email template) -->
    <div v-else-if="data?.html">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="data.html" />
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-24 text-gray-400">
      No report data available.
    </div>
  </div>
</template>
