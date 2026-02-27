<script setup lang="ts">
import { onMounted, computed, watch, ref } from 'vue'
import { definePageMeta, usePropertyState, useSupabaseClient } from '#imports'
import { useAvailabilityAnalysis } from '../../../composables/useAvailabilityAnalysis'

definePageMeta({
  layout: 'dashboard'
})

const { activeProperty, propertyOptions } = usePropertyState()
const supabase = useSupabaseClient()

const {
  latestSnapshot,
  dailyTrend,
  weeklyTrend,
  floorPlanBreakdown,
  priceChangeEvents,
  allPropertySnapshots,
  loadingSnapshot,
  loadingDailyTrend,
  loadingWeeklyTrend,
  loadingFloorPlan,
  loadingPriceChanges,
  loadingAllProperties,
  loading,
  error,
  fetchLatestSnapshot,
  fetchDailyTrend,
  fetchWeeklyTrend,
  fetchFloorPlanBreakdown,
  fetchPriceChangeEvents,
  fetchAllPropertySnapshots
} = useAvailabilityAnalysis()

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadPropertyData() {
  if (!activeProperty.value) return
  await Promise.all([
    fetchLatestSnapshot(),
    fetchDailyTrend(),
    fetchWeeklyTrend(),
    fetchFloorPlanBreakdown(),
    fetchPriceChangeEvents()
  ])
}

async function loadAllProperties() {
  const codes = propertyOptions.value.map((o: any) => o.value).filter(Boolean)
  if (codes.length > 0) {
    await fetchAllPropertySnapshots(codes)
  }
}

onMounted(async () => {
  await Promise.all([loadPropertyData(), loadAllProperties()])
})

watch(activeProperty, loadPropertyData)

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatCurrency = (val: number | null) => {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const formatPct = (val: number | null) =>
  val == null ? '—' : `${val.toFixed(1)}%`

// ─── Health Matrix Scoring ─────────────────────────────────────────────────────

function vacancyScore(rate: number): 'green' | 'yellow' | 'red' {
  if (rate < 5)  return 'green'
  if (rate < 10) return 'yellow'
  return 'red'
}

function domScore(days: number | null): 'green' | 'yellow' | 'red' {
  if (days == null) return 'green'
  if (days < 14) return 'green'
  if (days < 30) return 'yellow'
  return 'red'
}

function spreadScore(pct: number | null): 'green' | 'yellow' | 'red' {
  if (pct == null) return 'green'
  if (pct < 3) return 'green'
  if (pct < 8) return 'yellow'
  return 'red'
}

function overallScore(snap: any): 'green' | 'yellow' | 'red' {
  if (!snap) return 'red'
  const scores = [
    vacancyScore(snap.vacancy_rate ?? 0),
    domScore(snap.avg_days_on_market),
    spreadScore(snap.rent_spread_pct ?? 0)
  ]
  if (scores.some(s => s === 'red'))    return 'red'
  if (scores.some(s => s === 'yellow')) return 'yellow'
  return 'green'
}

const scoreEmoji: Record<string, string> = { green: '🟢', yellow: '🟡', red: '🔴' }
const scoreClass: Record<string, string> = {
  green:  'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-500 dark:text-yellow-400',
  red:    'text-red-600 dark:text-red-400'
}

// Property label lookup
const propertyLabel = computed(() => {
  const opt = propertyOptions.value?.find((o: any) => o.value === activeProperty.value)
  return opt?.label || activeProperty.value || '—'
})

// ─── Summary Cards ────────────────────────────────────────────────────────────

const vacancyRate = computed(() => {
  const snap = latestSnapshot.value
  if (!snap || !snap.total_units) return null
  return Math.round((snap.available_count / snap.total_units) * 100 * 10) / 10
})

// ─── SVG Chart Helpers ────────────────────────────────────────────────────────

interface ChartPoint { x: number; y: number; value: number; label?: string }

function buildLineChart(
  values: number[],
  labels: string[],
  opts: { width?: number; height?: number; padding?: number; leftPad?: number } = {}
) {
  const width    = opts.width   ?? 600
  const height   = opts.height  ?? 150
  const padding  = opts.padding ?? 30
  const leftPad  = opts.leftPad ?? 55

  if (!values.length) return null

  const max = Math.max(...values, 1) * 1.15
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const xStep = (width - leftPad - padding) / Math.max(values.length - 1, 1)
  const points: ChartPoint[] = values.map((val, i) => ({
    x: leftPad + i * xStep,
    y: height - padding - ((val - min) / range) * (height - padding * 2),
    value: val,
    label: labels[i]
  }))

  const d = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')

  // Y-axis labels (4 steps)
  const yAxisLabels = Array.from({ length: 4 }, (_, i) => {
    const val = min + (range / 3) * i
    const y   = height - padding - ((val - min) / range) * (height - padding * 2)
    return { value: val, y }
  })

  return { width, height, padding, leftPad, max, min, points, d, yAxisLabels }
}

// ─── 30-Day Trend Chart (Available / Applied / Leased) ───────────────────────

const trend30Config = computed(() => {
  const data = dailyTrend.value
  if (!data.length) return null

  const labels    = data.map(d => formatDate(d.snapshot_date))
  const available = data.map(d => d.available_count)
  const applied   = data.map(d => d.applied_count)
  const leased    = data.map(d => d.leased_count)

  const width = 600; const height = 150; const padding = 30; const leftPad = 42; const rightPad = 42

  const xStep = (width - leftPad - rightPad) / Math.max(data.length - 1, 1)

  // Left axis: Available only
  const maxLeft = Math.max(...available, 1) * 1.15
  const toYLeft = (v: number) => height - padding - (v / maxLeft) * (height - padding * 2)

  // Right axis: Applied + Leased (shared scale so they're comparable to each other)
  const maxRight = Math.max(...applied, ...leased, 1) * 1.15
  const toYRight = (v: number) => height - padding - (v / maxRight) * (height - padding * 2)

  const buildPath = (vals: number[], toY: (v: number) => number) =>
    vals.reduce((acc, v, i) => acc + (i === 0 ? `M ${leftPad + i * xStep} ${toY(v)}` : ` L ${leftPad + i * xStep} ${toY(v)}`), '')

  // Grid lines + labels driven by left (Available) axis
  const yLabelsLeft = Array.from({ length: 4 }, (_, i) => {
    const val = Math.round((maxLeft / 3) * i)
    return { value: val, y: toYLeft(val) }
  })

  // Right axis labels (Applied/Leased scale)
  const yLabelsRight = Array.from({ length: 4 }, (_, i) => {
    const val = Math.round((maxRight / 3) * i)
    return { value: val, y: toYRight(val) }
  })

  return {
    width, height, padding, leftPad, rightPad, xStep,
    availablePath: buildPath(available, toYLeft),
    appliedPath:   buildPath(applied,   toYRight),
    leasedPath:    buildPath(leased,    toYRight),
    points:        data.map((_, i) => ({ x: leftPad + i * xStep, label: labels[i] })),
    yLabelsLeft,
    yLabelsRight,
  }
})

// ─── Vacancy Rate Trend ───────────────────────────────────────────────────────

const vacancyTrendConfig = computed(() => {
  const data = dailyTrend.value
  if (!data.length) return null
  const values = data.map(d => Number(d.vacancy_rate ?? 0))
  const labels = data.map(d => formatDate(d.snapshot_date))
  return buildLineChart(values, labels)
})

// ─── Rent Chart: Market vs Contracted ────────────────────────────────────────
// avg_offered_rent = Yardi "Market Rent" (asking price / market rate)
// avg_contracted_rent = average active lease rent_amount (what tenants pay)

const rentChartConfig = computed(() => {
  const data = dailyTrend.value.filter(d => d.avg_offered_rent && d.avg_contracted_rent)
  if (data.length < 2) return null

  const labels     = data.map(d => formatDate(d.snapshot_date))
  const market     = data.map(d => Number(d.avg_offered_rent))
  const contracted = data.map(d => Number(d.avg_contracted_rent))
  const allVals = [...market, ...contracted]
  const max = Math.max(...allVals) * 1.05
  const min = Math.min(...allVals) * 0.95
  const range = max - min || 1

  const width = 600; const height = 150; const padding = 30; const leftPad = 60
  const xStep = (width - leftPad - padding) / Math.max(data.length - 1, 1)
  const toY = (v: number) => height - padding - ((v - min) / range) * (height - padding * 2)

  const buildPath = (vals: number[]) =>
    vals.reduce((acc, v, i) => acc + (i === 0 ? `M ${leftPad + i * xStep} ${toY(v)}` : ` L ${leftPad + i * xStep} ${toY(v)}`), '')

  // Shade area between lines (discount between market asking and actual contracted rent)
  const areaPath = [
    ...market.map((v, i) => `${i === 0 ? 'M' : 'L'} ${leftPad + i * xStep} ${toY(v)}`),
    ...[...contracted].reverse().map((v, i) => `L ${leftPad + (data.length - 1 - i) * xStep} ${toY(v)}`),
    'Z'
  ].join(' ')

  const yLabels = Array.from({ length: 4 }, (_, i) => {
    const val = min + (range / 3) * i
    return { value: Math.round(val), y: toY(val) }
  })

  return {
    width, height, padding, leftPad, xStep,
    marketPath: buildPath(market), contractedPath: buildPath(contracted), areaPath,
    points: data.map((_, i) => ({ x: leftPad + i * xStep, label: labels[i] })),
    yLabels
  }
})

// ─── Days on Market Trend ─────────────────────────────────────────────────────

const domChartConfig = computed(() => {
  const data = dailyTrend.value.filter(d => d.avg_days_on_market != null)
  if (data.length < 2) return null
  const values = data.map(d => Number(d.avg_days_on_market))
  const labels = data.map(d => formatDate(d.snapshot_date))
  return buildLineChart(values, labels)
})

// Benchmark Y position for days-on-market chart
const domBenchmarkY = computed(() => {
  if (!domChartConfig.value) return null
  const c = domChartConfig.value
  const { min, max, height, padding } = c
  const range = max - min || 1
  const y = height - padding - ((14 - min) / range) * (height - padding * 2)
  return y
})

// ─── Concession Chart ─────────────────────────────────────────────────────────

const concessionChartConfig = computed(() => {
  const data = dailyTrend.value.filter(d => d.avg_concession_days != null || d.avg_concession_amount != null)
  if (data.length < 2) return null

  const labels = data.map(d => formatDate(d.snapshot_date))
  const days   = data.map(d => Number(d.avg_concession_days ?? 0))
  const amount = data.map(d => Number(d.avg_concession_amount ?? 0))

  const maxDays   = Math.max(...days, 1)
  const maxAmount = Math.max(...amount, 1)

  const width = 600; const height = 150; const padding = 30; const leftPad = 55
  const xStep = (width - leftPad - padding) / Math.max(data.length - 1, 1)

  const toDaysY   = (v: number) => height - padding - (v / (maxDays   * 1.15)) * (height - padding * 2)
  const toAmountY = (v: number) => height - padding - (v / (maxAmount * 1.15)) * (height - padding * 2)

  const buildPath = (vals: number[], toY: (v: number) => number) =>
    vals.reduce((acc, v, i) => acc + (i === 0 ? `M ${leftPad + i * xStep} ${toY(v)}` : ` L ${leftPad + i * xStep} ${toY(v)}`), '')

  return {
    width, height, padding, leftPad,
    daysPath: buildPath(days, toDaysY),
    amountPath: buildPath(amount, toAmountY),
    points: data.map((_, i) => ({ x: leftPad + i * xStep, label: labels[i] }))
  }
})

// ─── Price Change Frequency (weekly bars) ────────────────────────────────────

const priceChangeWeekly = computed(() => {
  const events = priceChangeEvents.value
  if (!events.length) return []

  const weekMap = new Map<string, number>()
  for (const e of events) {
    const d    = new Date(e.event_date)
    const mon  = new Date(d)
    mon.setDate(d.getDate() - d.getDay() + 1) // Monday
    const key  = mon.toISOString().split('T')[0]
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1)
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count, label: formatDate(week) }))
})

const priceBarConfig = computed(() => {
  const data = priceChangeWeekly.value
  if (!data.length) return null

  const counts  = data.map(d => d.count)
  const maxVal  = Math.max(...counts, 1)
  const width   = 600; const height = 120; const padding = 30; const leftPad = 40
  const barW    = Math.max(4, (width - leftPad - padding) / data.length - 2)
  const xStep   = (width - leftPad - padding) / Math.max(data.length, 1)
  const toY     = (v: number) => height - padding - (v / (maxVal * 1.15)) * (height - padding * 2)
  const toH     = (v: number) => (v / (maxVal * 1.15)) * (height - padding * 2)

  return { width, height, padding, leftPad, maxVal, barW, xStep, data: data.map((d, i) => ({
    ...d,
    x: leftPad + i * xStep,
    y: toY(d.count),
    h: toH(d.count)
  })) }
})

// ─── Weekly Annual Chart ──────────────────────────────────────────────────────

const weeklyAnnualConfig = computed(() => {
  const data = weeklyTrend.value
  if (!data.length) return null

  // Generate full 52-week spine from oldest week in data to today
  const today    = new Date()
  const weekMs   = 7 * 24 * 60 * 60 * 1000
  const start    = new Date(today.getTime() - 51 * weekMs)
  start.setDate(start.getDate() - start.getDay() + 1) // align to Monday

  const allWeeks: string[] = []
  const cur = new Date(start)
  for (let i = 0; i < 52; i++) {
    allWeeks.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 7)
  }

  const dataMap = new Map(data.map(d => [d.week_start, d]))

  const width = 700; const height = 130; const padding = 25; const leftPad = 45
  const xStep = (width - leftPad - padding) / Math.max(allWeeks.length - 1, 1)

  const withData     = allWeeks.map(w => dataMap.get(w) || null)
  const dataValues   = withData.filter(d => d != null).map(d => Number(d!.avg_available_count))
  const maxVal       = Math.max(...dataValues, 1) * 1.15
  const toY          = (v: number) => height - padding - (v / maxVal) * (height - padding * 2)

  // Path only through known data points
  const knownPoints: Array<{ x: number; y: number; week: string }> = []
  allWeeks.forEach((w, i) => {
    const d = dataMap.get(w)
    if (d) knownPoints.push({ x: leftPad + i * xStep, y: toY(Number(d.avg_available_count)), week: w })
  })

  const pathD = knownPoints.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')

  return {
    width, height, padding, leftPad, xStep, maxVal,
    allWeeks, withData, knownPoints, pathD, toY,
    quarterMarks: allWeeks.filter((_, i) => i % 13 === 0).map((w, qi) => ({
      x: leftPad + allWeeks.indexOf(w) * xStep,
      label: `Q${qi + 1}`
    }))
  }
})

// ─── Leasing Funnel ───────────────────────────────────────────────────────────

const funnelData = computed(() => {
  const snap = latestSnapshot.value
  if (!snap) return null

  const avail   = snap.available_count
  const applied = snap.applied_count
  const leased  = snap.leased_count
  const total   = avail + applied + leased
  if (total === 0) return null

  const applyConv  = avail  > 0 ? Math.round((applied / avail)  * 100) : 0
  const leaseConv  = applied > 0 ? Math.round((leased  / applied) * 100) : 0

  return [
    { label: 'Available',  count: avail,   pct: 100,            color: 'bg-blue-500',   text: 'text-blue-700  dark:text-blue-300',  conv: null },
    { label: 'Applied',    count: applied, pct: total ? Math.round(applied / total * 100) : 0, color: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-300', conv: applyConv },
    { label: 'Leased',     count: leased,  pct: total ? Math.round(leased  / total * 100) : 0, color: 'bg-green-500',  text: 'text-green-700  dark:text-green-300',  conv: leaseConv }
  ]
})
</script>

<template>
  <div class="p-6 space-y-8">

    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Availability Analysis</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Trend data captured daily by the Solver Engine
        </p>
      </div>
      <UButton
        icon="i-heroicons-arrow-path"
        color="neutral"
        variant="ghost"
        :loading="loading"
        @click="async () => { await loadPropertyData(); await loadAllProperties() }"
      >
        Refresh
      </UButton>
    </div>

    <!-- ─── Section 1: Health Matrix ───────────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-table-cells" class="w-5 h-5 text-primary-500" />
          <h2 class="font-bold">Portfolio Health Matrix</h2>
          <span class="text-xs text-gray-400 ml-auto">Latest snapshot per property</span>
        </div>
      </template>

      <div v-if="allPropertySnapshots.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Property</th>
              <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Vacancy %</th>
              <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Available</th>
              <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Applied</th>
              <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Avg Days on Mkt</th>
              <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Rent Spread</th>
              <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Concessions</th>
              <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Score</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in allPropertySnapshots"
              :key="row.property_code"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-2 px-3 font-semibold">{{ row.property_code }}</td>
              <template v-if="row.snapshot">
                <td class="py-2 px-3 text-center">
                  <span :class="scoreClass[vacancyScore(row.snapshot.vacancy_rate ?? 0)]" class="font-bold">
                    {{ formatPct(row.snapshot.vacancy_rate) }}
                  </span>
                </td>
                <td class="py-2 px-3 text-center">{{ row.snapshot.available_count }}</td>
                <td class="py-2 px-3 text-center">{{ row.snapshot.applied_count }}</td>
                <td class="py-2 px-3 text-center">
                  <span :class="scoreClass[domScore(row.snapshot.avg_days_on_market)]">
                    {{ row.snapshot.avg_days_on_market != null ? `${row.snapshot.avg_days_on_market}d` : '—' }}
                  </span>
                </td>
                <td class="py-2 px-3 text-center">
                  <span :class="scoreClass[spreadScore(row.snapshot.rent_spread_pct)]">
                    {{ formatPct(row.snapshot.rent_spread_pct) }}
                  </span>
                </td>
                <td class="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                  {{ row.snapshot.avg_concession_days != null ? `${row.snapshot.avg_concession_days}d` : '—' }}
                  <span v-if="row.snapshot.avg_concession_amount" class="text-xs ml-1">
                    / {{ formatCurrency(row.snapshot.avg_concession_amount) }}
                  </span>
                </td>
                <td class="py-2 px-3 text-center text-lg">
                  {{ scoreEmoji[overallScore(row.snapshot)] }}
                </td>
              </template>
              <template v-else>
                <td colspan="7" class="py-2 px-3 text-center text-gray-400 italic text-xs">No snapshot data yet</td>
              </template>
            </tr>
          </tbody>
        </table>
        <div class="mt-4 flex flex-wrap gap-6 px-3">
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            <span class="font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">Vacancy Rate</span>
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5">🟢 <span>&lt; 5%</span></span>
              <span class="flex items-center gap-1.5">🟡 <span>5–10%</span></span>
              <span class="flex items-center gap-1.5">🔴 <span>&gt; 10%</span></span>
            </div>
          </div>
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            <span class="font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">Days on Market</span>
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5">🟢 <span>&lt; 14d</span></span>
              <span class="flex items-center gap-1.5">🟡 <span>14–30d</span></span>
              <span class="flex items-center gap-1.5">🔴 <span>&gt; 30d</span></span>
            </div>
          </div>
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            <span class="font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">Rent Spread</span>
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5">🟢 <span>&lt; 3%</span></span>
              <span class="flex items-center gap-1.5">🟡 <span>3–8%</span></span>
              <span class="flex items-center gap-1.5">🔴 <span>&gt; 8%</span></span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-400 italic">
        No portfolio data available yet. Run the Solver to generate snapshots.
      </div>
    </UCard>

    <!-- ─── Section 2: Property Selector + Summary Cards ─────────────────── -->
    <div>
      <div class="flex items-center gap-3 mb-4">
        <h2 class="text-lg font-bold">Property Detail</h2>
        <UBadge v-if="activeProperty" color="primary" variant="soft">{{ activeProperty }}</UBadge>
      </div>

      <div v-if="latestSnapshot" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard class="bg-blue-50 dark:bg-blue-900/10">
          <div class="text-sm text-blue-700 dark:text-blue-300 font-medium">Available</div>
          <div class="text-3xl font-bold text-blue-900 dark:text-blue-100">{{ latestSnapshot.available_count }}</div>
          <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">units on market</div>
        </UCard>

        <UCard class="bg-yellow-50 dark:bg-yellow-900/10">
          <div class="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Applied</div>
          <div class="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{{ latestSnapshot.applied_count }}</div>
          <div class="text-xs text-yellow-600 dark:text-yellow-400 mt-1">applications pending</div>
        </UCard>

        <UCard class="bg-green-50 dark:bg-green-900/10">
          <div class="text-sm text-green-700 dark:text-green-300 font-medium">Leased</div>
          <div class="text-3xl font-bold text-green-900 dark:text-green-100">{{ latestSnapshot.leased_count }}</div>
          <div class="text-xs text-green-600 dark:text-green-400 mt-1">recently leased</div>
        </UCard>

        <UCard :class="vacancyRate != null && vacancyRate > 10 ? 'bg-red-50 dark:bg-red-900/10' : vacancyRate != null && vacancyRate > 5 ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-gray-50 dark:bg-gray-800'">
          <div class="text-sm text-gray-600 dark:text-gray-400 font-medium">Vacancy Rate</div>
          <div class="text-3xl font-bold" :class="vacancyRate != null && vacancyRate > 10 ? 'text-red-700 dark:text-red-400' : vacancyRate != null && vacancyRate > 5 ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-800 dark:text-gray-200'">
            {{ formatPct(vacancyRate) }}
          </div>
          <div class="text-xs text-gray-400 mt-1">of {{ latestSnapshot.total_units }} units</div>
        </UCard>
      </div>

      <div v-else-if="!loadingSnapshot" class="text-center py-8 text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
        <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p class="font-medium">No snapshot data for {{ activeProperty || 'this property' }}</p>
        <p class="text-xs mt-1">Run the Solver Engine to capture the first snapshot.</p>
      </div>
    </div>

    <!-- ─── Sections 3–11: Two-column grid ──────────────────────────────── -->
    <!-- Hover any data point (dot or bar) for exact date + value tooltip -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Floor Plan Breakdown -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">Floor Plan Breakdown</h3>
              <span class="text-xs text-gray-400">Updated daily each morning</span>
            </div>
          </template>
          <div v-if="floorPlanBreakdown.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="text-left py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Floor Plan</th>
                  <th class="text-center py-2 px-2 font-semibold text-gray-400">B×B</th>
                  <th class="text-right py-2 px-2 font-semibold text-gray-400">SF</th>
                  <th class="text-center py-2 px-2 font-semibold text-blue-600 dark:text-blue-400">Avail</th>
                  <th class="text-center py-2 px-2 font-semibold text-yellow-600 dark:text-yellow-400">App</th>
                  <th class="text-center py-2 px-2 font-semibold text-green-600 dark:text-green-400">Leased</th>
                  <th class="text-right py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Avg Rent</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="fp in floorPlanBreakdown"
                  :key="fp.floor_plan_id"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="py-1.5 px-2 font-medium">
                    {{ fp.floor_plan_name }}<span class="text-gray-400 font-normal"> ({{ fp.total_units }})</span>
                  </td>
                  <td class="py-1.5 px-2 text-center text-xs text-gray-500 dark:text-gray-400 font-mono">
                    <span v-if="fp.bedrooms != null && fp.bathrooms != null">{{ fp.bedrooms }}×{{ fp.bathrooms }}</span>
                    <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                  </td>
                  <td class="py-1.5 px-2 text-right text-xs text-gray-500 dark:text-gray-400 font-mono">
                    <span v-if="fp.area_sqft">{{ fp.area_sqft.toLocaleString() }}</span>
                    <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                  </td>
                  <td class="py-1.5 px-2 text-center">
                    <UBadge v-if="fp.available > 0" color="primary" variant="soft" size="sm">{{ fp.available }}</UBadge>
                    <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                  </td>
                  <td class="py-1.5 px-2 text-center">
                    <span v-if="fp.applied > 0" class="font-semibold text-yellow-600 dark:text-yellow-400">{{ fp.applied }}</span>
                    <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                  </td>
                  <td class="py-1.5 px-2 text-center">
                    <span v-if="fp.leased > 0" class="font-semibold text-green-600 dark:text-green-400">{{ fp.leased }}</span>
                    <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                  </td>
                  <td class="py-1.5 px-2 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                    {{ formatCurrency(fp.avg_market_rent) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8 text-gray-400 italic">
            No floor plan data for {{ activeProperty || 'this property' }}.
          </div>
        </UCard>

        <!-- Annual Weekly Available Units -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">Annual Weekly Available Units</h3>
              <span class="text-xs text-gray-400">52-week view · hover dots for detail</span>
            </div>
          </template>
          <div v-if="weeklyAnnualConfig">
            <svg :viewBox="`0 0 ${weeklyAnnualConfig.width} ${weeklyAnnualConfig.height}`" class="w-full h-36 overflow-visible">
              <line :x1="weeklyAnnualConfig.leftPad" :y1="weeklyAnnualConfig.height - weeklyAnnualConfig.padding" :x2="weeklyAnnualConfig.width - weeklyAnnualConfig.padding" :y2="weeklyAnnualConfig.height - weeklyAnnualConfig.padding" stroke="#9ca3af" stroke-width="1" />
              <g v-for="(w, i) in weeklyAnnualConfig.allWeeks" :key="`w${i}`">
                <line
                  :x1="weeklyAnnualConfig.leftPad + i * weeklyAnnualConfig.xStep"
                  :y1="weeklyAnnualConfig.height - weeklyAnnualConfig.padding"
                  :x2="weeklyAnnualConfig.leftPad + i * weeklyAnnualConfig.xStep"
                  :y2="weeklyAnnualConfig.height - weeklyAnnualConfig.padding + 4"
                  stroke="#d1d5db" stroke-width="1"
                />
              </g>
              <g v-for="q in weeklyAnnualConfig.quarterMarks" :key="q.label">
                <text :x="q.x" :y="weeklyAnnualConfig.height - 2" text-anchor="middle" font-size="9" fill="#9ca3af">{{ q.label }}</text>
              </g>
              <g v-for="(w, i) in weeklyAnnualConfig.allWeeks" :key="`nd${i}`">
                <circle
                  v-if="!weeklyAnnualConfig.withData[i]"
                  :cx="weeklyAnnualConfig.leftPad + i * weeklyAnnualConfig.xStep"
                  :cy="weeklyAnnualConfig.height - weeklyAnnualConfig.padding - 10"
                  r="2.5" fill="#e5e7eb"
                />
              </g>
              <path v-if="weeklyAnnualConfig.pathD" :d="weeklyAnnualConfig.pathD" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="p in weeklyAnnualConfig.knownPoints" :key="p.week">
                <circle :cx="p.x" :cy="p.y" r="4" class="fill-primary-500 dark:fill-primary-400">
                  <title>Week of {{ formatDate(p.week) }}: avg {{ Math.round(p.y) }} units</title>
                </circle>
              </g>
              <text :x="weeklyAnnualConfig.leftPad - 4" :y="weeklyAnnualConfig.padding + 4" text-anchor="end" font-size="9" fill="#9ca3af">{{ Math.round(weeklyAnnualConfig.maxVal / 1.15) }}</text>
              <text :x="weeklyAnnualConfig.leftPad - 4" :y="weeklyAnnualConfig.height - weeklyAnnualConfig.padding" text-anchor="end" font-size="9" fill="#9ca3af">0</text>
            </svg>
            <p class="text-xs text-gray-400 mt-2 text-center">
              Seasonal context accumulates over time. Gray placeholders mark weeks with no Solver run yet.
            </p>
          </div>
          <div v-else class="h-36 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Annual chart appears after the first weekly snapshot is captured.
          </div>
        </UCard>

        <!-- 30-Day Availability Trend -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">30-Day Availability Trend</h3>
              <div class="flex items-center gap-3 text-xs">
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-0.5 bg-blue-500 rounded"></span> Available <span class="text-gray-400">(L)</span></span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-0.5 bg-yellow-400 rounded"></span> Applied <span class="text-gray-400">(R)</span></span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-0.5 bg-green-500 rounded"></span> Leased <span class="text-gray-400">(R)</span></span>
              </div>
            </div>
          </template>
          <div v-if="trend30Config">
            <svg :viewBox="`0 0 ${trend30Config.width} ${trend30Config.height}`" class="w-full h-44 overflow-visible">
              <!-- Grid lines (left / Available scale) -->
              <g v-for="(l, i) in trend30Config.yLabelsLeft" :key="`yl${i}`">
                <line :x1="trend30Config.leftPad" :y1="l.y" :x2="trend30Config.width - trend30Config.rightPad" :y2="l.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
                <!-- Left axis: Available (blue) -->
                <text :x="trend30Config.leftPad - 6" :y="l.y + 4" text-anchor="end" font-size="10" fill="#93c5fd">{{ l.value }}</text>
              </g>
              <!-- Right axis: Applied + Leased (gray) -->
              <g v-for="(l, i) in trend30Config.yLabelsRight" :key="`yr${i}`">
                <text :x="trend30Config.width - trend30Config.rightPad + 6" :y="l.y + 4" text-anchor="start" font-size="10" fill="#9ca3af">{{ l.value }}</text>
              </g>
              <!-- Axis labels -->
              <text :x="trend30Config.leftPad - 6" :y="trend30Config.padding - 8" text-anchor="end" font-size="9" fill="#93c5fd" font-weight="600">Avail</text>
              <text :x="trend30Config.width - trend30Config.rightPad + 6" :y="trend30Config.padding - 8" text-anchor="start" font-size="9" fill="#9ca3af" font-weight="600">App/Lsd</text>
              <!-- Baseline -->
              <line :x1="trend30Config.leftPad" :y1="trend30Config.height - trend30Config.padding" :x2="trend30Config.width - trend30Config.rightPad" :y2="trend30Config.height - trend30Config.padding" stroke="#9ca3af" stroke-width="1" />
              <!-- Series -->
              <path :d="trend30Config.availablePath" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <path :d="trend30Config.appliedPath"   fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <path :d="trend30Config.leasedPath"    fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <!-- X-axis date labels -->
              <g v-for="(p, i) in trend30Config.points" :key="`x${i}`">
                <text v-if="i === 0 || i % 7 === 0 || i === trend30Config.points.length - 1" :x="p.x" :y="trend30Config.height - 5" text-anchor="middle" font-size="9" fill="#9ca3af">{{ p.label }}</text>
              </g>
            </svg>
          </div>
          <div v-else class="h-44 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            No trend data yet — run the Solver daily to build your trend line.
          </div>
        </UCard>

        <!-- Vacancy Rate Trend -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">Vacancy Rate Trend (30 Days)</h3>
              <span class="text-xs text-gray-400">5% target reference line</span>
            </div>
          </template>
          <div v-if="vacancyTrendConfig">
            <svg :viewBox="`0 0 ${vacancyTrendConfig.width} ${vacancyTrendConfig.height}`" class="w-full h-44 overflow-visible">
              <g v-for="(l, i) in vacancyTrendConfig.yAxisLabels" :key="`y${i}`">
                <line :x1="vacancyTrendConfig.leftPad" :y1="l.y" :x2="vacancyTrendConfig.width - vacancyTrendConfig.padding" :y2="l.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
                <text :x="vacancyTrendConfig.leftPad - 6" :y="l.y + 4" text-anchor="end" font-size="10" fill="#9ca3af">{{ l.value.toFixed(1) }}%</text>
              </g>
              <line
                v-if="vacancyTrendConfig.max > 0"
                :x1="vacancyTrendConfig.leftPad"
                :y1="vacancyTrendConfig.height - vacancyTrendConfig.padding - (5 - vacancyTrendConfig.min) / (vacancyTrendConfig.max - vacancyTrendConfig.min || 1) * (vacancyTrendConfig.height - vacancyTrendConfig.padding * 2)"
                :x2="vacancyTrendConfig.width - vacancyTrendConfig.padding"
                :y2="vacancyTrendConfig.height - vacancyTrendConfig.padding - (5 - vacancyTrendConfig.min) / (vacancyTrendConfig.max - vacancyTrendConfig.min || 1) * (vacancyTrendConfig.height - vacancyTrendConfig.padding * 2)"
                stroke="#ef4444" stroke-width="1" stroke-dasharray="6,3" opacity="0.5"
              />
              <line :x1="vacancyTrendConfig.leftPad" :y1="vacancyTrendConfig.height - vacancyTrendConfig.padding" :x2="vacancyTrendConfig.width - vacancyTrendConfig.padding" :y2="vacancyTrendConfig.height - vacancyTrendConfig.padding" stroke="#9ca3af" stroke-width="1" />
              <path :d="vacancyTrendConfig.d" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="(p, i) in vacancyTrendConfig.points" :key="`pt${i}`">
                <circle :cx="p.x" :cy="p.y" r="4" class="fill-primary-500 dark:fill-primary-400">
                  <title>{{ p.label }}: {{ p.value.toFixed(1) }}%</title>
                </circle>
                <text v-if="i === 0 || i % 7 === 0 || i === vacancyTrendConfig.points.length - 1" :x="p.x" :y="vacancyTrendConfig.height - 5" text-anchor="middle" font-size="9" fill="#9ca3af">{{ p.label }}</text>
              </g>
            </svg>
          </div>
          <div v-else class="h-44 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Vacancy trend builds over time with daily Solver runs.
          </div>
        </UCard>

        <!-- Rent: Market vs Contracted -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">Market vs Contracted Rent (30 Days)</h3>
              <div class="flex items-center gap-3 text-xs">
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-0.5 bg-indigo-500 rounded"></span> Market</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-0.5 bg-emerald-500 rounded"></span> Contracted</span>
              </div>
            </div>
          </template>
          <div v-if="rentChartConfig">
            <svg :viewBox="`0 0 ${rentChartConfig.width} ${rentChartConfig.height}`" class="w-full h-44 overflow-visible">
              <g v-for="(l, i) in rentChartConfig.yLabels" :key="`y${i}`">
                <line :x1="rentChartConfig.leftPad" :y1="l.y" :x2="rentChartConfig.width - rentChartConfig.padding" :y2="l.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
                <text :x="rentChartConfig.leftPad - 6" :y="l.y + 4" text-anchor="end" font-size="9" fill="#9ca3af">${{ l.value }}</text>
              </g>
              <path :d="rentChartConfig.areaPath" fill="#6366f1" fill-opacity="0.08" />
              <line :x1="rentChartConfig.leftPad" :y1="rentChartConfig.height - rentChartConfig.padding" :x2="rentChartConfig.width - rentChartConfig.padding" :y2="rentChartConfig.height - rentChartConfig.padding" stroke="#9ca3af" stroke-width="1" />
              <path :d="rentChartConfig.marketPath"     fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <path :d="rentChartConfig.contractedPath" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="(p, i) in rentChartConfig.points" :key="`x${i}`">
                <text v-if="i === 0 || i % 7 === 0 || i === rentChartConfig.points.length - 1" :x="p.x" :y="rentChartConfig.height - 5" text-anchor="middle" font-size="9" fill="#9ca3af">{{ p.label }}</text>
              </g>
            </svg>
          </div>
          <div v-else class="h-44 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Rent trend builds once contracted rent data is captured in daily snapshots.
          </div>
        </UCard>

        <!-- Leasing Funnel -->
        <UCard>
          <template #header>
            <h3 class="font-bold">Leasing Funnel (Current Snapshot)</h3>
          </template>
          <div v-if="funnelData" class="space-y-3">
            <div v-for="(stage, i) in funnelData" :key="stage.label" class="flex items-center gap-4">
              <div class="w-24 text-right">
                <span class="text-sm font-semibold" :class="stage.text">{{ stage.label }}</span>
              </div>
              <div class="flex-1">
                <div class="h-8 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                  <div
                    :class="stage.color"
                    class="h-full transition-all duration-500 flex items-center justify-end pr-3"
                    :style="{ width: `${Math.max(stage.pct, 4)}%` }"
                  >
                    <span class="text-white font-bold text-sm">{{ stage.count }}</span>
                  </div>
                </div>
              </div>
              <div class="w-28 text-xs text-gray-400">
                <template v-if="i > 0 && stage.conv != null">{{ stage.conv }}% conversion</template>
                <template v-else-if="i === 0">100% baseline</template>
              </div>
            </div>
          </div>
          <div v-else class="h-20 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            No funnel data available yet.
          </div>
        </UCard>

        <!-- Avg Days on Market -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">Avg Days on Market (30 Days)</h3>
              <span class="text-xs text-gray-400">Red dashed = 14-day benchmark</span>
            </div>
          </template>
          <div v-if="domChartConfig">
            <svg :viewBox="`0 0 ${domChartConfig.width} ${domChartConfig.height}`" class="w-full h-44 overflow-visible">
              <g v-for="(l, i) in domChartConfig.yAxisLabels" :key="`y${i}`">
                <line :x1="domChartConfig.leftPad" :y1="l.y" :x2="domChartConfig.width - domChartConfig.padding" :y2="l.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
                <text :x="domChartConfig.leftPad - 6" :y="l.y + 4" text-anchor="end" font-size="10" fill="#9ca3af">{{ Math.round(l.value) }}d</text>
              </g>
              <line
                v-if="domBenchmarkY != null"
                :x1="domChartConfig.leftPad" :y1="domBenchmarkY"
                :x2="domChartConfig.width - domChartConfig.padding" :y2="domBenchmarkY"
                stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.6"
              />
              <line :x1="domChartConfig.leftPad" :y1="domChartConfig.height - domChartConfig.padding" :x2="domChartConfig.width - domChartConfig.padding" :y2="domChartConfig.height - domChartConfig.padding" stroke="#9ca3af" stroke-width="1" />
              <path :d="domChartConfig.d" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="(p, i) in domChartConfig.points" :key="`pt${i}`">
                <circle :cx="p.x" :cy="p.y" r="4" :class="p.value > 30 ? 'fill-red-500' : 'fill-primary-500 dark:fill-primary-400'">
                  <title>{{ p.label }}: {{ p.value }}d</title>
                </circle>
                <text v-if="i === 0 || i % 7 === 0 || i === domChartConfig.points.length - 1" :x="p.x" :y="domChartConfig.height - 5" text-anchor="middle" font-size="9" fill="#9ca3af">{{ p.label }}</text>
              </g>
            </svg>
          </div>
          <div v-else class="h-44 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Days-on-market data requires leased units with both available_date and move_in_date.
          </div>
        </UCard>

        <!-- Upfront Concession Trend -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">Upfront Concession Trend (30 Days)</h3>
              <div class="flex items-center gap-3 text-xs">
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-0.5 bg-purple-500 rounded"></span> Free Rent Days</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-0.5 bg-orange-400 rounded"></span> Upfront Amount</span>
              </div>
            </div>
          </template>
          <div v-if="concessionChartConfig">
            <svg :viewBox="`0 0 ${concessionChartConfig.width} ${concessionChartConfig.height}`" class="w-full h-44 overflow-visible">
              <line :x1="concessionChartConfig.leftPad" :y1="concessionChartConfig.height - concessionChartConfig.padding" :x2="concessionChartConfig.width - concessionChartConfig.padding" :y2="concessionChartConfig.height - concessionChartConfig.padding" stroke="#9ca3af" stroke-width="1" />
              <path :d="concessionChartConfig.daysPath"   fill="none" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <path :d="concessionChartConfig.amountPath" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6,3" />
              <g v-for="(p, i) in concessionChartConfig.points" :key="`x${i}`">
                <text v-if="i === 0 || i % 7 === 0 || i === concessionChartConfig.points.length - 1" :x="p.x" :y="concessionChartConfig.height - 5" text-anchor="middle" font-size="9" fill="#9ca3af">{{ p.label }}</text>
              </g>
            </svg>
          </div>
          <div v-else class="h-44 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            Concession data builds as units with concessions are captured in snapshots.
          </div>
        </UCard>

        <!-- Price Change Frequency -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">Price Change Frequency (Last 90 Days)</h3>
              <span class="text-xs text-gray-400">Bars = adjustments per week</span>
            </div>
          </template>
          <div v-if="priceBarConfig && priceBarConfig.data.length">
            <svg :viewBox="`0 0 ${priceBarConfig.width} ${priceBarConfig.height}`" class="w-full h-32 overflow-visible">
              <line :x1="priceBarConfig.leftPad" :y1="priceBarConfig.height - priceBarConfig.padding" :x2="priceBarConfig.width - priceBarConfig.padding" :y2="priceBarConfig.height - priceBarConfig.padding" stroke="#9ca3af" stroke-width="1" />
              <g v-for="(bar, i) in priceBarConfig.data" :key="`bar${i}`">
                <rect
                  :x="bar.x - priceBarConfig.barW / 2" :y="bar.y"
                  :width="priceBarConfig.barW" :height="bar.h"
                  class="fill-primary-500 dark:fill-primary-400 opacity-80" rx="2"
                >
                  <title>Week of {{ bar.label }}: {{ bar.count }} price changes</title>
                </rect>
                <text
                  v-if="i % Math.ceil(priceBarConfig.data.length / 8) === 0 || i === priceBarConfig.data.length - 1"
                  :x="bar.x" :y="priceBarConfig.height - 5"
                  text-anchor="middle" font-size="9" fill="#9ca3af"
                >{{ bar.label }}</text>
              </g>
              <text :x="priceBarConfig.leftPad - 4" :y="priceBarConfig.padding" text-anchor="end" font-size="10" fill="#9ca3af">{{ priceBarConfig.maxVal }}</text>
              <text :x="priceBarConfig.leftPad - 4" :y="priceBarConfig.height - priceBarConfig.padding" text-anchor="end" font-size="10" fill="#9ca3af">0</text>
            </svg>
          </div>
          <div v-else class="h-32 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            No price change events recorded in the last 90 days.
          </div>
        </UCard>


    </div><!-- end two-column grid -->

    <!-- Error State -->
    <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="error" variant="soft" title="Data Error" :description="error" />

  </div>

  <!-- Context Helper -->
  <LazyContextHelper
    title="Availability Analysis"
    description="Portfolio health metrics & leasing trends"
  >
    <div class="space-y-4 text-sm leading-relaxed">

      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Portfolio Health Matrix</h3>
        <p>Shows the latest snapshot for every property side-by-side. Each metric is color-coded:</p>
        <ul class="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Vacancy Rate:</strong> Green &lt;5%, Yellow 5–10%, Red &gt;10%</li>
          <li><strong>Days on Market:</strong> Green &lt;14 days, Yellow 14–30 days, Red &gt;30 days</li>
          <li><strong>Rent Spread:</strong> Difference between market and offered rent as a %. Green &lt;3%, Yellow 3–8%, Red &gt;8%</li>
          <li><strong>Overall Score:</strong> Red if any metric is red; Yellow if any is yellow; Green if all are green.</li>
        </ul>
      </section>

      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Hover Tooltips</h3>
        <p>
          Every data point on every chart shows a tooltip when you hover over it. The tooltip displays the exact date and value for that point — for example:
        </p>
        <ul class="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Line charts:</strong> Hover a dot to see the date and exact value (e.g. "Feb 20: 4.2%", "Feb 20: 8 units")</li>
          <li><strong>Bar charts:</strong> Hover a bar to see the week and count (e.g. "Week of Feb 17: 12 price changes")</li>
          <li><strong>Annual Weekly:</strong> Hover a dot to see the week start date and average available units for that week</li>
        </ul>
        <p class="mt-2 text-gray-400">Tooltips are native browser tooltips — they appear after a brief hover pause.</p>
      </section>

      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Annual Weekly Chart</h3>
        <p>
          A 52-week rolling view of average available units per week. Gray dots mark weeks where no Solver run occurred — hover colored dots to see the exact week and unit count.
          Use this for <strong>seasonal planning</strong> — identifying which months historically see higher vacancy.
        </p>
      </section>

      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">30-Day Trend Charts</h3>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Availability Trend:</strong> Daily counts of Available, Applied, and Leased units. A healthy pipeline shows Applied and Leased rising as Available falls.</li>
          <li><strong>Vacancy Rate Trend:</strong> Daily vacancy percentage with a 5% target reference line. Hover dots to see the exact date and rate.</li>
          <li><strong>Market vs Contracted Rent:</strong> Market = Yardi's asking rent. Contracted = average actual lease amount from signed leases. The shaded area between lines shows the effective discount — a widening gap indicates growing concession pressure.</li>
          <li><strong>Days on Market:</strong> Average days a unit sits available before leasing. Red dots exceed the 14-day benchmark — hover to see the exact value.</li>
          <li><strong>Concession Analysis:</strong> Tracks free-rent days and upfront concession amounts over time.</li>
        </ul>
      </section>

      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Leasing Funnel</h3>
        <p>
          Shows the current pipeline as a conversion funnel: Available → Applied → Leased.
          Conversion rates reveal where prospects are dropping off.
        </p>
      </section>

      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Price Changes & Floor Plans</h3>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Price Change Frequency:</strong> Bar chart of Solver-recorded price adjustments per week over the last 90 days. CV units show daily micro-changes from the AIRM revenue management tool — this is normal.</li>
          <li><strong>Floor Plan Breakdown:</strong> Live (not historical) count of Available/Applied/Leased units grouped by floor plan, with average market rent.</li>
        </ul>
      </section>

      <div class="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
        <strong>Data source:</strong> All charts are built from daily Solver snapshots. Charts improve in accuracy and depth as more daily runs accumulate.
      </div>

    </div>
  </LazyContextHelper>

</template>
