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

  const allVals = [...available, ...applied, ...leased]
  const max = Math.max(...allVals, 1) * 1.15
  const width = 600; const height = 150; const padding = 30; const leftPad = 40

  const xStep = (width - leftPad - padding) / Math.max(data.length - 1, 1)
  const toY = (v: number) => height - padding - (v / max) * (height - padding * 2)

  const buildPath = (vals: number[]) =>
    vals.reduce((acc, v, i) => acc + (i === 0 ? `M ${leftPad + i * xStep} ${toY(v)}` : ` L ${leftPad + i * xStep} ${toY(v)}`), '')

  const yLabels = Array.from({ length: 4 }, (_, i) => {
    const val = Math.round((max / 3) * i)
    return { value: val, y: toY(val) }
  })

  return {
    width, height, padding, leftPad, max, xStep,
    availablePath: buildPath(available),
    appliedPath:   buildPath(applied),
    leasedPath:    buildPath(leased),
    points:        data.map((_, i) => ({ x: leftPad + i * xStep, label: labels[i] })),
    yLabels
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

// ─── Rent Chart: Market vs Offered ───────────────────────────────────────────

const rentChartConfig = computed(() => {
  const data = dailyTrend.value.filter(d => d.avg_market_rent && d.avg_offered_rent)
  if (data.length < 2) return null

  const labels  = data.map(d => formatDate(d.snapshot_date))
  const market  = data.map(d => Number(d.avg_market_rent))
  const offered = data.map(d => Number(d.avg_offered_rent))
  const allVals = [...market, ...offered]
  const max = Math.max(...allVals) * 1.05
  const min = Math.min(...allVals) * 0.95
  const range = max - min || 1

  const width = 600; const height = 150; const padding = 30; const leftPad = 60
  const xStep = (width - leftPad - padding) / Math.max(data.length - 1, 1)
  const toY = (v: number) => height - padding - ((v - min) / range) * (height - padding * 2)

  const buildPath = (vals: number[]) =>
    vals.reduce((acc, v, i) => acc + (i === 0 ? `M ${leftPad + i * xStep} ${toY(v)}` : ` L ${leftPad + i * xStep} ${toY(v)}`), '')

  // Shade area between lines
  const areaPath = [
    ...market.map((v, i) => `${i === 0 ? 'M' : 'L'} ${leftPad + i * xStep} ${toY(v)}`),
    ...[...offered].reverse().map((v, i) => `L ${leftPad + (data.length - 1 - i) * xStep} ${toY(v)}`),
    'Z'
  ].join(' ')

  const yLabels = Array.from({ length: 4 }, (_, i) => {
    const val = min + (range / 3) * i
    return { value: Math.round(val), y: toY(val) }
  })

  return {
    width, height, padding, leftPad, xStep,
    marketPath: buildPath(market), offeredPath: buildPath(offered), areaPath,
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
        <div class="mt-3 flex gap-4 text-xs text-gray-400 px-3">
          <span>Vacancy: 🟢&lt;5% · 🟡5–10% · 🔴&gt;10%</span>
          <span>Days on Market: 🟢&lt;14 · 🟡14–30 · 🔴&gt;30</span>
          <span>Rent Spread: 🟢&lt;3% · 🟡3–8% · 🔴&gt;8%</span>
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

      <div v-else-if="!loading" class="text-center py-8 text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
        <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p class="font-medium">No snapshot data for {{ activeProperty || 'this property' }}</p>
        <p class="text-xs mt-1">Run the Solver Engine to capture the first snapshot.</p>
      </div>
    </div>

    <!-- ─── Section 3: 30-Day Availability Trend ──────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">30-Day Availability Trend</h3>
          <div class="flex items-center gap-4 text-xs">
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-blue-500"></span> Available</span>
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-yellow-400"></span> Applied</span>
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-green-500"></span> Leased</span>
          </div>
        </div>
      </template>

      <div v-if="trend30Config">
        <svg :viewBox="`0 0 ${trend30Config.width} ${trend30Config.height}`" class="w-full h-44 overflow-visible">
          <!-- Y-axis labels -->
          <g v-for="(l, i) in trend30Config.yLabels" :key="`y${i}`">
            <line :x1="trend30Config.leftPad" :y1="l.y" :x2="trend30Config.width - trend30Config.padding" :y2="l.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
            <text :x="trend30Config.leftPad - 6" :y="l.y + 4" text-anchor="end" font-size="10" fill="#9ca3af">{{ l.value }}</text>
          </g>
          <!-- Baseline -->
          <line :x1="trend30Config.leftPad" :y1="trend30Config.height - trend30Config.padding" :x2="trend30Config.width - trend30Config.padding" :y2="trend30Config.height - trend30Config.padding" stroke="#9ca3af" stroke-width="1" />
          <!-- Lines -->
          <path :d="trend30Config.availablePath" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path :d="trend30Config.appliedPath"   fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path :d="trend30Config.leasedPath"    fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <!-- X-axis labels (every 7th day) -->
          <g v-for="(p, i) in trend30Config.points" :key="`x${i}`">
            <text v-if="i === 0 || i % 7 === 0 || i === trend30Config.points.length - 1" :x="p.x" :y="trend30Config.height - 5" text-anchor="middle" font-size="9" fill="#9ca3af">{{ p.label }}</text>
          </g>
        </svg>
      </div>
      <div v-else class="h-44 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        No trend data yet — run the Solver daily to build your trend line.
      </div>
    </UCard>

    <!-- ─── Section 4: Vacancy Rate Trend ────────────────────────────────── -->
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
          <!-- 5% reference line -->
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

    <!-- ─── Section 5: Market vs Offered Rent ────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Rent: Market vs Offered (30 Days)</h3>
          <div class="flex items-center gap-4 text-xs">
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-indigo-500"></span> Market</span>
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-emerald-500"></span> Offered</span>
          </div>
        </div>
      </template>

      <div v-if="rentChartConfig">
        <svg :viewBox="`0 0 ${rentChartConfig.width} ${rentChartConfig.height}`" class="w-full h-44 overflow-visible">
          <g v-for="(l, i) in rentChartConfig.yLabels" :key="`y${i}`">
            <line :x1="rentChartConfig.leftPad" :y1="l.y" :x2="rentChartConfig.width - rentChartConfig.padding" :y2="l.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
            <text :x="rentChartConfig.leftPad - 6" :y="l.y + 4" text-anchor="end" font-size="9" fill="#9ca3af">${{ l.value }}</text>
          </g>
          <!-- Shaded spread area -->
          <path :d="rentChartConfig.areaPath" fill="#6366f1" fill-opacity="0.08" />
          <line :x1="rentChartConfig.leftPad" :y1="rentChartConfig.height - rentChartConfig.padding" :x2="rentChartConfig.width - rentChartConfig.padding" :y2="rentChartConfig.height - rentChartConfig.padding" stroke="#9ca3af" stroke-width="1" />
          <path :d="rentChartConfig.marketPath"  fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path :d="rentChartConfig.offeredPath" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <g v-for="(p, i) in rentChartConfig.points" :key="`x${i}`">
            <text v-if="i === 0 || i % 7 === 0 || i === rentChartConfig.points.length - 1" :x="p.x" :y="rentChartConfig.height - 5" text-anchor="middle" font-size="9" fill="#9ca3af">{{ p.label }}</text>
          </g>
        </svg>
      </div>
      <div v-else class="h-44 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        Rent trend builds once rent data is captured in daily snapshots.
      </div>
    </UCard>

    <!-- ─── Section 6: Leasing Funnel ────────────────────────────────────── -->
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
            <div class="h-8 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative">
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
            <template v-if="i > 0 && stage.conv != null">
              {{ stage.conv }}% conversion
            </template>
            <template v-else-if="i === 0">
              100% baseline
            </template>
          </div>
        </div>
      </div>
      <div v-else class="h-20 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        No funnel data available yet.
      </div>
    </UCard>

    <!-- ─── Section 7: Days on Market Trend ──────────────────────────────── -->
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
          <!-- 14-day benchmark -->
          <line
            v-if="domBenchmarkY != null"
            :x1="domChartConfig.leftPad"
            :y1="domBenchmarkY"
            :x2="domChartConfig.width - domChartConfig.padding"
            :y2="domBenchmarkY"
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

    <!-- ─── Section 8: Concession Analysis ───────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Concession Analysis (30 Days)</h3>
          <div class="flex items-center gap-4 text-xs">
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-purple-500"></span> Free Rent Days</span>
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-orange-400"></span> Upfront Amount</span>
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

    <!-- ─── Section 9: Price Change Frequency ────────────────────────────── -->
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
              :x="bar.x - priceBarConfig.barW / 2"
              :y="bar.y"
              :width="priceBarConfig.barW"
              :height="bar.h"
              class="fill-primary-500 dark:fill-primary-400 opacity-80"
              rx="2"
            >
              <title>Week of {{ bar.label }}: {{ bar.count }} price changes</title>
            </rect>
            <text
              v-if="i % Math.ceil(priceBarConfig.data.length / 8) === 0 || i === priceBarConfig.data.length - 1"
              :x="bar.x"
              :y="priceBarConfig.height - 5"
              text-anchor="middle"
              font-size="9"
              fill="#9ca3af"
            >{{ bar.label }}</text>
          </g>
          <!-- Y-axis -->
          <text :x="priceBarConfig.leftPad - 4" :y="priceBarConfig.padding" text-anchor="end" font-size="10" fill="#9ca3af">{{ priceBarConfig.maxVal }}</text>
          <text :x="priceBarConfig.leftPad - 4" :y="priceBarConfig.height - priceBarConfig.padding" text-anchor="end" font-size="10" fill="#9ca3af">0</text>
        </svg>
      </div>
      <div v-else class="h-32 flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        No price change events recorded in the last 90 days.
      </div>
    </UCard>

    <!-- ─── Section 10: Floor Plan Breakdown ─────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Floor Plan Breakdown</h3>
          <span class="text-xs text-gray-400">Live — not historical</span>
        </div>
      </template>

      <div v-if="floorPlanBreakdown.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Floor Plan</th>
              <th class="text-center py-2 px-3 font-semibold text-blue-600 dark:text-blue-400">Available</th>
              <th class="text-center py-2 px-3 font-semibold text-yellow-600 dark:text-yellow-400">Applied</th>
              <th class="text-center py-2 px-3 font-semibold text-green-600 dark:text-green-400">Leased</th>
              <th class="text-right py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Avg Market Rent</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="fp in floorPlanBreakdown"
              :key="fp.floor_plan_id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="py-2 px-3 font-medium">{{ fp.floor_plan_name }}</td>
              <td class="py-2 px-3 text-center">
                <UBadge v-if="fp.available > 0" color="primary" variant="soft">{{ fp.available }}</UBadge>
                <span v-else class="text-gray-300 dark:text-gray-600">—</span>
              </td>
              <td class="py-2 px-3 text-center">
                <span v-if="fp.applied > 0" class="font-semibold text-yellow-600 dark:text-yellow-400">{{ fp.applied }}</span>
                <span v-else class="text-gray-300 dark:text-gray-600">—</span>
              </td>
              <td class="py-2 px-3 text-center">
                <span v-if="fp.leased > 0" class="font-semibold text-green-600 dark:text-green-400">{{ fp.leased }}</span>
                <span v-else class="text-gray-300 dark:text-gray-600">—</span>
              </td>
              <td class="py-2 px-3 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                {{ formatCurrency(fp.avg_market_rent) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center py-8 text-gray-400 italic">
        No floor plan data available for {{ activeProperty || 'this property' }}.
      </div>
    </UCard>

    <!-- ─── Section 11: Weekly Annual Chart ──────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Annual Weekly Available Units</h3>
          <span class="text-xs text-gray-400">52-week view · dots = data · gray = no data</span>
        </div>
      </template>

      <div v-if="weeklyAnnualConfig">
        <svg :viewBox="`0 0 ${weeklyAnnualConfig.width} ${weeklyAnnualConfig.height}`" class="w-full h-36 overflow-visible">
          <!-- X baseline -->
          <line :x1="weeklyAnnualConfig.leftPad" :y1="weeklyAnnualConfig.height - weeklyAnnualConfig.padding" :x2="weeklyAnnualConfig.width - weeklyAnnualConfig.padding" :y2="weeklyAnnualConfig.height - weeklyAnnualConfig.padding" stroke="#9ca3af" stroke-width="1" />
          <!-- Gray ticks for all 52 weeks -->
          <g v-for="(w, i) in weeklyAnnualConfig.allWeeks" :key="`w${i}`">
            <line
              :x1="weeklyAnnualConfig.leftPad + i * weeklyAnnualConfig.xStep"
              :y1="weeklyAnnualConfig.height - weeklyAnnualConfig.padding"
              :x2="weeklyAnnualConfig.leftPad + i * weeklyAnnualConfig.xStep"
              :y2="weeklyAnnualConfig.height - weeklyAnnualConfig.padding + 4"
              stroke="#d1d5db"
              stroke-width="1"
            />
          </g>
          <!-- Quarter labels -->
          <g v-for="q in weeklyAnnualConfig.quarterMarks" :key="q.label">
            <text :x="q.x" :y="weeklyAnnualConfig.height - 2" text-anchor="middle" font-size="9" fill="#9ca3af">{{ q.label }}</text>
          </g>
          <!-- Gray dots for weeks with no data -->
          <g v-for="(w, i) in weeklyAnnualConfig.allWeeks" :key="`nd${i}`">
            <circle
              v-if="!weeklyAnnualConfig.withData[i]"
              :cx="weeklyAnnualConfig.leftPad + i * weeklyAnnualConfig.xStep"
              :cy="weeklyAnnualConfig.height - weeklyAnnualConfig.padding - 10"
              r="2.5"
              fill="#e5e7eb"
            />
          </g>
          <!-- Data line -->
          <path v-if="weeklyAnnualConfig.pathD" :d="weeklyAnnualConfig.pathD" fill="none" stroke="rgb(var(--color-primary-500))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Data dots -->
          <g v-for="p in weeklyAnnualConfig.knownPoints" :key="p.week">
            <circle :cx="p.x" :cy="p.y" r="4" class="fill-primary-500 dark:fill-primary-400">
              <title>Week of {{ formatDate(p.week) }}: avg {{ Math.round(p.y) }} units</title>
            </circle>
          </g>
          <!-- Y-axis max label -->
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

    <!-- Error State -->
    <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="error" variant="soft" title="Data Error" :description="error" />

  </div>
</template>
