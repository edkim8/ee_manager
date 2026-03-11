<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta, navigateTo, usePropertyState } from '#imports'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()
const snapshotDate = route.params.date as string

// Fetch available dates for navigation — scoped to active property
const { data: availableDates } = await useAsyncData('available-dates-nav', async () => {
  const query = supabase
    .from('delinquencies')
    .select('created_at')
    .order('created_at', { ascending: false })

  if (activeProperty.value) {
    query.eq('property_code', activeProperty.value)
  }

  const { data, error } = await query
  if (error) return []

  const uniqueDates = [...new Set(
    data.map(d => new Date(d.created_at).toISOString().split('T')[0])
  )].sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)

  return uniqueDates
})

// Find previous and next dates
const currentIndex = computed(() => {
  return availableDates.value?.indexOf(snapshotDate) ?? -1
})

const prevDate = computed(() => {
  if (!availableDates.value || currentIndex.value === -1) return null
  return availableDates.value[currentIndex.value + 1] || null // Older date
})

const nextDate = computed(() => {
  if (!availableDates.value || currentIndex.value === -1) return null
  return availableDates.value[currentIndex.value - 1] || null // Newer date
})

const navigateToDate = (date: string | null) => {
  if (date) {
    navigateTo(`/office/delinquencies/${date}`)
  }
}

import { computeSnapshotSummary } from '../../../utils/delinquencyUtils'

// Parse date to validate and format
const parsedDate = computed(() => {
  const date = new Date(snapshotDate)
  return isNaN(date.getTime()) ? null : date
})

const isValidDate = computed(() => parsedDate.value !== null)

// Fetch delinquencies for this specific snapshot date — scoped to active property
const { data: snapshot, status, error } = await useAsyncData(`delinquency-snapshot-${snapshotDate}`, async () => {
  if (!isValidDate.value) return null

  // Use noon-anchored parsing to avoid UTC midnight → wrong day in local timezone
  const startOfDay = new Date(`${snapshotDate}T00:00:00`)
  const endOfDay   = new Date(`${snapshotDate}T23:59:59.999`)

  const query = supabase
    .from('delinquencies')
    .select(`
      *,
      tenancies (
        id,
        status,
        move_in_date,
        move_out_date
      ),
      units (
        id,
        unit_name,
        floor_plan_id,
        buildings (
          id,
          name
        )
      )
    `)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('total_unpaid', { ascending: false })

  if (activeProperty.value) {
    query.eq('property_code', activeProperty.value)
  }

  const { data, error } = await query
  if (error) throw error

  return {
    delinquencies: data,
    summary: computeSnapshotSummary(data),
  }
})

const goBack = () => {
  router.back()
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const formatDate = (dateStr: string | Date) => {
  // For bare YYYY-MM-DD strings, append T12:00:00 to parse in local time rather than
  // UTC midnight, which would shift the displayed date one day back in US time zones.
  const d = typeof dateStr === 'string' ? new Date(`${dateStr}T12:00:00`) : dateStr
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getSafeWidth = (part: number, total: number) => {
  if (!total || total <= 0) return '0%'
  return `${Math.max(0, (part / total) * 100)}%`
}

// Table columns for delinquency details
const delinquencyColumns = [
  { key: 'unit_name', label: 'Unit', sortable: true },
  { key: 'resident', label: 'Resident', sortable: true },
  { key: 'total_unpaid', label: 'Total Unpaid', sortable: true, align: 'right' },
  { key: 'days_0_30', label: '0-30', sortable: true, align: 'right' },
  { key: 'days_31_60', label: '31-60', sortable: true, align: 'right' },
  { key: 'days_61_90', label: '61-90', sortable: true, align: 'right' },
  { key: 'days_90_plus', label: '90+', sortable: true, align: 'right' },
  { key: 'balance', label: 'Balance', sortable: true, align: 'right' }
]

const handleRowClick = (row: any) => {
  // Navigate to resident detail if available
  if (row?.tenancies?.id) {
    // Find resident by tenancy
    navigateTo(`/office/residents?tenancy=${row.tenancies.id}`)
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/office/delinquencies" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Delinquencies
          </NuxtLink>
        </li>
        <li v-if="isValidDate">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">{{ formatDate(snapshotDate) }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Loading State -->
    <div v-if="status === 'pending'" class="p-12 space-y-8">
      <USkeleton class="h-12 w-1/3" />
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
      </div>
      <USkeleton class="h-64" />
    </div>

    <!-- Error State -->
    <div v-else-if="error || !isValidDate" class="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Invalid Snapshot Date</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error?.message || 'The date provided is not valid.' }}</p>
      <UButton color="error" @click="goBack">Back to Dashboard</UButton>
    </div>

    <!-- Content -->
    <div v-else-if="snapshot" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to Dashboard"
          color="neutral"
          variant="ghost"
          @click="goBack"
          class="-ml-2.5 dark:text-gray-400 dark:hover:text-white"
        />
      </div>

      <!-- Header with Date Navigation -->
      <div class="border-b border-gray-200 dark:border-gray-800 pb-8">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-calendar" class="w-8 h-8 text-primary-500" />
            <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Snapshot: {{ formatDate(snapshotDate) }}
            </h1>
          </div>

          <!-- Date Navigation Controls -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <UButton
              icon="i-heroicons-chevron-left"
              color="gray"
              variant="outline"
              :disabled="!prevDate"
              @click="navigateToDate(prevDate)"
              title="Previous day"
            >
              Older
            </UButton>

            <UButton
              icon="i-heroicons-chevron-right"
              trailing
              color="gray"
              variant="outline"
              :disabled="!nextDate"
              @click="navigateToDate(nextDate)"
              title="Next day"
            >
              Newer
            </UButton>

            <div class="border-l border-gray-300 dark:border-gray-700 h-8 mx-2"></div>

            <UButton
              to="/office/delinquencies"
              icon="i-heroicons-calendar-days"
              color="primary"
              variant="outline"
            >
              All Dates
            </UButton>
          </div>
        </div>

        <p class="text-lg text-gray-600 dark:text-gray-400">
          Daily delinquency report showing {{ snapshot.summary.count }} {{ snapshot.summary.count === 1 ? 'resident' : 'residents' }} with outstanding balances.
        </p>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard class="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
          <div class="text-sm text-red-700 dark:text-red-400 font-medium">Total Unpaid</div>
          <div class="text-3xl font-bold text-red-900 dark:text-red-300">{{ formatCurrency(snapshot.summary.totalUnpaid) }}</div>
          <div class="text-xs text-red-600 dark:text-red-500 mt-1">{{ snapshot.summary.count }} Delinquencies</div>
        </UCard>

        <UCard>
          <div class="text-sm text-gray-500 font-medium">Total Balance</div>
          <div class="text-3xl font-bold">{{ formatCurrency(snapshot.summary.totalBalance) }}</div>
          <div class="text-xs text-gray-400 mt-1">Includes credits</div>
        </UCard>

        <UCard>
          <div class="text-sm text-gray-500 font-medium">61-90 Days</div>
          <div class="text-3xl font-bold text-orange-600">{{ formatCurrency(snapshot.summary.days61_90) }}</div>
          <div class="text-xs text-orange-400 mt-1">High risk</div>
        </UCard>

        <UCard>
          <div class="text-sm text-gray-500 font-medium">90+ Days</div>
          <div class="text-3xl font-bold text-red-600">{{ formatCurrency(snapshot.summary.days90Plus) }}</div>
          <div class="text-xs text-red-400 mt-1">Critical</div>
        </UCard>
      </div>

      <!-- Aging Breakdown Progress Bar -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Aging Distribution</h3>
        </template>
        <div class="flex items-center h-8 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div :style="{ width: getSafeWidth(snapshot.summary.days0_30, snapshot.summary.totalUnpaid) }" class="bg-blue-500 h-full transition-all duration-500" title="0-30 Days"></div>
          <div :style="{ width: getSafeWidth(snapshot.summary.days31_60, snapshot.summary.totalUnpaid) }" class="bg-yellow-400 h-full transition-all duration-500" title="31-60 Days"></div>
          <div :style="{ width: getSafeWidth(snapshot.summary.days61_90, snapshot.summary.totalUnpaid) }" class="bg-orange-500 h-full transition-all duration-500" title="61-90 Days"></div>
          <div :style="{ width: getSafeWidth(snapshot.summary.days90Plus, snapshot.summary.totalUnpaid) }" class="bg-red-500 h-full transition-all duration-500" title="90+ Days"></div>
        </div>
        <div class="grid grid-cols-4 gap-4 mt-4 text-center">
          <div>
            <div class="text-[10px] text-gray-500 uppercase font-bold">0-30 Days</div>
            <div class="text-sm font-semibold">{{ formatCurrency(snapshot.summary.days0_30) }}</div>
          </div>
          <div>
            <div class="text-[10px] text-gray-500 uppercase font-bold">31-60 Days</div>
            <div class="text-sm font-semibold">{{ formatCurrency(snapshot.summary.days31_60) }}</div>
          </div>
          <div>
            <div class="text-[10px] text-gray-500 uppercase font-bold">61-90 Days</div>
            <div class="text-sm font-semibold text-orange-600">{{ formatCurrency(snapshot.summary.days61_90) }}</div>
          </div>
          <div>
            <div class="text-[10px] text-gray-500 uppercase font-bold">90+ Days</div>
            <div class="text-sm font-semibold text-red-600">{{ formatCurrency(snapshot.summary.days90Plus) }}</div>
          </div>
        </div>
      </UCard>

      <!-- Delinquency Details Table -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold">Detailed Breakdown</h3>
            <UBadge color="primary" variant="soft" size="lg" class="font-bold">
              {{ snapshot.delinquencies.length }} {{ snapshot.delinquencies.length === 1 ? 'Record' : 'Records' }}
            </UBadge>
          </div>
        </template>

        <GenericDataTable
          :data="snapshot.delinquencies"
          :columns="delinquencyColumns"
          row-key="id"
          striped
          enable-pagination
          :page-size="50"
          default-sort-field="total_unpaid"
          default-sort-direction="desc"
          enable-export
          :export-filename="`delinquencies-${snapshotDate}`"
        >
          <template #cell-unit_name="{ value }">
            <span class="font-mono font-semibold">{{ value }}</span>
          </template>

          <template #cell-resident="{ value }">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
              <span class="font-medium">{{ value }}</span>
            </div>
          </template>

          <template #cell-total_unpaid="{ value }">
            <CellsCurrencyCell :value="value" class="text-red-600 font-bold" />
          </template>

          <template #cell-days_0_30="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-blue-600" />
            <span v-else class="text-gray-400 text-xs">-</span>
          </template>

          <template #cell-days_31_60="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-yellow-600" />
            <span v-else class="text-gray-400 text-xs">-</span>
          </template>

          <template #cell-days_61_90="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-orange-600 font-semibold" />
            <span v-else class="text-gray-400 text-xs">-</span>
          </template>

          <template #cell-days_90_plus="{ value }">
            <CellsCurrencyCell v-if="value > 0" :value="value" class="text-red-700 font-bold" />
            <span v-else class="text-gray-400 text-xs">-</span>
          </template>

          <template #cell-balance="{ value }">
            <CellsCurrencyCell :value="value" class="font-mono text-sm" />
          </template>
        </GenericDataTable>
      </UCard>

      <!-- No Data State -->
      <UCard v-if="snapshot.delinquencies.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-check-circle" class="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">No Delinquencies Found</h3>
        <p class="text-gray-500">There were no delinquency records for this date.</p>
      </UCard>
    </div>
  </div>
</template>
