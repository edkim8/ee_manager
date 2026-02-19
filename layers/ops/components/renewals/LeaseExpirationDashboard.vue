<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { addMonths, format } from 'date-fns'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
} from 'chart.js'
import { useExpirationDashboard } from '../../composables/useExpirationDashboard'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement
)

const props = defineProps<{
  propertyCode: string
}>()

const { dashboardData, pending, error, fetch, saveTargets } = useExpirationDashboard(props.propertyCode)
const targetsContainer = ref<HTMLElement | null>(null)
const localTargets = ref<Record<string, number>>({})
const isSaving = ref(false)

// Fetch on mount
fetch()

// Watch for dashboard data changes and update local targets
watch(
  () => dashboardData.value?.targetDistribution,
  (newTargets) => {
    if (newTargets) {
      localTargets.value = { ...newTargets }
      nextTick(() => {
        if (targetsContainer.value) {
          targetsContainer.value.scrollTop = targetsContainer.value.scrollHeight
        }
      })
    }
  },
  { deep: true, immediate: true }
)

// Generate 24-month timeline (using date-fns to avoid month-end shift bugs)
const timeline = computed(() => {
  const months = []
  const today = new Date()

  for (let i = 0; i < 24; i++) {
    const d = addMonths(today, i)  // date-fns handles month-end correctly
    const monthKey = format(d, 'yyyy-MM')  // YYYY-MM format
    const label = format(d, 'MMM yyyy')     // "Jan 2026" format
    months.push({ label, key: monthKey })
  }
  return months
})

// Planning months (months 12-23 are editable for future planning)
const planningMonths = computed(() => {
  const months = new Set<string>()
  for (let i = 12; i < 24; i++) {
    months.add(timeline.value[i].key)
  }
  return months
})

// Net difference (totalUnits - sum of planning month targets)
const netDifference = computed(() => {
  if (!dashboardData.value) return 0

  const totalUnits = dashboardData.value.totalUnits || 0
  const sumOfPlanningMonthsTargets = Array.from(planningMonths.value).reduce(
    (sum, monthKey) => sum + (localTargets.value[monthKey] || 0),
    0
  )

  return totalUnits - sumOfPlanningMonthsTargets
})

// Chart data
const chartData = computed(() => {
  if (!dashboardData.value || dashboardData.value.totalUnits === 0) return null

  const labels = timeline.value.map(t => t.label)
  const monthKeys = timeline.value.map(t => t.key)

  const targetData = monthKeys.map(key => localTargets.value[key] || 0)
  const currentExpirationsData = monthKeys.map(key => {
    const found = dashboardData.value!.expirationCounts.find(c => c.expiration_month === key)
    return found?.lease_count || 0
  })

  // Forecast: Project current Y1 expirations into Y2 (months 12-23)
  const forecastData = Array(24).fill(0)
  for (let i = 0; i < 12; i++) {
    forecastData[i + 12] = currentExpirationsData[i]
  }

  const averagePerMonth = dashboardData.value.totalUnits / 12

  return {
    labels,
    datasets: [
      {
        label: 'Target',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        data: targetData,
        stack: 'group1',
      },
      {
        label: 'Forecast (from Y1)',
        backgroundColor: 'rgba(96, 165, 250, 0.5)',
        data: forecastData,
        stack: 'group1',
      },
      {
        label: 'Current Scheduled',
        backgroundColor: 'rgba(52, 211, 153, 0.7)',
        data: currentExpirationsData,
        stack: 'group1',
      },
      {
        label: 'Monthly Average',
        type: 'line' as const,
        borderColor: 'rgba(107, 114, 128, 0.7)',
        borderDash: [5, 5],
        data: Array(labels.length).fill(averagePerMonth),
        fill: false,
        pointRadius: 0,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  barPercentage: 2.5,
  categoryPercentage: 0.8,
  scales: {
    x: { stacked: false },
    y: { stacked: false, beginAtZero: true },
  },
  plugins: {},
}

const handleSaveTargets = async () => {
  isSaving.value = true
  const success = await saveTargets(localTargets.value)
  isSaving.value = false

  if (!success) {
    console.error('[Dashboard] Failed to save targets')
  }
}

const handleRefresh = async () => {
  await fetch()
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Lease Expiration Forecast</h3>
        <UButton
          icon="i-heroicons-arrow-path"
          @click="handleRefresh"
          variant="ghost"
          color="neutral"
        />
      </div>
    </template>

    <!-- Loading State -->
    <div
      v-if="pending"
      class="text-center h-[400px] flex items-center justify-center"
    >
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center text-red-500">
      Error loading dashboard data.
    </div>

    <!-- Dashboard Content -->
    <div v-else class="grid grid-cols-1 md:grid-cols-6 gap-8">
      <!-- Chart (5/6 width) -->
      <div class="md:col-span-5" style="height: 400px">
        <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>

      <!-- Targets Panel (1/6 width) -->
      <div class="space-y-4">
        <div class="flex items-baseline justify-between">
          <h4 class="font-medium">Monthly Targets</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Net Difference (Planning Year):
            <span
              class="font-bold"
              :class="netDifference >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ netDifference }}
            </span>
          </p>
        </div>

        <!-- Target Inputs -->
        <div
          ref="targetsContainer"
          class="max-h-[350px] overflow-y-auto space-y-2 pr-2"
        >
          <UFormField
            v-for="month in timeline"
            :key="month.key"
            :label="month.label"
          >
            <UInput
              type="number"
              v-model.number="localTargets[month.key]"
              :disabled="!planningMonths.has(month.key)"
            />
          </UFormField>
        </div>

        <!-- Save Button -->
        <UButton
          @click="handleSaveTargets"
          label="Save Targets"
          icon="i-heroicons-check-circle"
          :loading="isSaving"
          block
        />
      </div>
    </div>
  </UCard>
</template>
