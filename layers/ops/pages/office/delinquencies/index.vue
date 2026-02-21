<script setup lang="ts">
import { onMounted, computed, watch, ref } from 'vue'
import { definePageMeta, usePropertyState, useSupabaseClient, useAsyncData, navigateTo } from '#imports'
import { useDelinquenciesAnalysis } from '../../../composables/useDelinquenciesAnalysis'

definePageMeta({
  layout: 'dashboard'
})

const { activeProperty } = usePropertyState()
const supabase = useSupabaseClient()
const { summary, snapshots, dailyTrend, loading, error, fetchSummary, fetchSnapshots, fetchDailyTrend } = useDelinquenciesAnalysis()

// Fetch Delinquent Residents for table
const { data: delinquentResidents, status: residentsStatus, error: residentsError } = await useAsyncData('delinquent-residents', async () => {
  if (!activeProperty.value) return []

  const { data, error } = await supabase
    .from('view_table_delinquent_residents')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('total_unpaid', { ascending: false })

  if (error) {
    console.error('Delinquent Residents fetch error:', error)
    throw error
  }

  console.log('Delinquent Residents fetched:', data?.length || 0)
  return data || []
}, {
  watch: [activeProperty]
})

// Fetch available snapshot dates for date picker
const { data: availableDates, status: datesStatus, error: datesError } = await useAsyncData('delinquency-dates', async () => {
  if (!activeProperty.value) {
    console.log('No active property, skipping date fetch')
    return []
  }

  console.log('Fetching available dates for property:', activeProperty.value)

  const { data, error } = await supabase
    .from('delinquencies')
    .select('created_at')
    .eq('property_code', activeProperty.value)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Available dates fetch error:', error)
    throw error
  }

  console.log('Raw delinquency records:', data?.length || 0)

  if (!data || data.length === 0) {
    console.log('No delinquency records found')
    return []
  }

  // Extract unique dates (YYYY-MM-DD)
  const uniqueDates = [...new Set(
    data.map(d => new Date(d.created_at).toISOString().split('T')[0])
  )]

  console.log('Unique dates found:', uniqueDates.length, uniqueDates)

  const formattedDates = uniqueDates.map(date => ({
    value: date,
    label: new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }))

  console.log('Formatted dates:', formattedDates)
  return formattedDates
}, {
  watch: [activeProperty]
})

const selectedDate = ref<any>(null)

const navigateToSnapshot = () => {
  console.log('Navigate to snapshot clicked')
  console.log('Selected date object:', selectedDate.value)

  if (selectedDate.value) {
    // Extract the value property from the selected object
    const dateValue = selectedDate.value.value || selectedDate.value
    const targetUrl = `/office/delinquencies/${dateValue}`
    console.log('Navigating to:', targetUrl)

    navigateTo(targetUrl)
  } else {
    console.warn('No date selected!')
  }
}

const dateRangeSummary = computed(() => {
  if (!availableDates.value || availableDates.value.length === 0) return null
  const earliest = availableDates.value[availableDates.value.length - 1].value
  const latest = availableDates.value[0].value
  return {
    earliest: new Date(earliest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    latest: new Date(latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    count: availableDates.value.length
  }
})

// Group dates by month for better UX
const datesByMonth = computed(() => {
  if (!availableDates.value) return []

  const grouped = new Map<string, any[]>()

  availableDates.value.forEach(date => {
    const monthKey = new Date(date.value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, [])
    }
    grouped.get(monthKey)?.push(date)
  })

  return Array.from(grouped.entries()).map(([month, dates]) => ({
    month,
    dates,
    count: dates.length
  }))
})

const selectedMonth = ref<string | null>(datesByMonth.value[0]?.month || null)

const filteredDates = computed(() => {
  if (!selectedMonth.value) return availableDates.value || []
  const monthData = datesByMonth.value.find(m => m.month === selectedMonth.value)
  return monthData?.dates || []
})

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

// Daily Trend Logic with Y-axis labels
const dailyChartConfig = computed(() => {
  if (!dailyTrend.value || dailyTrend.value.length === 0) return null
  const values = dailyTrend.value.map(s => Number(s.total_unpaid_sum))
  const max = Math.max(...values, 1000) * 1.2
  const width = 600
  const height = 150
  const padding = 40
  const leftPadding = 60 // Extra space for Y-axis labels

  const points = values.map((val, i) => ({
    x: leftPadding + (i * ((width - leftPadding - padding) / Math.max(values.length - 1, 1))),
    y: height - padding - ((val / max) * (height - (padding * 2))),
    value: val,
    date: dailyTrend.value[i].snapshot_date
  }))
  const d = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')

  // Y-axis grid lines and labels
  const yAxisSteps = 4
  const yAxisLabels = Array.from({ length: yAxisSteps }, (_, i) => {
    const value = (max / (yAxisSteps - 1)) * i
    const y = height - padding - ((value / max) * (height - (padding * 2)))
    return { value, y }
  })

  return { width, height, padding, leftPadding, max, points, d, yAxisLabels }
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

const formatCurrencyShort = (val: number) => {
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(1)}k`
  }
  return `$${Math.round(val)}`
}

// Delinquent Residents table columns
const residentColumns = [
  { key: 'unit_name', label: 'Unit', sortable: true, width: '100px' },
  { key: 'resident', label: 'Resident', sortable: true, width: '200px' },
  { key: 'total_unpaid', label: 'Total Unpaid', sortable: true, width: '130px', align: 'right' },
  { key: 'days_61_90', label: '61-90 Days', sortable: true, width: '120px', align: 'right' },
  { key: 'days_90_plus', label: '90+ Days', sortable: true, width: '120px', align: 'right' },
  { key: 'created_at', label: 'As Of', sortable: true, width: '110px', align: 'center' }
]

const handleResidentClick = (row: any) => {
  if (row?.created_at) {
    const dateStr = new Date(row.created_at).toISOString().split('T')[0]
    navigateTo(`/office/delinquencies/${dateStr}`)
  }
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

    <!-- Snapshot Date Selector (ALWAYS SHOW with states) -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold">View Snapshot by Date</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select a date to view detailed delinquency snapshot
            </p>
          </div>
          <div v-if="dateRangeSummary" class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ dateRangeSummary.count }} snapshots available</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ dateRangeSummary.earliest }} - {{ dateRangeSummary.latest }}</p>
          </div>
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="datesStatus === 'pending'" class="flex items-center justify-center py-8">
        <div class="flex items-center gap-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span class="text-gray-500 dark:text-gray-400">Loading available dates...</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="datesError" class="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg">
        <div class="flex items-start gap-2">
          <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-500 mt-0.5" />
          <div class="text-sm text-red-700 dark:text-red-400">
            <p class="font-medium">Error loading snapshot dates</p>
            <p class="text-xs text-red-600 dark:text-red-500 mt-1">{{ datesError.message }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!availableDates || availableDates.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-calendar-days" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p class="text-gray-500 dark:text-gray-400 font-medium">No snapshot dates available</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Upload delinquency reports via the Solver to generate snapshots.</p>
      </div>

      <!-- Date Picker with Month Filter (Has Data) -->
      <div v-else>
        <!-- Month Tabs -->
        <div v-if="datesByMonth.length > 1" class="mb-4">
          <div class="flex items-center gap-2 overflow-x-auto pb-2">
            <UButton
              v-for="monthData in datesByMonth"
              :key="monthData.month"
              :label="`${monthData.month} (${monthData.count})`"
              :variant="selectedMonth === monthData.month ? 'solid' : 'outline'"
              :color="selectedMonth === monthData.month ? 'primary' : 'gray'"
              size="sm"
              @click="selectedMonth = monthData.month"
              class="flex-shrink-0"
            />
          </div>
        </div>

        <!-- Date Selection -->
        <div class="flex items-center gap-4">
          <div class="flex-1 max-w-md">
            <USelectMenu
              v-model="selectedDate"
              :items="filteredDates"
              placeholder="Select a snapshot date..."
              searchable
              :searchable-placeholder="`Search ${selectedMonth || 'dates'}...`"
              class="w-full"
            >
              <template #label>
                <span v-if="selectedDate" class="flex items-center gap-2">
                  <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                  {{ selectedDate.label }}
                </span>
                <span v-else class="text-gray-500 dark:text-gray-400">
                  Select from {{ filteredDates.length }} {{ filteredDates.length === 1 ? 'date' : 'dates' }}...
                </span>
              </template>

              <template #option="{ option }">
                <div class="flex items-center justify-between w-full">
                  <span>{{ option.label }}</span>
                  <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              </template>
            </USelectMenu>
          </div>

          <UButton
            icon="i-heroicons-arrow-right"
            label="View Snapshot"
            color="primary"
            size="lg"
            :disabled="!selectedDate"
            @click="navigateToSnapshot"
          />

          <UButton
            v-if="selectedDate"
            icon="i-heroicons-x-mark"
            color="gray"
            variant="ghost"
            size="lg"
            @click="selectedDate = null"
            title="Clear selection"
          />
        </div>

        <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-lg">
          <div class="flex items-start gap-2">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" />
            <div class="text-sm text-blue-700 dark:text-blue-400">
              <p class="font-medium">Snapshot dates reflect when delinquency reports were uploaded.</p>
              <p class="text-xs text-blue-600 dark:text-blue-500 mt-1">
                Use month tabs above to filter dates, or click a row in the "Delinquent Residents" table to navigate directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Daily Trend Card (PHASE 1: Enhanced with Y-axis) -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Daily Delinquency Trend (Last 30 Days)</h3>
          <span class="text-xs text-gray-400">Individual dots per day</span>
        </div>
      </template>

      <div v-if="dailyChartConfig" class="relative group">
        <svg :viewBox="`0 0 ${dailyChartConfig.width} ${dailyChartConfig.height}`" class="w-full h-48 overflow-visible">
          <!-- Y-axis Grid Lines & Labels -->
          <g v-for="(label, i) in dailyChartConfig.yAxisLabels" :key="`y-${i}`">
            <line
              :x1="dailyChartConfig.leftPadding"
              :y1="label.y"
              :x2="dailyChartConfig.width - dailyChartConfig.padding"
              :y2="label.y"
              stroke="#e5e7eb"
              stroke-width="1"
              stroke-dasharray="4,4"
            />
            <text
              :x="dailyChartConfig.leftPadding - 10"
              :y="label.y + 4"
              text-anchor="end"
              font-size="10"
              fill="#6b7280"
              class="font-semibold"
            >
              {{ formatCurrencyShort(label.value) }}
            </text>
          </g>

          <!-- X-axis baseline -->
          <line
            :x1="dailyChartConfig.leftPadding"
            :y1="dailyChartConfig.height - dailyChartConfig.padding"
            :x2="dailyChartConfig.width - dailyChartConfig.padding"
            :y2="dailyChartConfig.height - dailyChartConfig.padding"
            stroke="#9ca3af"
            stroke-width="2"
          />

          <!-- Trend Line (More Visible) -->
          <path
            :d="dailyChartConfig.d"
            fill="none"
            stroke="rgb(var(--color-primary-500))"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="opacity-60"
          />

          <!-- Points (Larger Dots - Light/Dark Mode Compatible) -->
          <g v-for="(p, i) in dailyChartConfig.points" :key="i">
            <circle :cx="p.x" :cy="p.y" r="5" class="fill-primary-500 dark:fill-primary-400 cursor-pointer hover:opacity-80 transition-all">
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

    <!-- PHASE 2: Delinquent Residents Table -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold">Delinquent Residents</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Active delinquencies sorted by amount</p>
          </div>
          <UBadge v-if="delinquentResidents?.length" color="primary" variant="soft" size="lg" class="font-bold">
            {{ delinquentResidents.length }} {{ delinquentResidents.length === 1 ? 'Resident' : 'Residents' }}
          </UBadge>
        </div>
      </template>

      <!-- Error State for Missing View -->
      <div v-if="residentsError" class="p-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-lg">
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-orange-500 mt-0.5" />
          <div>
            <h4 class="font-bold text-orange-800 dark:text-orange-400 mb-1">Database View Not Found</h4>
            <p class="text-sm text-orange-700 dark:text-orange-500 mb-3">
              The view <code class="px-1 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded font-mono text-xs">view_table_delinquent_residents</code> doesn't exist yet.
            </p>
            <p class="text-xs text-orange-600 dark:text-orange-400 font-mono bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
              Run: <strong>supabase db push</strong>
            </p>
            <p class="text-xs text-orange-600 dark:text-orange-500 mt-2">
              Error: {{ residentsError.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div v-else class="max-h-96 overflow-y-auto">
        <GenericDataTable
          :data="delinquentResidents || []"
          :columns="residentColumns"
          :loading="residentsStatus === 'pending'"
          row-key="id"
          striped
          clickable
          @row-click="handleResidentClick"
        >
          <template #cell-unit_name="{ value, row }">
            <CellsLinkCell
              v-if="value"
              :value="value"
              :to="`/assets/units/${row.unit_id}`"
            />
            <span v-else class="text-gray-400 dark:text-gray-600">-</span>
          </template>

          <template #cell-resident="{ value }">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span class="font-medium">{{ value }}</span>
            </div>
          </template>

          <template #cell-total_unpaid="{ value }">
            <CellsCurrencyCell :value="value" class="text-red-600 dark:text-red-400 font-bold" />
          </template>

          <template #cell-days_61_90="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-orange-600 dark:text-orange-400 font-semibold" />
            <span v-else class="text-gray-400 dark:text-gray-600">-</span>
          </template>

          <template #cell-days_90_plus="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-red-700 dark:text-red-400 font-bold" />
            <span v-else class="text-gray-400 dark:text-gray-600">-</span>
          </template>

          <template #cell-created_at="{ value }">
            <CellsDateCell :value="value" format="short" />
          </template>
        </GenericDataTable>

        <div v-if="!delinquentResidents?.length && residentsStatus !== 'pending'" class="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
          <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-400 dark:text-green-500 mx-auto mb-4" />
          <p class="text-gray-500 dark:text-gray-400 font-medium">No active delinquencies found.</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">All residents are current on payments.</p>
        </div>
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

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Delinquency Manager" 
      description="Accounts Receivable & Aging Analysis"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Aging Buckets</h3>
          <p>
            The Delinquency Manager categorizes unpaid balances into time-based buckets to prioritize collection efforts:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong>0-60 Days:</strong> Standard delinquencies often resolved with simple payment reminders.</li>
            <li><strong class="text-orange-600">61-90 Days:</strong> High-risk balances that may require formal legal notices.</li>
            <li><strong class="text-red-600">90+ Days:</strong> Critical delinquencies that typically align with eviction proceedings.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Snapshots & Trends</h3>
          <p>
            The dashboard displays two distinct data signals:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Daily Trends:</strong> Real-time tracking based on daily delinquency report uploads.</li>
            <li><strong>Yardi Snapshots (26th):</strong> Historical benchmarks captured on the 26th of each month, aligning with the official Yardi accounting cycle.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Financial Terminology</h3>
          <div class="space-y-2">
            <p>
              Understanding the difference between raw debt and actual liability:
            </p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Total Unpaid:</strong> The gross sum of all outstanding resident charges.</li>
              <li><strong>Total Balance:</strong> The net sum, which includes <strong>Prepays</strong> (resident credits) that offset the unpaid amount.</li>
            </ul>
          </div>
          <div class="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
            <strong>Pro Tip:</strong> Click any resident in the "Delinquent Residents" list to view the specific daily snapshot associated with their current balance.
          </div>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
