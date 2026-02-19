<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { definePageMeta, usePropertyState, useSupabaseClient, useAsyncData } from '#imports'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns, filterGroups, roleColumns, departmentColumns } from '../../../../../configs/table-configs/work_orders-complete.generated'
import { getAccessibleColumns } from '../../../../table/utils/column-filtering'

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
      const openOrders = orders?.filter(wo => wo.is_active && wo.status !== 'Completed') || []
      const closedOrders = orders?.filter(wo => wo.status === 'Completed') || []

      // Open summary
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000))
      const over3Days = openOrders.filter(wo => new Date(wo.created_at) < threeDaysAgo).length

      const openSummary = {
        total_count: openOrders.length,
        over_3_days: over3Days
      }

      // By category
      const categoryMap = new Map<string, number>()
      orders?.forEach(wo => {
        const category = wo.category || 'Uncategorized'
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
      })
      const byCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count
      }))

      // Closed summary (last 3 months)
      const closedByMonth = new Map<string, { count: number, totalDuration: number }>()
      closedOrders.forEach(wo => {
        if (wo.completion_date && wo.call_date) {
          const month = new Date(wo.completion_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          const duration = Math.ceil((new Date(wo.completion_date).getTime() - new Date(wo.call_date).getTime()) / (1000 * 60 * 60 * 24))

          if (!closedByMonth.has(month)) {
            closedByMonth.set(month, { count: 0, totalDuration: 0 })
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
          average_close_duration: Math.round(stats.totalDuration / stats.count)
        }))
        .slice(0, 3)

      return {
        workOrders: orders || [],
        openSummary,
        byCategory,
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
const byCategory = computed(() => data.value?.byCategory || [])
const closedSummary = computed(() => data.value?.closedSummary || [])

// ============================================================
// FILTERING
// ============================================================
const searchQuery = ref('')
const statusFilter = ref<string>('all')

const statusOptions = [
  { value: 'all', label: 'All Work Orders' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' }
]

const filteredWorkOrders = computed(() => {
  let filtered = workOrders.value

  // Filter by status
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(wo => wo.status === statusFilter.value)
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
  return getAccessibleColumns(
    allColumns,
    filterGroups,
    roleColumns,
    departmentColumns,
    'all',
    userContext.value,
    activeProperty.value
  )
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
    case 'Completed':
      return 'green'
    case 'In Progress':
      return 'blue'
    case 'Open':
      return 'orange'
    case 'Cancelled':
      return 'red'
    default:
      return 'gray'
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
        </div>
      </UCard>

      <!-- Work Orders by Category -->
      <UCard>
        <template #header>
          <h3 class="font-bold">By Category</h3>
        </template>
        <div v-if="byCategory.length > 0" class="grid grid-cols-2 gap-2 text-sm">
          <div v-for="item in byCategory" :key="item.category" class="flex items-center justify-between">
            <span class="text-gray-600 dark:text-gray-400 truncate">{{ item.category }}</span>
            <UBadge :color="getCategoryColor(item.category)" variant="soft" size="sm">
              {{ item.count }}
            </UBadge>
          </div>
        </div>
        <div v-else class="text-sm text-gray-400 dark:text-gray-600 italic">
          No categories yet
        </div>
      </UCard>

      <!-- Closed Work Orders -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Recently Closed</h3>
        </template>
        <div v-if="closedSummary.length > 0" class="space-y-2 text-sm">
          <div v-for="item in closedSummary" :key="item.month" class="flex items-center justify-between">
            <span class="text-gray-600 dark:text-gray-400">{{ item.month }}</span>
            <div class="text-right">
              <div class="font-semibold">{{ item.total_orders }}</div>
              <div class="text-xs text-gray-400 dark:text-gray-600">
                Avg: {{ item.average_close_duration }}d
              </div>
            </div>
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
  </div>
</template>
