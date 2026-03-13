<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

// ── Date helpers ────────────────────────────────────────────────────────────
function toMonday(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDay() // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addWeeks(isoDate: string, weeks: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

const thisMonday = toMonday(new Date().toISOString().split('T')[0])
// A known Monday far in the past — used as the step anchor for the date input
const STEP_ANCHOR = '2025-01-06' // confirmed Monday

// The selected week-start Monday. Empty string = this week.
const selectedMonday = ref(thisMonday)

// When true, show full pipeline (no truncation). Default: overdue + 7 days only.
const showAllPipeline = ref(false)

const weekEnd = computed(() => {
  const d = new Date(selectedMonday.value + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
})

const isThisWeek = computed(() => selectedMonday.value === thisMonday)

function goToThisWeek() {
  selectedMonday.value = thisMonday
}

function goToPrevWeek() {
  selectedMonday.value = addWeeks(selectedMonday.value, -1)
}

function goToNextWeek() {
  if (isThisWeek.value) return
  const next = addWeeks(selectedMonday.value, 1)
  selectedMonday.value = next > thisMonday ? thisMonday : next
}

// Snap any picked date to its Monday
function onDateChange(value: string) {
  if (!value) return
  selectedMonday.value = toMonday(value)
}

// ── Data fetch ──────────────────────────────────────────────────────────────
const { data, pending, error, refresh } = useFetch(
  () => {
    const params = new URLSearchParams({ date: selectedMonday.value })
    if (showAllPipeline.value) params.set('showAll', '1')
    return `/api/solver/weekly-preview?${params.toString()}`
  },
  { lazy: true }
)

const weekLabel = computed(() =>
  data.value?.weekStartDate && data.value?.weekEndDate
    ? formatWeekRange(data.value.weekStartDate, data.value.weekEndDate)
    : selectedMonday.value ? formatWeekRange(selectedMonday.value, weekEnd.value) : ''
)
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Weekly Report</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ weekLabel }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Week navigation -->
        <UButton
          icon="i-heroicons-chevron-left"
          variant="ghost"
          size="sm"
          title="Previous week"
          @click="goToPrevWeek"
        />
        <UInput
          :model-value="selectedMonday"
          type="date"
          :max="thisMonday"
          :min="STEP_ANCHOR"
          step="7"
          size="sm"
          class="w-40"
          title="Select a Monday to view that week's report"
          @update:model-value="onDateChange($event as string)"
        />
        <UButton
          icon="i-heroicons-chevron-right"
          variant="ghost"
          size="sm"
          :disabled="isThisWeek"
          title="Next week"
          @click="goToNextWeek"
        />

        <UDivider orientation="vertical" class="h-6 mx-1" />

        <!-- This week shortcut -->
        <UButton
          icon="i-heroicons-calendar"
          variant="soft"
          color="primary"
          size="sm"
          :disabled="isThisWeek"
          title="Jump to this week"
          @click="goToThisWeek"
        >
          This Week
        </UButton>

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

        <!-- Availability Analysis -->
        <UButton
          icon="i-heroicons-chart-bar"
          variant="soft"
          color="neutral"
          size="sm"
          to="/office/availabilities/analysis"
        >
          Availability Analysis
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

        <!-- Report Guide -->
        <UButton
          icon="i-heroicons-question-mark-circle"
          variant="soft"
          color="neutral"
          size="sm"
          to="/solver/weekly-report-help"
        >
          Guide
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-24">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-blue-500 animate-spin" />
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

    <!-- Report HTML -->
    <div v-else-if="data?.html">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="data.html" />
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-24 text-gray-400">
      No weekly report data available.
    </div>
  </div>
</template>
