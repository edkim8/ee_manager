<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { definePageMeta, usePropertyState, useSupabaseClient, useAsyncData } from '#imports'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns } from '../../../../../configs/table-configs/work_orders-complete.generated'
import { filterColumnsByAccess } from '../../../../table/composables/useTableColumns'

definePageMeta({
  layout: 'dashboard'
})

const { activeProperty, userContext } = usePropertyState()
const supabase = useSupabaseClient()

// ============================================================
// DATA FETCHING
// ============================================================
const { data, status, error, refresh } = await useAsyncData(
  'work-orders-data',
  async () => {
    if (!activeProperty.value) {
      return {
        workOrders: [],
        openSummary: null,
        byCategory: [],
        closedSummary: []
      }
    }

    try {
      // Fetch all work orders for the property
      const { data: orders, error: ordersError } = await supabase
        .from('work_orders')
        .select(`
          *,
          units (
            id,
            unit_name,
            building_id,
            buildings (id, name)
          )
        `)
        .eq('property_code', activeProperty.value)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Calculate summaries
      // Open = still on the Yardi report (is_active = true)
      // Work Completed = status matches (is_active may be false if already synced off the report)
      const openOrders = orders?.filter(wo => wo.is_active) || []
      const closedOrders = orders?.filter(wo => wo.status === 'Work Completed') || []

      // Open summary
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000))
      const over3Days = openOrders.filter(wo => new Date(wo.created_at) < threeDaysAgo).length
      const onHoldParts = openOrders.filter(wo => wo.status === 'On Hold' || wo.status === 'Parts Pending').length

      const openSummary = {
        total_count: openOrders.length,
        over_3_days: over3Days,
        on_hold_parts: onHoldParts
      }

      // Closed summary (last 6 months, sorted newest first)
      const closedByMonth = new Map<string, { count: number, totalDuration: number, sortKey: string }>()
      closedOrders.forEach(wo => {
        if (wo.completion_date && wo.call_date) {
          const completionDate = new Date(wo.completion_date)
          const month = completionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          const sortKey = `${completionDate.getFullYear()}-${String(completionDate.getMonth() + 1).padStart(2, '0')}`
          const duration = Math.ceil((completionDate.getTime() - new Date(wo.call_date).getTime()) / (1000 * 60 * 60 * 24))

          if (!closedByMonth.has(month)) {
            closedByMonth.set(month, { count: 0, totalDuration: 0, sortKey })
          }
          const stats = closedByMonth.get(month)!
          stats.count++
          stats.totalDuration += duration
        }
      })

      const closedSummary = Array.from(closedByMonth.entries())
        .map(([month, stats]) => ({
          month,
          total_orders: stats.count,
          average_close_duration: Math.round(stats.totalDuration / stats.count),
          sortKey: stats.sortKey
        }))
        .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
        .slice(0, 6)
        .map(({ sortKey: _sk, ...rest }) => rest)

      return {
        workOrders: orders || [],
        openSummary,
        closedSummary
      }
    } catch (err) {
      console.error('Error fetching work orders:', err)
      throw err
    }
  },
  {
    watch: [activeProperty]
  }
)

const workOrders = computed(() => data.value?.workOrders || [])
const openSummary = computed(() => data.value?.openSummary)
const closedSummary = computed(() => data.value?.closedSummary || [])

// ============================================================
// BY CATEGORY — client-side computed with time window filter
// ============================================================
const categoryTimeFilter = ref<string>('30')

const categoryTimeOptions = [
  { value: '30',  label: 'Last 30 Days' },
  { value: '90',  label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
]

const filteredByCategory = computed(() => {
  let source = workOrders.value

  if (categoryTimeFilter.value !== 'all') {
    const days = parseInt(categoryTimeFilter.value)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    source = source.filter(wo => new Date(wo.created_at) >= cutoff)
  }

  const categoryMap = new Map<string, number>()
  source.forEach(wo => {
    const category = wo.category || 'Uncategorized'
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
  })

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
})

// ============================================================
// FILTERING
// ============================================================
const searchQuery = ref('')
const statusFilter = ref<string>('open')

// Real Yardi statuses. "Open" is a synthetic filter meaning is_active = true.
// "Work Completed" matches on status only (is_active may already be false).
const statusOptions = [
  { value: 'all',            label: 'All Work Orders' },
  { value: 'open',           label: 'Open (Active)' },
  { value: 'Call',           label: 'Call' },
  { value: 'On Hold',        label: 'On Hold' },
  { value: 'Parts Pending',  label: 'Parts Pending' },
  { value: 'Scheduled',      label: 'Scheduled' },
  { value: 'Web',            label: 'Web' },
  { value: 'Work Completed', label: 'Work Completed' },
]

const filteredWorkOrders = computed(() => {
  let filtered = workOrders.value

  if (statusFilter.value === 'open') {
    // Open = all WOs still on the Yardi report
    filtered = filtered.filter(wo => wo.is_active)
  } else if (statusFilter.value === 'Work Completed') {
    // Work Completed matches on status regardless of is_active
    filtered = filtered.filter(wo => wo.status === 'Work Completed')
  } else if (statusFilter.value !== 'all') {
    // Active-only specific statuses: Call, On Hold, Parts Pending, Scheduled, Web
    filtered = filtered.filter(wo => wo.is_active && wo.status === statusFilter.value)
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(wo =>
      wo.unit_name?.toLowerCase().includes(query) ||
      wo.description?.toLowerCase().includes(query) ||
      wo.category?.toLowerCase().includes(query) ||
      wo.resident?.toLowerCase().includes(query) ||
      wo.yardi_work_order_id?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// ============================================================
// TABLE CONFIGURATION - From Excel
// ============================================================
const columns = computed(() => {
  return filterColumnsByAccess(allColumns, {
    userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
    userDepartment: userContext.value?.profile?.department,
    isSuperAdmin: !!userContext.value?.access?.is_super_admin,
    filterGroup: 'all'
  })
})

// Calculate days open for each work order
const enhancedWorkOrders = computed(() => {
  return filteredWorkOrders.value.map(wo => {
    let daysOpen = 0
    if (wo.call_date) {
      const endDate = wo.completion_date ? new Date(wo.completion_date) : new Date()
      const startDate = new Date(wo.call_date)
      daysOpen = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    return {
      ...wo,
      building_name: wo.units?.buildings?.name || '-',
      days_open: daysOpen
    }
  })
})

// ============================================================
// UTILITIES
// ============================================================
function getStatusColor(status: string): string {
  switch (status) {
    case 'Work Completed': return 'success'
    case 'Scheduled':      return 'primary'
    case 'Parts Pending':  return 'warning'
    case 'On Hold':        return 'neutral'
    case 'Call':           return 'error'
    case 'Web':            return 'info'
    default:               return 'neutral'
  }
}

function getCategoryColor(category: string): string {
  const colors = ['purple', 'blue', 'green', 'yellow', 'orange', 'pink']
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

const isLoading = computed(() => status.value === 'pending')
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Work Orders</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Property: {{ activeProperty || 'Global' }}
        </p>
      </div>
      <UButton
        icon="i-heroicons-arrow-path"
        color="neutral"
        variant="ghost"
        :loading="isLoading"
        @click="refresh"
      >
        Refresh
      </UButton>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Open Work Orders -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Open Work Orders</h3>
        </template>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Total</span>
            <span class="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {{ openSummary?.total_count || 0 }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Over 3 Days</span>
            <span class="text-lg font-semibold text-red-600 dark:text-red-400">
              {{ openSummary?.over_3_days || 0 }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">On Hold / Parts Pending</span>
            <span class="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {{ openSummary?.on_hold_parts || 0 }}
            </span>
          </div>
        </div>
      </UCard>

      <!-- Work Orders by Category -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-bold">By Category</h3>
            <USelectMenu
              v-model="categoryTimeFilter"
              :items="categoryTimeOptions"
              value-key="value"
              size="xs"
              class="w-32"
            />
          </div>
        </template>
        <div v-if="filteredByCategory.length > 0" class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div v-for="item in filteredByCategory" :key="item.category" class="flex items-center justify-between gap-1">
            <span class="text-gray-600 dark:text-gray-400 truncate text-xs">{{ item.category }}</span>
            <UBadge :color="getCategoryColor(item.category)" variant="soft" size="sm">
              {{ item.count }}
            </UBadge>
          </div>
        </div>
        <div v-else class="text-sm text-gray-400 dark:text-gray-600 italic">
          No categories in this period
        </div>
      </UCard>

      <!-- Closed Work Orders -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Recently Closed</h3>
        </template>
        <div v-if="closedSummary.length > 0">
          <!-- Column headers -->
          <div class="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 pb-1 mb-1 border-b border-gray-100 dark:border-gray-800">
            <span>Month</span>
            <span class="text-center">Closed</span>
            <span class="text-right">Avg Close</span>
          </div>
          <div
            v-for="item in closedSummary"
            :key="item.month"
            class="grid grid-cols-3 items-center py-1.5 text-sm border-b border-gray-50 dark:border-gray-800/50 last:border-0"
          >
            <span class="text-gray-600 dark:text-gray-400 text-xs">{{ item.month }}</span>
            <span class="text-center font-semibold text-gray-800 dark:text-gray-200">{{ item.total_orders }}</span>
            <span class="text-right font-semibold text-primary-600 dark:text-primary-400">{{ item.average_close_duration }}d</span>
          </div>
        </div>
        <div v-else class="text-sm text-gray-400 dark:text-gray-600 italic">
          No closed work orders
        </div>
      </UCard>
    </div>

    <!-- Error State -->
    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="soft"
      title="Error loading work orders"
      :description="error.message"
      class="mb-6"
    />

    <!-- Work Orders Table -->
    <UCard>
      <GenericDataTable
        :data="enhancedWorkOrders"
        :columns="columns"
        :loading="isLoading"
        row-key="id"
        striped
        enable-pagination
        :page-size="25"
        empty-message="No work orders found"
        default-sort-field="created_at"
        default-sort-direction="desc"
        enable-export
        export-filename="work-orders"
      >
        <!-- Toolbar: Search and Filter -->
        <template #toolbar>
          <div class="flex items-center gap-4">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search work orders..."
              class="w-64"
            />
            <USelectMenu
              v-model="statusFilter"
              :items="statusOptions"
              value-key="value"
              class="w-48"
            />
          </div>
        </template>

        <!-- WO ID Cell -->
        <template #cell-yardi_work_order_id="{ value }">
          <span class="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">
            {{ value }}
          </span>
        </template>

        <!-- Status Cell -->
        <template #cell-status="{ value }">
          <UBadge
            :color="getStatusColor(value)"
            variant="soft"
            size="sm"
            class="font-semibold"
          >
            {{ value }}
          </UBadge>
        </template>

        <!-- Unit Cell -->
        <template #cell-unit_name="{ value, row }">
          <CellsLinkCell
            v-if="value && row.unit_id"
            :value="value"
            :to="`/assets/units/${row.unit_id}`"
          />
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <!-- Building Cell -->
        <template #cell-building_name="{ value }">
          <span v-if="value && value !== '-'" class="text-sm">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <!-- Category Cell -->
        <template #cell-category="{ value }">
          <UBadge
            v-if="value"
            :color="getCategoryColor(value)"
            variant="soft"
            size="sm"
          >
            {{ value }}
          </UBadge>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <!-- Description Cell -->
        <template #cell-description="{ value }">
          <span v-if="value" class="text-sm line-clamp-2" :title="value">
            {{ value }}
          </span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <!-- Resident Cell -->
        <template #cell-resident="{ value }">
          <span v-if="value" class="text-sm">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <!-- Call Date Cell -->
        <template #cell-call_date="{ value }">
          <CellsDateCell v-if="value" :value="value" format="short" />
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <!-- Completion Date Cell -->
        <template #cell-completion_date="{ value }">
          <CellsDateCell v-if="value" :value="value" format="short" />
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <!-- Days Open Cell -->
        <template #cell-days_open="{ value }">
          <UBadge
            v-if="value > 0"
            :color="value > 7 ? 'red' : value > 3 ? 'orange' : 'gray'"
            variant="soft"
            size="sm"
            class="font-semibold"
          >
            {{ value }}d
          </UBadge>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>
      </GenericDataTable>
    </UCard>

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Work Orders" 
      description="Maintenance Lifecycle & Service Metrics"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Work Order Statuses (Yardi)</h3>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong class="text-red-600">Call:</strong> New request received via phone call. Awaiting assignment.</li>
            <li><strong class="text-blue-600">Web:</strong> Request submitted through the resident portal.</li>
            <li><strong class="text-primary-600">Scheduled:</strong> Technician assigned and visit is scheduled.</li>
            <li><strong class="text-amber-600">Parts Pending:</strong> Work started but waiting on parts or materials.</li>
            <li><strong class="text-gray-500">On Hold:</strong> Work paused — resident unavailable, access issue, etc.</li>
            <li><strong class="text-green-600">Work Completed:</strong> Technician marked complete in Yardi. Removed from active report on next sync.</li>
          </ul>
        </section>
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Active vs. Completed</h3>
          <p><strong>Open (Active)</strong> = WO is still on the current Yardi 5p_WorkOrders report (<code>is_active = true</code>). When maintenance marks a WO done in Yardi, it drops off the report and <code>is_active</code> flips to <code>false</code> on the next Solver run.</p>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Aging & Priority</h3>
          <p>
            The <strong>Days Open</strong> metric is the primary driver for service level (SLA) tracking:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Over 3 Days:</strong> Tickets highlighted for immediate supervisor review.</li>
            <li><strong>SLA Calculation:</strong> Calculated as the difference between the <strong>Call Date</strong> and the current date (or <strong>Completion Date</strong>).</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Categorization</h3>
          <p>
            Proper categorization (e.g., HVAC, Electrical, Plumbing) is critical for:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Technician Assignment:</strong> Routing tasks to the correct specialized personnel.</li>
            <li><strong>Resource Planning:</strong> Identifying recurring issues across buildings or unit types.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Data Integrity</h3>
          <div class="space-y-2 text-xs text-gray-500">
            <p><strong>Yardi Sync Pulse:</strong> Work orders are synchronized from Yardi every 24 hours. Manual changes in this dashboard are for temporary auditing and may be overridden by the next sync if not reconciled in Yardi.</p>
          </div>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
