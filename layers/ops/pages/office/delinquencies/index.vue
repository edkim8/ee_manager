<script setup lang="ts">
import { onMounted, computed, watch, ref } from 'vue'
import { definePageMeta, usePropertyState, useSupabaseClient, useAsyncData, navigateTo } from '#imports'
import { useDelinquenciesAnalysis } from '../../../composables/useDelinquenciesAnalysis'
import { getSafeWidth, formatCurrencyShort, computeDatesByMonth, computeAgingResidentCounts } from '../../../utils/delinquencyUtils'

definePageMeta({
  layout: 'dashboard'
})

const { activeProperty } = usePropertyState()
const supabase = useSupabaseClient()
const {
  summary, snapshots, dailyTrend, residentHistory,
  loading, error,
  fetchSummary, fetchSnapshots, fetchDailyTrend, fetchResidentHistory
} = useDelinquenciesAnalysis()

// ── Delinquent Residents ──────────────────────────────────────────────────────

const { data: delinquentResidents, status: residentsStatus, error: residentsError } = await useAsyncData('delinquent-residents', async () => {
  if (!activeProperty.value) return []
  const { data, error } = await supabase
    .from('view_table_delinquent_residents')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('total_unpaid', { ascending: false })
  if (error) throw error
  return data || []
}, { watch: [activeProperty] })

// ── Snapshot Date Picker (bottom of page) ────────────────────────────────────

const { data: availableDates, status: datesStatus, error: datesError } = await useAsyncData('delinquency-dates', async () => {
  if (!activeProperty.value) return []
  const { data, error } = await supabase
    .from('delinquencies')
    .select('created_at')
    .eq('property_code', activeProperty.value)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data || data.length === 0) return []
  const uniqueDates = [...new Set(
    data.map(d => new Date(d.created_at).toISOString().split('T')[0])
  )]
  return uniqueDates.map(date => ({
    value: date,
    label: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    })
  }))
}, { watch: [activeProperty] })

const selectedDate = ref<any>(null)
const navigateToSnapshot = () => {
  if (selectedDate.value) {
    const dateValue = selectedDate.value.value || selectedDate.value
    navigateTo(`/office/delinquencies/${dateValue}`)
  }
}

const dateRangeSummary = computed(() => {
  if (!availableDates.value || availableDates.value.length === 0) return null
  const earliest = availableDates.value[availableDates.value.length - 1].value
  const latest   = availableDates.value[0].value
  return {
    earliest: new Date(`${earliest}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    latest:   new Date(`${latest}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    count: availableDates.value.length
  }
})

const datesByMonth  = computed(() => computeDatesByMonth(availableDates.value || []))
const selectedMonth = ref<string | null>(datesByMonth.value[0]?.month || null)
const filteredDates = computed(() => {
  if (!selectedMonth.value) return availableDates.value || []
  const monthData = datesByMonth.value.find(m => m.month === selectedMonth.value)
  return monthData?.dates || []
})

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData() {
  await Promise.all([
    fetchSummary(),
    fetchSnapshots(6),
    fetchDailyTrend(),
    fetchResidentHistory(12),
  ])
}

onMounted(loadData)
watch(activeProperty, loadData)

// ── Enriched residents (current + 12-month history merged) ───────────────────

const enrichedResidents = computed(() => {
  const historyMap = new Map((residentHistory.value || []).map(h => [h.tenancy_id, h]))
  return (delinquentResidents.value || []).map(r => {
    const history  = historyMap.get(r.tenancy_id)
    const prevUnpaid = history?.prev_month_unpaid ?? null
    return {
      ...r,
      prev_month_unpaid: prevUnpaid,
      delta_unpaid: prevUnpaid !== null ? (Number(r.total_unpaid) - Number(prevUnpaid)) : null,
      peak_unpaid:  history?.peak_unpaid  ?? r.total_unpaid,
      months_on_list: history?.months_on_list ?? 1,
    }
  })
})

// ── Summary metrics ───────────────────────────────────────────────────────────

const aging31Plus = computed(() =>
  summary.value
    ? (summary.value.days_31_60_sum + summary.value.days_61_90_sum + summary.value.days_90_plus_sum)
    : 0
)

const agingResidentCounts = computed(() => computeAgingResidentCounts(delinquentResidents.value || []))

// ── Daily trend charts (90-day window) ───────────────────────────────────────

// Full range chart
const dailyChartConfig = computed(() => {
  if (!dailyTrend.value || dailyTrend.value.length === 0) return null
  const values = dailyTrend.value.map(s => Number(s.total_unpaid_sum))
  const max    = Math.max(...values, 1000) * 1.2
  const W = 540, H = 150, P = 30, LP = 58
  const points = values.map((val, i) => ({
    x: LP + (i * ((W - LP - P) / Math.max(values.length - 1, 1))),
    y: H - P - ((val / max) * (H - P * 2)),
    value: val,
    date: dailyTrend.value![i].snapshot_date
  }))
  const d = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')
  const yAxisLabels = Array.from({ length: 4 }, (_, i) => {
    const value = (max / 3) * i
    return { value, y: H - P - ((value / max) * (H - P * 2)) }
  })
  return { W, H, P, LP, max, points, d, yAxisLabels }
})

// Zoomed chart — last 30 days only, Y-axis capped at zoomPercent% of the peak value
const zoomPercent = ref(10)
const zoomOptions = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

// Slice to last 30 data points for the zoomed view
const zoomedData = computed(() =>
  dailyTrend.value ? dailyTrend.value.slice(-30) : []
)

const zoomedChartConfig = computed(() => {
  if (zoomedData.value.length === 0) return null
  // Use the full 90-day peak so the ceiling reference is meaningful
  const allValues = (dailyTrend.value || []).map(s => Number(s.total_unpaid_sum))
  const peak      = Math.max(...allValues, 1000)
  const zMax      = (zoomPercent.value / 100) * peak

  const values = zoomedData.value.map(s => Number(s.total_unpaid_sum))
  const W = 540, H = 150, P = 30, LP = 58
  const points = values.map((val, i) => {
    const clamped = Math.min(val, zMax)
    return {
      x: LP + (i * ((W - LP - P) / Math.max(values.length - 1, 1))),
      y: H - P - ((clamped / zMax) * (H - P * 2)),
      value: val,
      isClipped: val > zMax,
      date: zoomedData.value[i].snapshot_date
    }
  })
  const d = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')
  const yAxisLabels = Array.from({ length: 4 }, (_, i) => {
    const value = (zMax / 3) * i
    return { value, y: H - P - ((value / zMax) * (H - P * 2)) }
  })
  return { W, H, P, LP, zMax, points, d, yAxisLabels }
})

// Monthly benchmark chart
const trendData   = computed(() => snapshots.value ? [...snapshots.value].reverse() : [])
const chartConfig = computed(() => {
  if (trendData.value.length === 0) return null
  const values = trendData.value.map(s => Number(s.total_unpaid))
  const max    = Math.max(...values, 1000) * 1.2
  const W = 600, H = 150, P = 40
  const points = values.map((val, i) => ({
    x: P + (i * ((W - P * 2) / Math.max(values.length - 1, 1))),
    y: H - P - ((val / max) * (H - P * 2)),
    value: val
  }))
  const d = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')
  return { W, H, P, max, points, d }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (val: number | string | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val ?? 0))

// Append T12:00:00 so a bare YYYY-MM-DD string is parsed in local time rather than
// UTC midnight, which would shift dates one day back in US time zones.
const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const handleResidentClick = (row: any) => {
  if (row?.created_at) {
    navigateTo(`/office/delinquencies/${new Date(row.created_at).toISOString().split('T')[0]}`)
  }
}

// ── Table columns ─────────────────────────────────────────────────────────────

const residentColumns = [
  { key: 'unit_name',      label: 'Unit',        sortable: true, width: '80px' },
  { key: 'resident',       label: 'Resident',    sortable: true, width: '160px' },
  { key: 'total_unpaid',   label: 'Balance',     sortable: true, width: '120px', align: 'right' },
  { key: 'delta_unpaid',   label: 'vs Last Mo.', sortable: true, width: '110px', align: 'right' },
  { key: 'months_on_list', label: 'Months',      sortable: true, width: '75px',  align: 'center' },
  { key: 'peak_unpaid',    label: 'Peak (12mo)', sortable: true, width: '120px', align: 'right' },
  { key: 'days_61_90',     label: '61–90',       sortable: true, width: '90px',  align: 'right' },
  { key: 'days_90_plus',   label: '90+',         sortable: true, width: '90px',  align: 'right' },
  { key: 'created_at',     label: 'As Of',       sortable: true, width: '90px',  align: 'center' },
]
</script>

<template>
  <div class="p-6">

    <!-- ── Page Header ──────────────────────────────────────────────────────── -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Delinquencies Dashboard</h1>
        <p class="text-sm text-gray-500">Property: {{ activeProperty || 'Global' }}</p>
      </div>
      <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" :loading="loading" @click="loadData">
        Refresh
      </UButton>
    </div>

    <!-- ── Summary Cards: Total Unpaid | 31+ | Prepays | Balance ───────────── -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

      <!-- Total Unpaid -->
      <UCard class="bg-primary-50 dark:bg-primary-950/30">
        <div class="text-sm text-primary-700 dark:text-primary-400 font-medium">Total Unpaid</div>
        <div class="text-3xl font-bold text-primary-900 dark:text-primary-200">{{ formatCurrency(summary.total_unpaid_sum) }}</div>
        <div class="text-xs text-primary-600 dark:text-primary-500 mt-1">{{ summary.resident_count }} Active Delinquencies</div>
      </UCard>

      <!-- Aging 31+ Days -->
      <UCard class="bg-orange-50 dark:bg-orange-950/20">
        <div class="text-sm text-orange-700 dark:text-orange-400 font-medium">Aging 31+ Days</div>
        <div class="text-3xl font-bold text-orange-800 dark:text-orange-300">{{ formatCurrency(aging31Plus) }}</div>
        <div class="text-xs text-orange-500 dark:text-orange-500 mt-1">
          {{ ((aging31Plus / summary.total_unpaid_sum) * 100).toFixed(0) }}% of total unpaid
        </div>
      </UCard>

      <!-- Prepays -->
      <UCard>
        <div class="text-sm text-gray-500 font-medium">Prepays</div>
        <div class="text-3xl font-bold text-green-600 dark:text-green-400">{{ formatCurrency(summary.prepays_sum) }}</div>
        <div class="text-xs text-gray-400 mt-1">Resident credits</div>
      </UCard>

      <!-- Total Balance -->
      <UCard>
        <div class="text-sm text-gray-500 font-medium">Total Balance</div>
        <div class="text-3xl font-bold">{{ formatCurrency(summary.balance_sum) }}</div>
        <div class="text-xs text-gray-400 mt-1">Net (unpaid + prepays)</div>
      </UCard>

    </div>

    <!-- ── Combined Aging Buckets + Active Case Counts ──────────────────────── -->
    <UCard v-if="summary" class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Aging Buckets Breakdown</h3>
          <UBadge color="primary" variant="soft" size="lg" class="font-bold tabular-nums">
            {{ agingResidentCounts.total }} Active Cases
          </UBadge>
        </div>
      </template>

      <!-- Progress bar -->
      <div class="flex items-center h-8 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div :style="{ width: getSafeWidth(summary.days_0_30_sum,  summary.total_unpaid_sum) }" class="bg-blue-500   h-full transition-all duration-500" title="0–30 Days"></div>
        <div :style="{ width: getSafeWidth(summary.days_31_60_sum, summary.total_unpaid_sum) }" class="bg-yellow-400 h-full transition-all duration-500" title="31–60 Days"></div>
        <div :style="{ width: getSafeWidth(summary.days_61_90_sum, summary.total_unpaid_sum) }" class="bg-orange-500 h-full transition-all duration-500" title="61–90 Days"></div>
        <div :style="{ width: getSafeWidth(summary.days_90_plus_sum, summary.total_unpaid_sum) }" class="bg-red-500  h-full transition-all duration-500" title="90+ Days"></div>
      </div>

      <!-- Bucket grid: amount + case count -->
      <div class="grid grid-cols-4 gap-0 mt-4 divide-x divide-gray-100 dark:divide-gray-800">

        <!-- 0–30 -->
        <div class="text-center px-3 py-2">
          <div class="flex items-center justify-center gap-1.5 mb-1">
            <span class="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 flex-shrink-0"></span>
            <span class="text-[10px] text-gray-500 uppercase font-bold">0–30 Days</span>
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white">{{ formatCurrency(summary.days_0_30_sum) }}</div>
          <div class="text-xs text-blue-500 dark:text-blue-400 font-semibold mt-0.5">
            {{ agingResidentCounts.days_0_30 }} cases
          </div>
        </div>

        <!-- 31–60 -->
        <div class="text-center px-3 py-2">
          <div class="flex items-center justify-center gap-1.5 mb-1">
            <span class="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 flex-shrink-0"></span>
            <span class="text-[10px] text-gray-500 uppercase font-bold">31–60 Days</span>
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white">{{ formatCurrency(summary.days_31_60_sum) }}</div>
          <div class="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mt-0.5">
            {{ agingResidentCounts.days_31_60 }} cases
          </div>
        </div>

        <!-- 61–90 -->
        <div class="text-center px-3 py-2">
          <div class="flex items-center justify-center gap-1.5 mb-1">
            <span class="inline-block w-2.5 h-2.5 rounded-sm bg-orange-500 flex-shrink-0"></span>
            <span class="text-[10px] text-gray-500 uppercase font-bold">61–90 Days</span>
          </div>
          <div class="text-base font-bold text-orange-700 dark:text-orange-300">{{ formatCurrency(summary.days_61_90_sum) }}</div>
          <div class="text-xs text-orange-500 dark:text-orange-400 font-semibold mt-0.5">
            {{ agingResidentCounts.days_61_90 }} cases
          </div>
        </div>

        <!-- 90+ -->
        <div class="text-center px-3 py-2">
          <div class="flex items-center justify-center gap-1.5 mb-1">
            <span class="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 flex-shrink-0"></span>
            <span class="text-[10px] text-gray-500 uppercase font-bold">90+ Days</span>
          </div>
          <div class="text-base font-bold text-red-700 dark:text-red-300">{{ formatCurrency(summary.days_90_plus_sum) }}</div>
          <div class="text-xs text-red-500 dark:text-red-400 font-semibold mt-0.5">
            {{ agingResidentCounts.days_90_plus }} cases
          </div>
        </div>

      </div>
    </UCard>

    <!-- ── Daily Trend (90-day, two-column) ─────────────────────────────────── -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold">Daily Delinquency Trend</h3>
            <p class="text-xs text-gray-400 mt-0.5">90-day window · one dot per upload day</p>
          </div>
          <span class="text-xs text-gray-400">{{ dailyTrend?.length ?? 0 }} data points</span>
        </div>
      </template>

      <div v-if="dailyChartConfig" class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Left: Full range -->
        <div>
          <p class="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Full Range</p>
          <svg :viewBox="`0 0 ${dailyChartConfig.W} ${dailyChartConfig.H}`" class="w-full h-40 overflow-visible">
            <!-- Y-axis grid -->
            <g v-for="(lbl, i) in dailyChartConfig.yAxisLabels" :key="`fy-${i}`">
              <line :x1="dailyChartConfig.LP" :y1="lbl.y" :x2="dailyChartConfig.W - dailyChartConfig.P" :y2="lbl.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
              <text :x="dailyChartConfig.LP - 6" :y="lbl.y + 4" text-anchor="end" font-size="9" fill="#9ca3af">{{ formatCurrencyShort(lbl.value) }}</text>
            </g>
            <!-- Baseline -->
            <line :x1="dailyChartConfig.LP" :y1="dailyChartConfig.H - dailyChartConfig.P" :x2="dailyChartConfig.W - dailyChartConfig.P" :y2="dailyChartConfig.H - dailyChartConfig.P" stroke="#9ca3af" stroke-width="1.5" />
            <!-- Trend line -->
            <path :d="dailyChartConfig.d" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70" />
            <!-- Dots -->
            <g v-for="(p, i) in dailyChartConfig.points" :key="`fd-${i}`">
              <circle :cx="p.x" :cy="p.y" r="4" class="fill-primary-500 dark:fill-primary-400 cursor-pointer hover:r-6 transition-all">
                <title>{{ formatDate(p.date) }}: {{ formatCurrency(p.value) }}</title>
              </circle>
              <text v-if="i % 14 === 0 || i === dailyChartConfig.points.length - 1" :x="p.x" :y="dailyChartConfig.H - 12" text-anchor="middle" font-size="8" fill="#9ca3af">
                {{ formatDate(p.date) }}
              </text>
            </g>
          </svg>
        </div>

        <!-- Right: Zoomed (trailing detail) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">30-Day Detail — Bottom {{ zoomPercent }}% of Peak</p>
            <!-- Zoom selector buttons -->
            <div class="flex items-center gap-1">
              <button
                v-for="pct in zoomOptions"
                :key="pct"
                @click="zoomPercent = pct"
                :class="[
                  'px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors',
                  zoomPercent === pct
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                ]"
              >{{ pct }}%</button>
            </div>
          </div>

          <svg v-if="zoomedChartConfig" :viewBox="`0 0 ${zoomedChartConfig.W} ${zoomedChartConfig.H}`" class="w-full h-40 overflow-visible">
            <!-- Y-axis grid -->
            <g v-for="(lbl, i) in zoomedChartConfig.yAxisLabels" :key="`zy-${i}`">
              <line :x1="zoomedChartConfig.LP" :y1="lbl.y" :x2="zoomedChartConfig.W - zoomedChartConfig.P" :y2="lbl.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
              <text :x="zoomedChartConfig.LP - 6" :y="lbl.y + 4" text-anchor="end" font-size="9" fill="#9ca3af">{{ formatCurrencyShort(lbl.value) }}</text>
            </g>
            <!-- Clip ceiling marker -->
            <line :x1="zoomedChartConfig.LP" :y1="zoomedChartConfig.P" :x2="zoomedChartConfig.W - zoomedChartConfig.P" :y2="zoomedChartConfig.P" stroke="#f59e0b" stroke-width="1" stroke-dasharray="6,3" />
            <text :x="zoomedChartConfig.LP - 6" :y="zoomedChartConfig.P + 4" text-anchor="end" font-size="9" fill="#f59e0b">{{ formatCurrencyShort(zoomedChartConfig.zMax) }}</text>
            <!-- Baseline -->
            <line :x1="zoomedChartConfig.LP" :y1="zoomedChartConfig.H - zoomedChartConfig.P" :x2="zoomedChartConfig.W - zoomedChartConfig.P" :y2="zoomedChartConfig.H - zoomedChartConfig.P" stroke="#9ca3af" stroke-width="1.5" />
            <!-- Trend line -->
            <path :d="zoomedChartConfig.d" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70" />
            <!-- Dots — skip clipped ones to show "above ceiling" visually -->
            <g v-for="(p, i) in zoomedChartConfig.points" :key="`zd-${i}`">
              <circle
                v-if="!p.isClipped"
                :cx="p.x" :cy="p.y" r="4"
                class="fill-primary-500 dark:fill-primary-400 cursor-pointer"
              >
                <title>{{ formatDate(p.date) }}: {{ formatCurrency(p.value) }}</title>
              </circle>
              <!-- Clipped dots shown as small triangles at ceiling -->
              <polygon
                v-else
                :points="`${p.x},${zoomedChartConfig.P - 6} ${p.x - 5},${zoomedChartConfig.P + 2} ${p.x + 5},${zoomedChartConfig.P + 2}`"
                fill="#f59e0b" opacity="0.7"
              >
                <title>{{ formatDate(p.date) }}: {{ formatCurrency(p.value) }} (above zoom ceiling)</title>
              </polygon>
              <text v-if="i % 14 === 0 || i === zoomedChartConfig.points.length - 1" :x="p.x" :y="zoomedChartConfig.H - 12" text-anchor="middle" font-size="8" fill="#9ca3af">
                {{ formatDate(p.date) }}
              </text>
            </g>
          </svg>

          <!-- Legend -->
          <p class="text-[10px] text-amber-500 mt-1">
            <span class="inline-block w-2 h-2 bg-amber-400 mr-1" style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%)"></span>
            Triangles indicate values above the zoom ceiling
          </p>
        </div>
      </div>

      <div v-else class="h-40 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        Keep uploading daily reports to generate your trend map.
      </div>
    </UCard>

    <!-- ── Delinquent Residents Table ─────────────────────────────────────────── -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold">Delinquent Residents</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Active delinquencies with 12-month history · click any row to open that date's full snapshot
            </p>
          </div>
          <UBadge v-if="enrichedResidents?.length" color="primary" variant="soft" size="lg" class="font-bold">
            {{ enrichedResidents.length }} {{ enrichedResidents.length === 1 ? 'Resident' : 'Residents' }}
          </UBadge>
        </div>
      </template>

      <!-- Error State for Missing View -->
      <div v-if="residentsError" class="p-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-lg">
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-orange-500 mt-0.5" />
          <div>
            <h4 class="font-bold text-orange-800 dark:text-orange-400 mb-1">Database View Not Found</h4>
            <p class="text-sm text-orange-700 dark:text-orange-500 mb-2">
              The view <code class="px-1 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded font-mono text-xs">view_table_delinquent_residents</code> doesn't exist yet.
            </p>
            <p class="text-xs font-mono bg-orange-100 dark:bg-orange-900/30 p-2 rounded text-orange-600">
              Run: <strong>npx supabase db push</strong>
            </p>
          </div>
        </div>
      </div>

      <div v-else class="max-h-[520px] overflow-y-auto">
        <GenericDataTable
          :data="enrichedResidents"
          :columns="residentColumns"
          :loading="residentsStatus === 'pending'"
          row-key="id"
          striped
          clickable
          @row-click="handleResidentClick"
        >
          <template #cell-unit_name="{ value }">
            <span v-if="value" class="font-mono font-semibold text-gray-800 dark:text-gray-200">{{ value }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #cell-resident="{ value }">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span class="font-medium truncate">{{ value }}</span>
            </div>
          </template>

          <template #cell-total_unpaid="{ value }">
            <CellsCurrencyCell :value="value" class="text-red-600 dark:text-red-400 font-bold" />
          </template>

          <!-- MoM delta -->
          <template #cell-delta_unpaid="{ value }">
            <template v-if="value === null">
              <UBadge color="blue" variant="soft" size="xs">New</UBadge>
            </template>
            <template v-else-if="value === 0">
              <span class="text-gray-400 text-xs font-mono">—</span>
            </template>
            <template v-else>
              <span :class="value > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'" class="text-xs font-bold font-mono">
                {{ value > 0 ? '▲' : '▼' }} {{ formatCurrency(Math.abs(value)) }}
              </span>
            </template>
          </template>

          <!-- Months on list out of 12 -->
          <template #cell-months_on_list="{ value }">
            <div class="flex flex-col items-center">
              <span :class="value >= 6 ? 'text-red-600 dark:text-red-400' : value >= 3 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'" class="font-bold text-sm tabular-nums">
                {{ value }}
              </span>
              <span class="text-[9px] text-gray-400">/ 12 mo</span>
            </div>
          </template>

          <!-- Peak in last 12 months -->
          <template #cell-peak_unpaid="{ value }">
            <CellsCurrencyCell :value="value" class="text-gray-500 dark:text-gray-400 text-xs" />
          </template>

          <template #cell-days_61_90="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-orange-600 dark:text-orange-400 font-semibold" />
            <span v-else class="text-gray-300 dark:text-gray-700 text-xs">—</span>
          </template>

          <template #cell-days_90_plus="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-red-700 dark:text-red-400 font-bold" />
            <span v-else class="text-gray-300 dark:text-gray-700 text-xs">—</span>
          </template>

          <template #cell-created_at="{ value }">
            <CellsDateCell :value="value" format="short" />
          </template>
        </GenericDataTable>

        <div v-if="!enrichedResidents?.length && residentsStatus !== 'pending'" class="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
          <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p class="text-gray-500 font-medium">No active delinquencies found.</p>
          <p class="text-xs text-gray-400 mt-1">All residents are current on payments.</p>
        </div>
      </div>
    </UCard>

    <!-- ── Monthly Benchmarks + Historical Snapshots ─────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

      <!-- Monthly Benchmark Chart -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold">Monthly Benchmarks (26th)</h3>
            <span class="text-xs text-gray-400">Yardi Cycle Snapshots</span>
          </div>
        </template>

        <div v-if="chartConfig" class="relative group">
          <svg :viewBox="`0 0 ${chartConfig.W} ${chartConfig.H}`" class="w-full h-auto overflow-visible">
            <line :x1="chartConfig.P" :y1="chartConfig.H - chartConfig.P" :x2="chartConfig.W - chartConfig.P" :y2="chartConfig.H - chartConfig.P" stroke="#e5e7eb" stroke-width="1" />
            <path :d="chartConfig.d" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="3" stroke-linecap="round" />
            <g v-for="(p, i) in chartConfig.points" :key="i">
              <circle :cx="p.x" :cy="p.y" r="6" fill="white" stroke="rgb(var(--color-primary-500))" stroke-width="2" class="cursor-pointer hover:r-8">
                <title>{{ new Date(trendData[i].snapshot_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}: {{ formatCurrency(p.value) }}</title>
              </circle>
              <text :x="p.x" :y="chartConfig.H - 10" text-anchor="middle" font-size="10" fill="#9ca3af">
                {{ new Date(trendData[i].snapshot_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }) }}
              </text>
            </g>
          </svg>
        </div>
        <div v-else class="h-40 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          Monthly benchmarks appear on the 26th.
        </div>

        <div class="mt-3 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
          <UIcon name="i-heroicons-information-circle" class="w-3.5 h-3.5 inline mr-1 text-blue-400" />
          Historical totals reflect all tenancy records on or before each 26th, including tenancies later resolved. Values may appear slightly elevated for earlier months.
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
            { key: 'snapshot_date', label: 'Date',    sortable: true },
            { key: 'total_unpaid',  label: 'Unpaid',  sortable: true, align: 'right' },
            { key: 'balance',       label: 'Balance', sortable: true, align: 'right' }
          ]"
          row-key="snapshot_date"
          striped
        >
          <template #cell-snapshot_date="{ value }">
            <CellsDateCell :value="value + 'T12:00:00'" format="medium" />
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

    <!-- ── View Snapshot by Date (moved to bottom) ───────────────────────────── -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold">View Snapshot by Date</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Browse the full per-resident detail for any upload date</p>
          </div>
          <div v-if="dateRangeSummary" class="text-right">
            <p class="text-xs text-gray-500">{{ dateRangeSummary.count }} snapshots available</p>
            <p class="text-xs text-gray-400">{{ dateRangeSummary.earliest }} – {{ dateRangeSummary.latest }}</p>
          </div>
        </div>
      </template>

      <div v-if="datesStatus === 'pending'" class="flex items-center justify-center py-8 gap-3">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
        <span class="text-gray-500">Loading available dates...</span>
      </div>

      <div v-else-if="datesError" class="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg">
        <div class="flex items-start gap-2">
          <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-500 mt-0.5" />
          <div class="text-sm text-red-700 dark:text-red-400">
            <p class="font-medium">Error loading snapshot dates</p>
            <p class="text-xs mt-1">{{ datesError.message }}</p>
          </div>
        </div>
      </div>

      <div v-else-if="!availableDates || availableDates.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-calendar-days" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No snapshot dates available</p>
        <p class="text-xs text-gray-400 mt-1">Upload delinquency reports via the Solver to generate snapshots.</p>
      </div>

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
                  <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400" />
                </div>
              </template>
            </USelectMenu>
          </div>
          <UButton icon="i-heroicons-arrow-right" label="View Snapshot" color="primary" size="lg" :disabled="!selectedDate" @click="navigateToSnapshot" />
          <UButton v-if="selectedDate" icon="i-heroicons-x-mark" color="gray" variant="ghost" size="lg" @click="selectedDate = null" title="Clear selection" />
        </div>
      </div>
    </UCard>

    <!-- ── Error State ────────────────────────────────────────────────────────── -->
    <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="red" variant="soft" title="Error" :description="error" class="mt-4" />

    <!-- ── Context Helper ─────────────────────────────────────────────────────── -->
    <LazyContextHelper title="Delinquency Manager" description="Accounts Receivable & Aging Analysis">
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Aging Buckets</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>0–30 Days:</strong> Standard delinquencies, often resolved with a payment reminder.</li>
            <li><strong>31–60 Days:</strong> Escalating risk — included in the "31+ Days" summary card.</li>
            <li><strong class="text-orange-600">61–90 Days:</strong> High-risk; may require formal legal notices.</li>
            <li><strong class="text-red-600">90+ Days:</strong> Critical; typically associated with eviction proceedings.</li>
          </ul>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Resident History Columns</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>vs Last Mo.:</strong> Compares the current balance against the most recent upload from the <em>previous calendar month</em> (not the same date last month). For example, if today is March 10, it compares against the latest February record for that resident. ▲ = balance worsened, ▼ = balance improved, "New" = no record existed last month.</li>
            <li><strong>As Of:</strong> The date this resident's balance last changed. Because the system only creates a new record when the balance actually changes, "As Of 3/2" on March 10 means every upload since March 2 showed the same balance — their situation has not changed.</li>
            <li><strong>Months X/12:</strong> How many calendar months (out of the last 12) this resident appeared on the delinquency list with a positive balance. Currently limited by how long data has been collected — will grow over time for persistent delinquencies. A resident at 2/12 today simply means data collection started 2 months ago.</li>
            <li><strong>Peak (12mo):</strong> Highest total unpaid balance recorded in the last 12 months.</li>
          </ul>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Trend Charts</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Full Range:</strong> 90-day window showing all upload dates.</li>
            <li><strong>Zoomed:</strong> Same data with a capped Y-axis to reveal resolution in the trailing (lower-balance) period. Amber triangles mark points above the ceiling.</li>
          </ul>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Financial Terminology</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Total Unpaid:</strong> Gross outstanding charges.</li>
            <li><strong>Total Balance:</strong> Net sum, including Prepay credits.</li>
          </ul>
        </section>
      </div>
    </LazyContextHelper>

  </div>
</template>
