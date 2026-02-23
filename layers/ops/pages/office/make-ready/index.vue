<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import type { TableColumn } from '../../../../table/types'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

// Fetch Property Name for header
const { data: activePropertyRecord } = await useAsyncData('active-property-header-makeready', async () => {
  if (!activeProperty.value) return null
  const { data } = await supabase
    .from('properties')
    .select('name')
    .eq('code', activeProperty.value)
    .single()
  return data
}, { watch: [activeProperty] })

// Fetch active MakeReady overdue flags
const { data: makeReadyRows, status, error, refresh } = await useAsyncData('make-ready-list', async () => {
  if (!activeProperty.value) return []
  const { data, error } = await supabase
    .from('view_table_make_ready')
    .select('*')
    .eq('property_code', activeProperty.value)
    .eq('is_active', true)
    .order('days_overdue', { ascending: false })
  if (error) throw error
  return data || []
}, { watch: [activeProperty] })

// Summary counts
const totalOverdue  = computed(() => makeReadyRows.value?.length ?? 0)
const errorCount    = computed(() => makeReadyRows.value?.filter((r: any) => r.severity === 'error').length ?? 0)
const warningCount  = computed(() => makeReadyRows.value?.filter((r: any) => r.severity === 'warning').length ?? 0)

// Search
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!makeReadyRows.value) return []
  if (!searchQuery.value) return makeReadyRows.value
  const q = searchQuery.value.toLowerCase()
  return makeReadyRows.value.filter((r: any) =>
    r.unit_name?.toLowerCase().includes(q) ||
    r.building_name?.toLowerCase().includes(q)
  )
})

const columns: TableColumn[] = [
  { key: 'unit_name',     label: 'Unit',           sortable: true },
  { key: 'building_name', label: 'Building',        sortable: true },
  { key: 'expected_date', label: 'Target Ready',    sortable: true },
  { key: 'days_overdue',  label: 'Days Overdue',    sortable: true, align: 'right' },
  { key: 'severity',      label: 'Severity',        sortable: true },
  { key: 'created_at',    label: 'First Detected',  sortable: true },
]

function severityColor(severity: string): string {
  return severity === 'error' ? 'error' : 'warning'
}

function severityLabel(severity: string): string {
  return severity === 'error' ? 'Critical' : 'Warning'
}

function formatDate(val: string | null): string {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
}
</script>

<template>
  <div class="p-6 space-y-6">

    <!-- Header -->
    <div class="flex items-baseline gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Make Ready</h1>
      <span v-if="activePropertyRecord?.name" class="text-lg text-gray-500 font-medium">
        &middot; {{ activePropertyRecord.name }}
      </span>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
        <div class="p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
          <UIcon name="i-heroicons-home-modern" class="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <div class="text-2xl font-black text-gray-900 dark:text-white">{{ totalOverdue }}</div>
          <div class="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Overdue</div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/50 p-4 flex items-center gap-4">
        <div class="p-3 rounded-xl bg-red-100 dark:bg-red-900/40">
          <UIcon name="i-heroicons-exclamation-circle" class="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <div class="text-2xl font-black text-red-600 dark:text-red-400">{{ errorCount }}</div>
          <div class="text-xs text-gray-500 font-medium uppercase tracking-wider">Critical (7+ days)</div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900/50 p-4 flex items-center gap-4">
        <div class="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <div class="text-2xl font-black text-amber-600 dark:text-amber-400">{{ warningCount }}</div>
          <div class="text-xs text-gray-500 font-medium uppercase tracking-wider">Warning (1–7 days)</div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <div class="flex items-center gap-2 font-bold mb-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        Error Fetching Make Ready Data
      </div>
      <p class="text-sm">{{ error.message }}</p>
    </div>

    <!-- Table -->
    <GenericDataTable
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="id"
      enable-pagination
      :page-size="25"
      default-sort-field="days_overdue"
      :default-sort-direction="'desc'"
      striped
      enable-export
      export-filename="make-ready"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search units..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'unit' : 'units' }}
          </span>
        </div>
      </template>

      <!-- Unit -->
      <template #cell-unit_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/units/${row.unit_id}`"
        />
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Building -->
      <template #cell-building_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/buildings/${row.building_id}`"
        />
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Target Ready Date -->
      <template #cell-expected_date="{ value }">
        <span class="text-xs font-mono font-medium text-red-600 dark:text-red-400">
          {{ value ? formatDate(value) : '—' }}
        </span>
      </template>

      <!-- Days Overdue -->
      <template #cell-days_overdue="{ value }">
        <span
          v-if="value !== null"
          class="font-black text-sm"
          :class="value > 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
        >
          {{ value }}d
        </span>
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Severity -->
      <template #cell-severity="{ value }">
        <UBadge
          :color="severityColor(value)"
          variant="subtle"
          size="sm"
          class="font-bold"
        >
          {{ severityLabel(value) }}
        </UBadge>
      </template>

      <!-- First Detected -->
      <template #cell-created_at="{ value }">
        <span class="text-xs text-gray-500 font-mono">{{ formatDate(value) }}</span>
      </template>
    </GenericDataTable>

    <!-- Context Helper -->
    <LazyContextHelper
      title="Make Ready"
      description="Units overdue for make-ready turnover"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">What Is This?</h3>
          <p>Units that appear on the <strong>5p_MakeReady</strong> report with a target ready date that has already passed. Each row represents a vacant unit that should be cleaned and prepped for the next resident — but isn't done yet.</p>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">How It's Calculated</h3>
          <p>The Solver reads the MakeReady report each upload cycle. Any unit whose <strong>Target Ready Date</strong> is in the past gets flagged as overdue. When a unit is no longer on the MakeReady report (turnover complete), the flag is automatically cleared.</p>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Severity Levels</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong class="text-red-600">Critical</strong> — 7+ days overdue. Unit is significantly delayed.</li>
            <li><strong class="text-amber-600">Warning</strong> — 1–7 days overdue. Needs attention soon.</li>
          </ul>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Debugging Stale Flags</h3>
          <p>If a unit shows here but turnover is actually complete, it means the MakeReady report still lists that unit. The flag will clear automatically on the next successful Solver run after the unit is removed from Yardi's MakeReady list.</p>
        </section>
      </div>
    </LazyContextHelper>

  </div>
</template>
