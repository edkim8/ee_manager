<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { Bar } from 'vue-chartjs';
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
} from 'chart.js';
import { useExpirationDashboardData } from '@/composables/fetchers/renewals/useExpirationDashboardData';
import { useSaveTargets } from '@/composables/mutations/renewals/useSaveTargets';
import { useCookie } from '#imports';
import { addMonths, format } from 'date-fns';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement
);

const selectedPropertyCookie = useCookie<string | null>('selected');
const { dashboardData, pending, error, refresh } = useExpirationDashboardData();
const { saveTargets, loading: isSaving } = useSaveTargets();

const targetsContainer = ref<HTMLElement | null>(null);
const localTargets = ref<Record<string, number>>({});

watch(
  () => dashboardData.value?.targetDistribution,
  (newTargets) => {
    if (newTargets) {
      localTargets.value = { ...newTargets };
      nextTick(() => {
        if (targetsContainer.value) {
          targetsContainer.value.scrollTop =
            targetsContainer.value.scrollHeight;
        }
      });
    }
  },
  { deep: true, immediate: true }
);

const timeline = computed(() => {
  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = addMonths(new Date(), i);
    months.push({
      label: format(d, 'MMM yyyy'),
      key: format(d, 'yyyy-MM'),
    });
  }
  return months;
});

// This constant defines which months are editable
const planningMonths = (() => {
  const months = new Set<string>();
  for (let i = 12; i < 24; i++) {
    const d = addMonths(new Date(), i);
    months.add(format(d, 'yyyy-MM'));
  }
  return months;
})();

// --- THIS IS THE FIX ---
// The netDifference calculation is now tied to the 'planningMonths'.
const netDifference = computed(() => {
  if (!dashboardData.value) return 0;

  const totalUnits = dashboardData.value.totalUnits || 0;

  // Sum the targets for only the 12 months in the planning period.
  const sumOfPlanningMonthsTargets = Array.from(planningMonths).reduce(
    (sum, monthKey) => {
      return sum + (localTargets.value[monthKey] || 0);
    },
    0
  );

  // The goal is to distribute the total units over a 12-month period.
  return totalUnits - sumOfPlanningMonthsTargets;
});

const chartData = computed(() => {
  if (!dashboardData.value || dashboardData.value.totalUnits === 0) return null;

  const labels = timeline.value.map((t) => t.label);
  const monthKeys = timeline.value.map((t) => t.key);

  const targetData = monthKeys.map((key) => localTargets.value[key] || 0);
  const currentExpirationsData = monthKeys.map(
    (key) =>
      dashboardData.value.expirationCounts.find(
        (c) => c.expiration_month === key
      )?.lease_count || 0
  );

  const forecastData = Array(24).fill(0);
  for (let i = 0; i < 12; i++) {
    forecastData[i + 12] = currentExpirationsData[i];
  }

  const averagePerMonth = dashboardData.value.totalUnits / 12;

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
        type: 'line',
        borderColor: 'rgba(107, 114, 128, 0.7)',
        borderDash: [5, 5],
        data: Array(labels.length).fill(averagePerMonth),
        fill: false,
        pointRadius: 0,
      },
    ],
  };
});

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
};

const handleSaveTargets = async () => {
  if (selectedPropertyCookie.value) {
    const success = await saveTargets(
      selectedPropertyCookie.value,
      localTargets.value
    );
    if (success) {
      refresh();
    }
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Lease Expiration Forecast</h3>
        <UButton
          icon="i-heroicons-arrow-path"
          @click="refresh"
          variant="ghost"
          color="neutral"
        />
      </div>
    </template>
    <div
      v-if="pending"
      class="text-center h-[400px] flex items-center justify-center"
    >
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl" />
    </div>
    <div v-else-if="error" class="text-center text-red-500">
      Error loading dashboard data.
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="md:col-span-2" style="height: 400px">
        <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
      <div class="space-y-4">
        <div class="flex items-baseline justify-between">
          <h4 class="font-medium">Monthly Targets</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <!-- The label is now clearer -->
            Net Difference (Planning Year):
            <span
              class="font-bold"
              :class="netDifference >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ netDifference }}
            </span>
          </p>
        </div>
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
        <UButton
          @click="handleSaveTargets"
          label="Save Targets"
          icon="i-heroicons-check-circle"
          :loading="isSaving"
        />
      </div>
    </div>
  </UCard>
</template>
