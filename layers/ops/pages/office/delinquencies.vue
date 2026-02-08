<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { definePageMeta, usePropertyState } from '#imports'
import { useDelinquenciesAnalysis } from '../../composables/useDelinquenciesAnalysis'

definePageMeta({
  layout: 'dashboard'
})

const { activeProperty } = usePropertyState()
const { summary, snapshots, dailyTrend, loading, error, fetchSummary, fetchSnapshots, fetchDailyTrend } = useDelinquenciesAnalysis()

async function loadData() {
  await Promise.all([
    fetchSummary(),
    fetchSnapshots(6),
    fetchDailyTrend()
  ])
}

onMounted(loadData)

// Re-fetch when property changes
watch(activeProperty, loadData)

// Chart Logic (Simple SVG implementation for Total Unpaid Trend)
const trendData = computed(() => {
  if (!snapshots.value || snapshots.value.length === 0) return []
  return [...snapshots.value].reverse()
})

const chartConfig = computed(() => {
  if (trendData.value.length === 0) return null
  const values = trendData.value.map(s => Number(s.total_unpaid))
  const max = Math.max(...values, 1000) * 1.2
  const width = 600
  const height = 150
  const padding = 40
  const points = values.map((val, i) => ({
    x: padding + (i * ((width - (padding * 2)) / Math.max(values.length - 1, 1))),
    y: height - padding - ((val / max) * (height - (padding * 2))),
    value: val
  }))
  const d = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')
  return { width, height, padding, max, points, d }
})

// Daily Trend Logic
const dailyChartConfig = computed(() => {
  if (!dailyTrend.value || dailyTrend.value.length === 0) return null
  const values = dailyTrend.value.map(s => Number(s.total_unpaid_sum))
  const max = Math.max(...values, 1000) * 1.2
  const width = 600
  const height = 150
  const padding = 40
  const points = values.map((val, i) => ({
    x: padding + (i * ((width - (padding * 2)) / Math.max(values.length - 1, 1))),
    y: height - padding - ((val / max) * (height - (padding * 2))),
    value: val,
    date: dailyTrend.value[i].snapshot_date
  }))
  const d = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')
  return { width, height, padding, max, points, d }
})

const getSafeWidth = (part: number, total: number) => {
  if (!total || total <= 0) return '0%'
  return `${Math.max(0, (part / total) * 100)}%`
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Delinquencies Dashboard</h1>
        <p class="text-sm text-gray-500">Property: {{ activeProperty || 'Global' }}</p>
      </div>
      <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" :loading="loading" @click="loadData">Refresh</UButton>
    </div>

    <!-- Summary Cards -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard class="bg-primary-50">
        <div class="text-sm text-primary-700 font-medium">Total Unpaid</div>
        <div class="text-3xl font-bold text-primary-900">{{ formatCurrency(summary.total_unpaid_sum) }}</div>
        <div class="text-xs text-primary-600 mt-1">{{ summary.resident_count }} Active Delinquencies</div>
      </UCard>
      
      <UCard>
        <div class="text-sm text-gray-500 font-medium">Total Balance</div>
        <div class="text-3xl font-bold">{{ formatCurrency(summary.balance_sum) }}</div>
        <div class="text-xs text-gray-400 mt-1">Includes all credits/prepays</div>
      </UCard>

      <UCard>
        <div class="text-sm text-gray-500 font-medium">Aging (61+ Days)</div>
        <div class="text-3xl font-bold text-orange-600">{{ formatCurrency(summary.days_61_90_sum + summary.days_90_plus_sum) }}</div>
        <div class="text-xs text-orange-400 mt-1">High risk categories</div>
      </UCard>

      <UCard>
        <div class="text-sm text-gray-500 font-medium">Prepays</div>
        <div class="text-3xl font-bold text-green-600">{{ formatCurrency(summary.prepays_sum) }}</div>
        <div class="text-xs text-green-400 mt-1">Resident credits</div>
      </UCard>
    </div>

    <!-- Aging Breakdown -->
    <UCard v-if="summary" class="mb-8">
      <template #header>
        <h3 class="font-bold">Aging Buckets Breakdown</h3>
      </template>
      <div class="flex items-center h-8 bg-gray-100 rounded-full overflow-hidden">
        <div :style="{ width: getSafeWidth(summary.days_0_30_sum, summary.total_unpaid_sum) }" class="bg-blue-500 h-full transition-all duration-500" title="0-30 Days"></div>
        <div :style="{ width: getSafeWidth(summary.days_31_60_sum, summary.total_unpaid_sum) }" class="bg-yellow-400 h-full transition-all duration-500" title="31-60 Days"></div>
        <div :style="{ width: getSafeWidth(summary.days_61_90_sum, summary.total_unpaid_sum) }" class="bg-orange-500 h-full transition-all duration-500" title="61-90 Days"></div>
        <div :style="{ width: getSafeWidth(summary.days_90_plus_sum, summary.total_unpaid_sum) }" class="bg-red-500 h-full transition-all duration-500" title="90+ Days"></div>
      </div>
      <div class="grid grid-cols-4 gap-4 mt-4 text-center">
        <div>
          <div class="text-[10px] text-gray-500 uppercase font-bold">0-30 Days</div>
          <div class="text-sm font-semibold">{{ formatCurrency(summary.days_0_30_sum) }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-500 uppercase font-bold">31-60 Days</div>
          <div class="text-sm font-semibold">{{ formatCurrency(summary.days_31_60_sum) }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-500 uppercase font-bold">61-90 Days</div>
          <div class="text-sm font-semibold">{{ formatCurrency(summary.days_61_90_sum) }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-500 uppercase font-bold">90+ Days</div>
          <div class="text-sm font-semibold text-red-600">{{ formatCurrency(summary.days_90_plus_sum) }}</div>
        </div>
      </div>
    </UCard>

    <!-- Daily Trend Card -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Daily Delinquency Trend (Last 30 Days)</h3>
          <span class="text-xs text-gray-400">Individual dots per day</span>
        </div>
      </template>
      
      <div v-if="dailyChartConfig" class="relative group">
        <svg :viewBox="`0 0 ${dailyChartConfig.width} ${dailyChartConfig.height}`" class="w-full h-48 overflow-visible">
          <!-- Grid Lines -->
          <line :x1="dailyChartConfig.padding" :y1="dailyChartConfig.height - dailyChartConfig.padding" :x2="dailyChartConfig.width - dailyChartConfig.padding" :y2="dailyChartConfig.height - dailyChartConfig.padding" stroke="#e5e7eb" stroke-width="1" />
          
          <!-- Trend Line -->
          <path :d="dailyChartConfig.d" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30" />
          
          <!-- Points (Dots) -->
          <g v-for="(p, i) in dailyChartConfig.points" :key="i">
            <circle :cx="p.x" :cy="p.y" r="3" fill="rgb(var(--color-primary-600))">
              <title>{{ formatDate(p.date) }}: {{ formatCurrency(p.value) }}</title>
            </circle>
            <!-- Show date for every 7th day or first/last -->
            <text v-if="i % 7 === 0 || i === dailyChartConfig.points.length - 1" :x="p.x" :y="dailyChartConfig.height - 15" text-anchor="middle" font-size="9" fill="#9ca3af">{{ formatDate(p.date) }}</text>
          </g>
        </svg>
      </div>
      <div v-else class="h-48 flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-lg">
        Keep uploading daily reports to generate your trend map.
      </div>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Monthly Benchmark -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold">Monthly Benchmarks (26th)</h3>
            <span class="text-xs text-gray-400">Yardi Cycle Snapshots</span>
          </div>
        </template>
        
        <div v-if="chartConfig" class="relative group">
          <svg :viewBox="`0 0 ${chartConfig.width} ${chartConfig.height}`" class="w-full h-auto overflow-visible">
            <line :x1="chartConfig.padding" :y1="chartConfig.height - chartConfig.padding" :x2="chartConfig.width - chartConfig.padding" :y2="chartConfig.height - chartConfig.padding" stroke="#e5e7eb" stroke-width="1" />
            <path :d="chartConfig.d" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="3" stroke-linecap="round" />
            <g v-for="(p, i) in chartConfig.points" :key="i">
              <circle :cx="p.x" :cy="p.y" r="4" fill="white" stroke="rgb(var(--color-primary-500))" stroke-width="2" />
              <text :x="p.x" :y="chartConfig.height - 10" text-anchor="middle" font-size="10" fill="#9ca3af">{{ new Date(trendData[i].snapshot_date).toLocaleDateString('en-US', { month: 'short' }) }}</text>
            </g>
          </svg>
        </div>
        <div v-else class="h-48 flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-lg">
          Monthly benchmarks appear on the 26th.
        </div>
      </UCard>

      <!-- Historical Snapshot Table -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Historical Snapshots (26th)</h3>
        </template>
        <GenericDataTable 
          :data="snapshots" 
          :columns="[
            { key: 'snapshot_date', label: 'Date', sortable: true },
            { key: 'total_unpaid', label: 'Unpaid', sortable: true },
            { key: 'balance', label: 'Balance', sortable: true }
          ]"
          row-key="snapshot_date"
          striped
        >
          <template #cell-snapshot_date="{ value }">
            <CellsDateCell :value="value" format="medium" />
          </template>
          <template #cell-total_unpaid="{ value }">
            <CellsCurrencyCell :value="value" class="text-primary-600 font-bold" />
          </template>
          <template #cell-balance="{ value }">
            <CellsCurrencyCell :value="value" class="text-gray-600 font-mono text-xs" />
          </template>
        </GenericDataTable>
      </UCard>
    </div>

    <!-- Error State -->
    <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="red" variant="soft" title="Error" :description="error" class="mt-8" />
  </div>
</template>
