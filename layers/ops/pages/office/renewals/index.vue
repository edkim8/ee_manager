<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState, useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import type { TableColumn } from '../../../../table/types'
import SimpleModal from '../../../../base/components/SimpleModal.vue'
import GenericDataTable from '../../../../table/components/GenericDataTable.vue'
import BadgeCell from '../../../../table/components/cells/BadgeCell.vue'
import { populateWorksheet, populateMtmRenewals } from '../../../composables/useRenewalsPopulate'
import LeaseExpirationDashboard from '../../../components/renewals/LeaseExpirationDashboard.vue'
import WorksheetSummaryCard from '../../../components/renewals/WorksheetSummaryCard.vue'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

// Modal state
const showNewWorksheetModal = ref(false)
const showDeleteModal = ref(false)
const worksheetToDelete = ref<any>(null)

// New worksheet form
const newWorksheetForm = ref({
  name: '',
  start_date: '',
  end_date: '',
  ltl_percent: 25,
  max_rent_increase_percent: 5,
  mtm_fee: 300
})

// Calculate default date range for new worksheet
// Business logic: Start = first of next month + 2 months (ensures 60-89 days advance notice)
// Example: Today 2/12 → Next first 3/1 → Add 2 months → 5/1 - 5/31
function calculateDefaultDateRange() {
  const today = new Date()

  // Get first of next month
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  // Add 2 months to get start date
  const startDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 2, 1)

  // End date is last day of same month
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  }
}

// Open new worksheet modal with default dates
function openNewWorksheetModal() {
  const defaultDates = calculateDefaultDateRange()
  newWorksheetForm.value.start_date = defaultDates.start_date
  newWorksheetForm.value.end_date = defaultDates.end_date
  newWorksheetForm.value.name = ''
  showNewWorksheetModal.value = true
}

// Filters
const showArchived = ref(false)

// Fetch worksheets with summaries
const { data: worksheets, pending, error, refresh } = await useAsyncData(
  () => `renewal-worksheets-${activeProperty.value}-${showArchived.value}`,
  async () => {
    if (!activeProperty.value) return []

    const query = supabase
      .from('view_renewal_worksheet_summaries')
      .select('*')
      .eq('property_code', activeProperty.value)

    if (!showArchived.value) {
      query.neq('status', 'archived')
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[Renewals] Error fetching worksheets:', error)
      throw error
    }

    return data || []
  },
  {
    watch: [activeProperty, showArchived],
    server: false
  }
)

// Fetch renewal pipeline summary for dashboard
const { data: pipelineSummary } = await useAsyncData(
  () => `renewal-pipeline-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return null

    const { data, error } = await supabase
      .from('view_renewal_pipeline_summary')
      .select('*')
      .eq('property_code', activeProperty.value)

    if (error) {
      console.error('[Renewals] Pipeline summary error:', error)
      return null
    }

    // Aggregate across floor plans
    const totals = (data || []).reduce((acc: any, fp: any) => {
      acc.expiring_30_days += fp.expiring_30_days || 0
      acc.expiring_90_days += fp.expiring_90_days || 0
      acc.offered_count += fp.offered_count || 0
      acc.manually_accepted_count += fp.manually_accepted_count || 0
      acc.manually_declined_count += fp.manually_declined_count || 0
      acc.accepted_count += fp.accepted_count || 0
      acc.declined_count += fp.declined_count || 0
      acc.pending_count += fp.pending_count || 0
      acc.yardi_confirmed_count += fp.yardi_confirmed_count || 0
      acc.total_items += fp.total_items || 0
      acc.total_signed_leases += fp.total_signed_leases || 0
      acc.total_mtm += fp.total_mtm || 0
      return acc
    }, {
      expiring_30_days: 0,
      expiring_90_days: 0,
      offered_count: 0,
      manually_accepted_count: 0,
      manually_declined_count: 0,
      accepted_count: 0,
      declined_count: 0,
      pending_count: 0,
      yardi_confirmed_count: 0,
      total_items: 0,
      total_signed_leases: 0,
      total_mtm: 0
    })

    return totals
  },
  {
    watch: [activeProperty],
    server: false
  }
)

// Fetch term breakdown for manually accepted and Yardi accepted renewals
const { data: termBreakdown } = await useAsyncData(
  () => `renewal-term-breakdown-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return null

    // Fetch all active renewal worksheet items with lease data
    // NOTE: Keep .select() inline — multi-line template literals cause 400 errors (see KNOWLEDGE_BASE.md)
    const { data, error } = await supabase
      .from('renewal_worksheet_items')
      .select('id, status, yardi_confirmed, manual_status, tenancies!inner(id, property_code, leases!inner(id, term_months, lease_status))')
      .eq('tenancies.property_code', activeProperty.value)
      .eq('active', true)

    if (error) {
      console.error('[Renewals] Term breakdown error:', error)
      return null
    }

    // Group by status and term length
    const manuallyAccepted: Record<number, number> = {}
    const yardiAccepted: Record<number, number> = {}

    data?.forEach((item: any) => {
      const termMonths = item.tenancies?.leases?.[0]?.term_months

      if (!termMonths) return

      // Manually accepted
      if (item.manual_status === 'manually_accepted' || item.status === 'manually_accepted') {
        manuallyAccepted[termMonths] = (manuallyAccepted[termMonths] || 0) + 1
      }

      // Yardi confirmed accepted
      if (item.yardi_confirmed && (item.status === 'accepted' || item.manual_status === 'accepted')) {
        yardiAccepted[termMonths] = (yardiAccepted[termMonths] || 0) + 1
      }
    })

    // Format as "count - term months" strings
    const formatTermBreakdown = (termCounts: Record<number, number>) => {
      return Object.entries(termCounts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([term, count]) => `${count} - ${term} month${Number(term) !== 1 ? 's' : ''}`)
        .join(', ')
    }

    return {
      manuallyAccepted: formatTermBreakdown(manuallyAccepted),
      yardiAccepted: formatTermBreakdown(yardiAccepted)
    }
  },
  {
    watch: [activeProperty],
    server: false
  }
)

// Table columns
const columns: TableColumn[] = [
  { key: 'name', label: 'Worksheet Name', sortable: true },
  { key: 'date_range', label: 'Date Range', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'total_items', label: 'Total', align: 'center', sortable: true },
  { key: 'status_breakdown', label: 'Status Breakdown', sortable: false },
  { key: 'financial_summary', label: 'Financial Summary', sortable: false },
  { key: 'actions', label: 'Actions', align: 'right', sortable: false }
]

// Format date for display (timezone-safe)
function formatDate(dateStr: string) {
  if (!dateStr) return ''

  // Handle full timestamps (e.g., "2026-02-12T10:30:00Z")
  // Check if dateStr already contains time component
  if (dateStr.includes('T') || dateStr.includes('Z')) {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // For date-only strings (e.g., "2026-02-12"), append T00:00:00 to prevent timezone shift
  const date = new Date(dateStr + 'T00:00:00')
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Calculate date ranges for pipeline summary periods
// Aligned with renewal processing logic (60-89 days before expiration)
function getNextMonthRange() {
  const today = new Date()
  // First of next month + 2 months = current renewal processing period
  const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const startDate = new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth() + 2, 1)
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

  return {
    start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

function getNext3MonthsRange() {
  const today = new Date()
  // From current renewal period through 2 more periods (3 total)
  const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const startDate = new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth() + 2, 1)
  const endDate = new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth() + 5, 0)

  return {
    start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

const nextMonthRange = computed(() => getNextMonthRange())
const next3MonthsRange = computed(() => getNext3MonthsRange())

// Format currency
function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)
}

// Create new worksheet
async function handleCreateWorksheet() {
  if (!activeProperty.value) return

  try {
    // 1. Create worksheet
    const { data, error } = await supabase
      .from('renewal_worksheets')
      .insert({
        property_code: activeProperty.value,
        name: `${newWorksheetForm.value.name} (${new Date().toISOString().split('T')[0]})`,
        start_date: newWorksheetForm.value.start_date,
        end_date: newWorksheetForm.value.end_date,
        ltl_percent: newWorksheetForm.value.ltl_percent,
        max_rent_increase_percent: newWorksheetForm.value.max_rent_increase_percent,
        mtm_fee: newWorksheetForm.value.mtm_fee,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      console.error('[Renewals] Create worksheet error:', error)
      return
    }

    if (!data) return

    showNewWorksheetModal.value = false

    // 2. Populate with expiring leases
    console.log('[Renewals] Populating worksheet with expiring leases...')
    const populateResult = await populateWorksheet(
      data.id,
      newWorksheetForm.value.start_date,
      newWorksheetForm.value.end_date
    )

    // 3. Also populate MTM renewals
    const mtmResult = await populateMtmRenewals(
      data.id,
      activeProperty.value,
      newWorksheetForm.value.mtm_fee
    )

    console.log('[Renewals] Populated:', {
      standard: populateResult.count,
      mtm: mtmResult.count
    })

    // 4. Navigate to new worksheet
    navigateTo(`/office/renewals/${data.id}`)
  } catch (error) {
    console.error('[Renewals] Worksheet creation error:', error)
  }
}

// Delete worksheet
async function handleDeleteWorksheet() {
  if (!worksheetToDelete.value) return

  const { error } = await supabase
    .from('renewal_worksheets')
    .delete()
    .eq('id', worksheetToDelete.value.worksheet_id)

  if (error) {
    console.error('[Renewals] Delete error:', error)
    return
  }

  showDeleteModal.value = false
  worksheetToDelete.value = null
  refresh()
}

// Archive/Unarchive worksheet
async function handleToggleArchive(worksheet: any) {
  const newStatus = worksheet.status === 'archived' ? 'draft' : 'archived'

  const { error } = await supabase
    .from('renewal_worksheets')
    .update({ status: newStatus })
    .eq('id', worksheet.worksheet_id)

  if (error) {
    console.error('[Renewals] Archive error:', error)
    return
  }

  refresh()
}

// Finalize worksheet
async function handleFinalize(worksheet: any) {
  const { error } = await supabase
    .from('renewal_worksheets')
    .update({ status: 'final' })
    .eq('id', worksheet.worksheet_id)

  if (error) {
    console.error('[Renewals] Finalize error:', error)
    return
  }

  refresh()
}

// Open delete confirmation
function confirmDelete(worksheet: any) {
  worksheetToDelete.value = worksheet
  showDeleteModal.value = true
}

// Status color mapping
const statusColors: Record<string, string> = {
  draft: 'neutral',
  final: 'success',
  archived: 'neutral'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Lease Expiration Forecast (24-month chart with target setting) -->
    <!-- ClientOnly required: Chart.js uses canvas/window APIs unavailable during SSR -->
    <ClientOnly>
      <LeaseExpirationDashboard
        v-if="activeProperty"
        :property-code="activeProperty"
      />
    </ClientOnly>

    <!-- Open Renewal Pipeline Dashboard -->
    <div v-if="pipelineSummary" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold">Open Renewal Pipeline Summary</h2>
        <div class="flex gap-6 text-sm">
          <div class="text-gray-600 dark:text-gray-400">
            All Items: <span class="font-semibold text-gray-900 dark:text-gray-100">{{ pipelineSummary.total_items }}</span>
          </div>
          <div class="text-gray-600 dark:text-gray-400">
            Total Signed Leases: <span class="font-semibold text-green-600 dark:text-green-400">{{ pipelineSummary.total_signed_leases }}</span>
          </div>
          <div class="text-gray-600 dark:text-gray-400">
            Total MTM: <span class="font-semibold text-blue-600 dark:text-blue-400">{{ pipelineSummary.total_mtm }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <!-- Expiring Leases -->
        <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {{ pipelineSummary.expiring_30_days }}
          </div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Current Period</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ nextMonthRange.start }} - {{ nextMonthRange.end }}
          </div>
        </div>

        <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {{ pipelineSummary.expiring_90_days }}
          </div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Next 3 Periods</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ next3MonthsRange.start }} - {{ next3MonthsRange.end }}
          </div>
        </div>

        <!-- Manual Status (Early Signals) -->
        <div class="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {{ pipelineSummary.manually_accepted_count }}
          </div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Manual Accepted</div>
          <div v-if="termBreakdown?.manuallyAccepted" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ termBreakdown.manuallyAccepted }}
          </div>
        </div>

        <div class="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div class="text-2xl font-bold text-red-600 dark:text-red-400">
            {{ pipelineSummary.manually_declined_count }}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Manual Declined</div>
        </div>

        <!-- Yardi Confirmed (Official) -->
        <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ pipelineSummary.accepted_count }}
          </div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Yardi Accepted ✓</div>
          <div v-if="termBreakdown?.yardiAccepted" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ termBreakdown.yardiAccepted }}
          </div>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {{ pipelineSummary.yardi_confirmed_count }}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Total Confirmed</div>
        </div>
      </div>
    </div>

    <!-- Worksheets Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-4">
          <h2 class="text-xl font-semibold">Renewal Worksheets</h2>

          <label class="flex items-center gap-2 text-sm" title="Archived worksheets are manually archived via the folder icon">
            <input
              v-model="showArchived"
              type="checkbox"
              class="rounded border-gray-300"
            />
            <span>Show Archived</span>
          </label>

          <div class="text-xs text-gray-500" title="Export downloads the list of worksheets to CSV">
            ℹ️ Export downloads worksheet list
          </div>
        </div>

        <UButton
          icon="i-heroicons-plus-circle"
          label="Create New Worksheet"
          @click="openNewWorksheetModal"
        />
      </div>

      <!-- Worksheets Table -->
      <GenericDataTable
        :data="worksheets || []"
        :columns="columns"
        :loading="pending"
        row-key="worksheet_id"
        empty-message="No worksheets found. Create your first renewal worksheet to get started."
        enable-export
        export-filename="renewal-worksheets"
      >
        <template #cell-name="{ row }">
          <div class="font-medium">{{ row.name || 'Untitled Worksheet' }}</div>
          <div class="text-xs text-gray-500">
            {{ row.created_at ? `Created ${formatDate(row.created_at)}` : 'No creation date' }}
          </div>
        </template>

        <template #cell-date_range="{ row }">
          <div class="text-sm">
            <div>{{ formatDate(row.start_date) }} - {{ formatDate(row.end_date) }}</div>
            <div v-if="row.end_date && new Date(row.end_date + 'T00:00:00') < new Date()"
                 class="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1"
                 title="Period ended - All responses should be in. Ready to archive.">
              ⚠️ Period ended - Ready to archive
            </div>
          </div>
        </template>

        <template #cell-status="{ row }">
          <BadgeCell
            :text="row.status"
            :color="statusColors[row.status]"
            variant="subtle"
          />
        </template>

        <template #cell-status_breakdown="{ row }">
          <div class="text-sm space-y-1">
            <div title="Renewals with offers generated (status = 'offered', not yet accepted/declined)">
              Offered: {{ row.offered_count }}
            </div>
            <div class="text-yellow-600" title="Staff manually marked as accepted or declined (status changed from offered to manual status)">
              Manual: {{ row.manually_accepted_count + row.manually_declined_count }}
            </div>
            <div class="text-green-600" title="Yardi-confirmed acceptances from daily uploads (official status)">
              Confirmed: {{ row.yardi_confirmed_count }}
            </div>
            <div class="text-xs text-gray-500 mt-1" title="Total includes all statuses: pending, offered, manual, confirmed, etc.">
              (Statuses are mutually exclusive)
            </div>
          </div>
        </template>

        <template #cell-financial_summary="{ row }">
          <div class="text-sm space-y-1">
            <div>Current: {{ formatCurrency(row.total_current_rent || 0) }}</div>
            <div>Offered: {{ formatCurrency(row.total_offered_rent || 0) }}</div>
            <div class="font-medium" :class="(row.total_rent_increase || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
              Increase: {{ formatCurrency(row.total_rent_increase || 0) }}
              <span v-if="row.avg_increase_percent">({{ row.avg_increase_percent }}%)</span>
            </div>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-2">
            <UButton
              size="xs"
              variant="ghost"
              icon="i-heroicons-eye"
              title="View worksheet details"
              @click="navigateTo(`/office/renewals/${row.worksheet_id}`)"
            />

            <UButton
              v-if="row.status === 'draft' && row.is_fully_approved"
              size="xs"
              variant="ghost"
              color="primary"
              icon="i-heroicons-check-badge"
              title="Finalize worksheet (lock and generate Mail Merger)"
              @click="handleFinalize(row)"
            />

            <UButton
              size="xs"
              variant="ghost"
              :icon="row.status === 'archived' ? 'i-heroicons-arrow-up-tray' : 'i-heroicons-archive-box'"
              :title="row.status === 'archived' ? 'Unarchive worksheet' : 'Archive worksheet'"
              @click="handleToggleArchive(row)"
            />

            <UButton
              size="xs"
              variant="ghost"
              color="red"
              icon="i-heroicons-trash"
              title="Delete worksheet permanently"
              @click="confirmDelete(row)"
            />
          </div>
        </template>
      </GenericDataTable>
    </div>

    <!-- New Worksheet Modal -->
    <SimpleModal
      v-model="showNewWorksheetModal"
      title="Create New Renewal Worksheet"
    >
      <form @submit.prevent="handleCreateWorksheet" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Worksheet Name</label>
          <input
            v-model="newWorksheetForm.name"
            type="text"
            class="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., March Renewals"
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            Date will be appended automatically (e.g., "March Renewals (2026-02-10)")
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Start Date</label>
            <input
              v-model="newWorksheetForm.start_date"
              type="date"
              class="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">End Date</label>
            <input
              v-model="newWorksheetForm.end_date"
              type="date"
              class="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        </div>
        <p class="text-xs text-gray-500 -mt-2">
          Default: Current renewal period (first of next month + 2 months, ensuring 60-89 days advance notice)
        </p>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">LTL %</label>
            <input
              v-model.number="newWorksheetForm.ltl_percent"
              type="number"
              step="0.01"
              class="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Max Increase %</label>
            <input
              v-model.number="newWorksheetForm.max_rent_increase_percent"
              type="number"
              step="0.01"
              class="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">MTM Fee ($)</label>
            <input
              v-model.number="newWorksheetForm.mtm_fee"
              type="number"
              step="1"
              class="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            type="button"
            variant="ghost"
            label="Cancel"
            @click="showNewWorksheetModal = false"
          />
          <UButton
            type="submit"
            label="Create Worksheet"
          />
        </div>
      </form>
    </SimpleModal>

    <!-- Delete Confirmation Modal -->
    <SimpleModal
      v-model="showDeleteModal"
      title="Confirm Deletion"
    >
      <div class="space-y-4">
        <p>
          Are you sure you want to delete the worksheet
          <strong>"{{ worksheetToDelete?.name }}"</strong>?
        </p>
        <p class="text-sm text-red-600">
          This will also delete all renewal items and cannot be undone.
        </p>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            variant="ghost"
            label="Cancel"
            @click="showDeleteModal = false"
          />
          <UButton
            color="red"
            label="Delete"
            @click="handleDeleteWorksheet"
          />
        </div>
      </div>
    </SimpleModal>

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Renewal Manager" 
      description="Lease Expiration Forecasting & Processing"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Renewal Strategy</h3>
          <p>
            The Renewal Manager optimizes the lease expiration curve by facilitating proactive resident outreach:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Lease Forecast:</strong> The 24-month chart identifies upcoming expiration cliffs to prioritize marketing and occupancy efforts.</li>
            <li><strong>60-89 Day Window:</strong> Processing renewals exactly during this window ensures compliance with notice requirements while capturing market rent adjustments.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Worksheet Lifecycle</h3>
          <p>
            Renewals are managed in batches called <strong>Worksheets</strong>:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong class="text-neutral-600">Draft:</strong> Active worksheets where you can adjust offered rent and LTL percentages.</li>
            <li><strong class="text-success-600">Final (Locked):</strong> Once approved, worksheets are locked to generate mailing labels and official offer letters.</li>
            <li><strong>Archived:</strong> Completed periods moved out of the active pipeline for cleaner auditing.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Status Distinctions</h3>
          <div class="space-y-2">
            <p>
              Success is measured by two separate data signals:
            </p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong class="text-yellow-600">Manual Status:</strong> Real-time signals from staff interactions (e.g., resident verbally confirmed).</li>
              <li><strong class="text-green-600">Yardi Confirmed:</strong> Official status captured from the last nightly Yardi sync.</li>
            </ul>
          </div>
          <div class="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
            <strong>Pro Tip:</strong> Ensure all "Manual" acceptances align with the signed lease documents uploaded to Yardi to avoid audit discrepancies.
          </div>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
