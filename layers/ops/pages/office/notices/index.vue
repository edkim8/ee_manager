<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import type { TableColumn } from '../../../../table/types'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { activeProperty, userContext } = usePropertyState()

// Fetch Active Property Name for Header
const { data: activePropertyRecord } = await useAsyncData('active-property-header-notices', async () => {
  if (!activeProperty.value) return null
  const { data } = await supabase
    .from('properties')
    .select('name')
    .eq('code', activeProperty.value)
    .single()
  return data
}, {
  watch: [activeProperty]
})

// Fetch Notices Data
const { data: notices, status, error } = await useAsyncData('notices-list', async () => {
  if (!activeProperty.value) return []

  const { data, error } = await supabase
    .from('view_table_notices')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('move_out_date', { ascending: true })

  if (error) throw error
  return data || []
}, {
  watch: [activeProperty]
})

const columns: TableColumn[] = [
  { key: 'unit_name',          label: 'Unit',          sortable: true },
  { key: 'resident_name',      label: 'Resident',      sortable: true },
  { key: 'building_name',      label: 'Building',      sortable: true },
  { key: 'move_out_date',      label: 'Move-Out Date', sortable: true },
  { key: 'days_until_moveout', label: 'Days Left',     sortable: true, align: 'right' },
  { key: 'lease_end_date',     label: 'Lease End',     sortable: true },
  { key: 'rent_amount',        label: 'Rent',          sortable: true, align: 'right' },
]

// Search
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!notices.value) return []
  if (!searchQuery.value) return notices.value

  const q = searchQuery.value.toLowerCase()
  return notices.value.filter((r: any) =>
    r.resident_name?.toLowerCase().includes(q) ||
    r.unit_name?.toLowerCase().includes(q) ||
    r.building_name?.toLowerCase().includes(q)
  )
})

// Days-left badge color
function daysColor(days: number | null): string {
  if (days === null) return 'neutral'
  if (days < 0)  return 'error'
  if (days <= 7) return 'warning'
  if (days <= 30) return 'warning'
  return 'success'
}

function daysLabel(days: number | null): string {
  if (days === null) return '—'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  return `${days}d`
}

function formatDate(val: string | null): string {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
}

const handleRowClick = (row: any) => {
  if (row?.unit_id) {
    navigateTo(`/assets/units/${row.unit_id}`)
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-baseline gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Notices
      </h1>
      <span v-if="activePropertyRecord?.name" class="text-lg text-gray-500 font-medium">
        &middot; {{ activePropertyRecord.name }}
      </span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <div class="flex items-center gap-2 font-bold mb-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        <span>Error Fetching Notices</span>
      </div>
      <p class="text-sm">{{ error.message }}</p>
    </div>

    <GenericDataTable
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="tenancy_id"
      enable-pagination
      :page-size="25"
      default-sort-field="move_out_date"
      clickable
      striped
      enable-export
      export-filename="notices"
      @row-click="handleRowClick"
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search notices..."
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredData.length }} {{ filteredData.length === 1 ? 'notice' : 'notices' }}
          </span>
        </div>
      </template>

      <!-- Unit Link -->
      <template #cell-unit_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/units/${row.unit_id}`"
        />
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Resident Name -->
      <template #cell-resident_name="{ value }">
        <div v-if="value" class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
          <span class="font-medium">{{ value }}</span>
        </div>
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Building Link -->
      <template #cell-building_name="{ value, row }">
        <CellsLinkCell
          v-if="value"
          :value="value"
          :to="`/assets/buildings/${row.building_id}`"
        />
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Move-Out Date -->
      <template #cell-move_out_date="{ value, row }">
        <span
          v-if="value"
          class="text-xs font-mono font-medium"
          :class="row.days_until_moveout !== null && row.days_until_moveout < 0
            ? 'text-red-600'
            : row.days_until_moveout !== null && row.days_until_moveout <= 30
              ? 'text-amber-600'
              : 'text-gray-700'"
        >
          {{ formatDate(value) }}
        </span>
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Days Until Move-Out -->
      <template #cell-days_until_moveout="{ value }">
        <UBadge
          :color="daysColor(value)"
          variant="subtle"
          size="sm"
        >
          {{ daysLabel(value) }}
        </UBadge>
      </template>

      <!-- Lease End Date -->
      <template #cell-lease_end_date="{ value }">
        <span v-if="value" class="text-xs text-blue-600 font-mono font-medium">{{ formatDate(value) }}</span>
        <span v-else class="text-gray-400">—</span>
      </template>

      <!-- Rent Amount -->
      <template #cell-rent_amount="{ value }">
        <span v-if="value" class="text-sm font-mono">
          ${{ Number(value).toLocaleString() }}
        </span>
        <span v-else class="text-gray-400">—</span>
      </template>
    </GenericDataTable>

    <!-- Context Helper -->
    <LazyContextHelper
      title="Notices"
      description="Residents who have submitted a move-out notice"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">About This Page</h3>
          <p>Shows all active tenancies with <strong>Notice</strong> status — residents who have given a move-out notice but are still in residence.</p>
          <p class="mt-2">Sorted by move-out date (soonest first) so upcoming vacancies are easy to spot.</p>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Days Left Indicators</h3>
          <ul class="list-disc list-inside space-y-1">
            <li><strong class="text-error-600">Overdue</strong> — Move-out date has passed, resident may still be in unit.</li>
            <li><strong class="text-warning-600">≤ 30 days</strong> — Move-out approaching; prepare make-ready.</li>
            <li><strong class="text-success-600">&gt; 30 days</strong> — Sufficient lead time for scheduling.</li>
          </ul>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
