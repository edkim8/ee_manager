<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { definePageMeta, usePropertyState, useSupabaseClient, useAsyncData } from '#imports'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns } from '../../../../../configs/table-configs/alerts-complete.generated'
import { filterColumnsByAccess } from '../../../../table/composables/useTableColumns'

definePageMeta({
  layout: 'dashboard'
})

const { activeProperty, userContext } = usePropertyState()
const supabase = useSupabaseClient()

// ============================================================
// DATA FETCHING
// ============================================================
const { data: allAlerts, status: alertsStatus, error: alertsError, refresh } = await useAsyncData(
  'unified-alerts',
  async () => {
    if (!activeProperty.value) return []

    const { data, error } = await supabase
      .from('view_table_alerts_unified')
      .select('*')
      .eq('property_code', activeProperty.value)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Unified alerts fetch error:', error)
      throw error
    }

    console.log('Unified alerts fetched:', data?.length || 0)
    return data || []
  },
  {
    watch: [activeProperty]
  }
)

// ============================================================
// TAB FILTERING
// ============================================================
const activeTab = ref('current')

const tabItems = [
  { value: 'current', label: 'Current' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'closed', label: 'Closed' }
]

// Filter alerts by tab
const currentAlerts = computed(() => {
  return allAlerts.value?.filter((a: any) => a.is_active && !a.is_overdue) || []
})

const overdueAlerts = computed(() => {
  return allAlerts.value?.filter((a: any) => a.is_active && a.is_overdue) || []
})

const closedAlerts = computed(() => {
  return allAlerts.value?.filter((a: any) => !a.is_active) || []
})

const displayedAlerts = computed(() => {
  switch (activeTab.value) {
    case 'current':
      return currentAlerts.value
    case 'overdue':
      return overdueAlerts.value
    case 'closed':
      return closedAlerts.value
    default:
      return []
  }
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

// ============================================================
// ACTIONS: RESOLVE & DEACTIVATE
// ============================================================
const resolvingIds = ref<Set<string>>(new Set())

async function handleResolve(alert: any) {
  if (alert.source !== 'App') return

  resolvingIds.value.add(alert.id)

  try {
    const { error } = await supabase
      .from('unit_flags')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', alert.id)

    if (error) throw error

    console.log('Alert resolved:', alert.id)
    await refresh()
  } catch (err) {
    console.error('Error resolving alert:', err)
    alert('Failed to resolve alert')
  } finally {
    resolvingIds.value.delete(alert.id)
  }
}

async function handleDeactivate(alert: any) {
  if (alert.source !== 'Yardi') return

  resolvingIds.value.add(alert.id)

  try {
    const { error } = await supabase
      .from('alerts')
      .update({ is_active: false })
      .eq('id', alert.id)

    if (error) throw error

    console.log('Alert deactivated:', alert.id)
    await refresh()
  } catch (err) {
    console.error('Error deactivating alert:', err)
    alert('Failed to deactivate alert')
  } finally {
    resolvingIds.value.delete(alert.id)
  }
}

// ============================================================
// UTILITIES
// ============================================================
function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'error':
      return 'red'
    case 'warning':
      return 'orange'
    case 'info':
      return 'blue'
    default:
      return 'gray'
  }
}

function getSourceColor(source: string): string {
  return source === 'Yardi' ? 'purple' : 'green'
}

const isLoading = computed(() => alertsStatus.value === 'pending')
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Alerts Dashboard</h1>
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
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400 font-medium">Current</div>
            <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {{ currentAlerts.length }}
            </div>
          </div>
          <UIcon name="i-heroicons-bell" class="w-12 h-12 text-blue-200 dark:text-blue-800" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400 font-medium">Overdue</div>
            <div class="text-3xl font-bold text-red-600 dark:text-red-400">
              {{ overdueAlerts.length }}
            </div>
          </div>
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-200 dark:text-red-800" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400 font-medium">Closed</div>
            <div class="text-3xl font-bold text-green-600 dark:text-green-400">
              {{ closedAlerts.length }}
            </div>
          </div>
          <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-200 dark:text-green-800" />
        </div>
      </UCard>
    </div>

    <!-- Error State -->
    <UAlert
      v-if="alertsError"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="soft"
      title="Error loading alerts"
      :description="alertsError.message"
      class="mb-6"
    />

    <!-- Alerts Table with Tabs -->
    <UCard>
      <SimpleTabs v-model="activeTab" :items="tabItems">
        <!-- Current Tab -->
        <template #current>
          <GenericDataTable
            :data="currentAlerts"
            :columns="columns"
            :loading="isLoading"
            row-key="id"
            striped
            enable-pagination
            :page-size="25"
            empty-message="No current alerts"
          >
            <template #cell-source="{ value }">
              <UBadge
                :color="getSourceColor(value)"
                variant="soft"
                size="sm"
                class="font-semibold"
              >
                {{ value }}
              </UBadge>
            </template>

            <template #cell-severity="{ value }">
              <UBadge
                :color="getSeverityColor(value)"
                variant="soft"
                size="sm"
                class="font-semibold uppercase"
              >
                {{ value }}
              </UBadge>
            </template>

            <template #cell-unit_name="{ value, row }">
              <CellsLinkCell
                v-if="value && row.unit_id"
                :value="value"
                :to="`/assets/units/${row.unit_id}`"
              />
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-building_name="{ value }">
              <span v-if="value" class="text-sm">{{ value }}</span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-title="{ value }">
              <span class="font-medium text-sm">{{ value }}</span>
            </template>

            <template #cell-message="{ value }">
              <span v-if="value" class="text-xs text-gray-600 dark:text-gray-400">
                {{ value }}
              </span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-resident="{ value }">
              <span v-if="value" class="text-sm">{{ value }}</span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-days_open="{ value }">
              <UBadge
                v-if="value > 0"
                :color="value > 5 ? 'red' : value > 3 ? 'orange' : 'gray'"
                variant="soft"
                size="sm"
              >
                {{ value }}
              </UBadge>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-created_at="{ value }">
              <CellsDateCell :value="value" format="short" />
            </template>

            <template #cell-actions="{ row }">
              <UButton
                v-if="row.source === 'App'"
                icon="i-heroicons-check"
                color="primary"
                variant="soft"
                size="xs"
                label="Resolve"
                :loading="resolvingIds.has(row.id)"
                @click="handleResolve(row)"
              />
              <UButton
                v-else-if="row.source === 'Yardi'"
                icon="i-heroicons-x-mark"
                color="neutral"
                variant="soft"
                size="xs"
                label="Deactivate"
                :loading="resolvingIds.has(row.id)"
                @click="handleDeactivate(row)"
              />
            </template>
          </GenericDataTable>
        </template>

        <!-- Overdue Tab -->
        <template #overdue>
          <GenericDataTable
            :data="overdueAlerts"
            :columns="columns"
            :loading="isLoading"
            row-key="id"
            striped
            enable-pagination
            :page-size="25"
            empty-message="No overdue alerts"
          >
            <template #cell-source="{ value }">
              <UBadge
                :color="getSourceColor(value)"
                variant="soft"
                size="sm"
                class="font-semibold"
              >
                {{ value }}
              </UBadge>
            </template>

            <template #cell-severity="{ value }">
              <UBadge
                :color="getSeverityColor(value)"
                variant="soft"
                size="sm"
                class="font-semibold uppercase"
              >
                {{ value }}
              </UBadge>
            </template>

            <template #cell-unit_name="{ value, row }">
              <CellsLinkCell
                v-if="value && row.unit_id"
                :value="value"
                :to="`/assets/units/${row.unit_id}`"
              />
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-building_name="{ value }">
              <span v-if="value" class="text-sm">{{ value }}</span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-title="{ value }">
              <span class="font-medium text-sm">{{ value }}</span>
            </template>

            <template #cell-message="{ value }">
              <span v-if="value" class="text-xs text-gray-600 dark:text-gray-400">
                {{ value }}
              </span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-resident="{ value }">
              <span v-if="value" class="text-sm">{{ value }}</span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-days_open="{ value }">
              <UBadge
                v-if="value > 0"
                color="red"
                variant="solid"
                size="sm"
                class="font-bold"
              >
                {{ value }}
              </UBadge>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-created_at="{ value }">
              <CellsDateCell :value="value" format="short" />
            </template>

            <template #cell-actions="{ row }">
              <UButton
                v-if="row.source === 'App'"
                icon="i-heroicons-check"
                color="primary"
                variant="soft"
                size="xs"
                label="Resolve"
                :loading="resolvingIds.has(row.id)"
                @click="handleResolve(row)"
              />
              <UButton
                v-else-if="row.source === 'Yardi'"
                icon="i-heroicons-x-mark"
                color="neutral"
                variant="soft"
                size="xs"
                label="Deactivate"
                :loading="resolvingIds.has(row.id)"
                @click="handleDeactivate(row)"
              />
            </template>
          </GenericDataTable>
        </template>

        <!-- Closed Tab -->
        <template #closed>
          <GenericDataTable
            :data="closedAlerts"
            :columns="columns.filter(c => c.key !== 'actions')"
            :loading="isLoading"
            row-key="id"
            striped
            enable-pagination
            :page-size="25"
            empty-message="No closed alerts"
          >
            <template #cell-source="{ value }">
              <UBadge
                :color="getSourceColor(value)"
                variant="soft"
                size="sm"
                class="font-semibold"
              >
                {{ value }}
              </UBadge>
            </template>

            <template #cell-severity="{ value }">
              <UBadge
                :color="getSeverityColor(value)"
                variant="soft"
                size="sm"
                class="font-semibold uppercase"
              >
                {{ value }}
              </UBadge>
            </template>

            <template #cell-unit_name="{ value, row }">
              <CellsLinkCell
                v-if="value && row.unit_id"
                :value="value"
                :to="`/assets/units/${row.unit_id}`"
              />
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-building_name="{ value }">
              <span v-if="value" class="text-sm">{{ value }}</span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-title="{ value }">
              <span class="font-medium text-sm text-gray-500 dark:text-gray-400">{{ value }}</span>
            </template>

            <template #cell-message="{ value }">
              <span v-if="value" class="text-xs text-gray-600 dark:text-gray-400">
                {{ value }}
              </span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-resident="{ value }">
              <span v-if="value" class="text-sm">{{ value }}</span>
              <span v-else class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-days_open="{ value }">
              <span class="text-gray-400 dark:text-gray-600">-</span>
            </template>

            <template #cell-created_at="{ value }">
              <CellsDateCell :value="value" format="short" />
            </template>
          </GenericDataTable>
        </template>
      </SimpleTabs>
    </UCard>

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Alerts Dashboard" 
      description="System Health & Compliance Monitoring"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Alert Sources</h3>
          <p>
            Alerts are generated from two primary sources, each requiring a different management protocol:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong class="text-green-600">App Alerts:</strong> Internal signals typically related to unit flags or maintenance issues. These can be <strong>Resolved</strong> directly in the dashboard.</li>
            <li><strong class="text-purple-600">Yardi Alerts:</strong> Automated compliance signals from the daily Yardi sync. These are <strong>Deactivated</strong> when the underlying data issue is addressed.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Severity & Priority</h3>
          <p>
            Dashboard items are color-coded by urgency:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong class="text-red-600 uppercase italic">Error:</strong> Critical compliance or system failures requiring immediate attention.</li>
            <li><strong class="text-orange-600 uppercase italic">Warning:</strong> Latency issues or data inconsistencies that may become errors if not addressed.</li>
            <li><strong class="text-blue-600 uppercase italic">Info:</strong> Status updates or non-critical activity notifications.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Overdue Tracking</h3>
          <p>
            The <strong>Overdue</strong> tab tracks alerts that have remained active beyond their expected resolution window.
          </p>
          <div class="mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800 text-xs text-red-800 dark:text-red-300">
            <strong>Key Metric:</strong> Overdue alerts represent a risk to property performance and resident satisfaction. Clearing these is a primary objective for the office staff.
          </div>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
