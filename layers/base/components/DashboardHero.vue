<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSupabaseUser, usePropertyState, useDashboardWidgets, useDashboardData } from '#imports'

const user = useSupabaseUser()
const { userContext } = usePropertyState()

const { showWidgets } = useDashboardWidgets()

const {
  activeProperty,
  latestRun,
  availabilityStats,
  delinquencyStats,
  alertsStats,
  workOrdersStats,
  renewalsStats,
  inventoryStats,
  makeReadyStats,
  fetchLatestRun,
  fetchAvailabilityStats,
  fetchDelinquencyStats,
  fetchAlertsStats,
  fetchWorkOrdersStats,
  fetchRenewalsStats,
  fetchInventoryStats,
  fetchMakeReadyStats,
} = useDashboardData()

// ── Identity ──────────────────────────────────────────────────────────────────
const profile    = computed(() => userContext.value?.profile as any)
const department = computed(() => profile.value?.department || '')
const isSuperAdmin = computed(() => !!userContext.value?.access?.is_super_admin)

const displayName = computed(() => {
  const p = profile.value
  if (p?.first_name || p?.last_name) return `${p?.first_name || ''} ${p?.last_name || ''}`.trim()
  if (p?.full_name) return p.full_name
  const meta = user.value?.user_metadata || {}
  return meta.full_name || meta.name || user.value?.email?.split('@')[0] || 'Guest'
})

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening'
})

// Roles: Asset > RPM > Owner > Manager > Staff (highest wins across all properties)
const highestRole = computed(() => {
  if (isSuperAdmin.value) return 'Super Admin'
  const roles = Object.values(userContext.value?.access?.property_roles || {}) as string[]
  if (roles.some(r => r === 'Asset'))   return 'Asset'
  if (roles.some(r => r === 'RPM'))     return 'RPM'
  if (roles.some(r => r === 'Owner'))   return 'Owner'
  if (roles.some(r => r === 'Manager')) return 'Manager'
  if (roles.some(r => r === 'Staff'))   return 'Staff'
  return 'Viewer'
})

// Show all three dept groups:
// - Super Admin always
// - Role = Asset or RPM (portfolio-level oversight)
// - Dept = Management + Role = Manager (property management leadership)
const showAllGroups = computed(() =>
  isSuperAdmin.value ||
  ['Asset', 'RPM'].includes(highestRole.value) ||
  (department.value === 'Management' && highestRole.value === 'Manager')
)

// ── Summary Metrics ───────────────────────────────────────────────────────────
interface MetricLine {
  icon: string
  label: string
  value: string
  alert: boolean   // true → bold white text to draw attention
}

const maintenanceLines = computed((): MetricLine[] => {
  const wo  = workOrdersStats.value
  const mr  = makeReadyStats.value
  const inv = inventoryStats.value
  return [
    {
      icon: 'i-heroicons-wrench-screwdriver',
      label: 'Work Orders',
      value: wo
        ? `${wo.totalOpen} open${wo.overdue ? ` · ${wo.overdue} overdue` : ''}`
        : '—',
      alert: !!wo?.overdue,
    },
    {
      icon: 'i-heroicons-home-modern',
      label: 'MakeReady',
      value: mr != null
        ? mr.count > 0 ? `${mr.count} overdue` : 'All on schedule'
        : '—',
      alert: !!(mr?.count > 0),
    },
    {
      icon: 'i-heroicons-cpu-chip',
      label: 'Inventory',
      value: inv
        ? inv.atRisk > 0 ? `${inv.atRisk} at risk · ${inv.healthy} healthy` : `All ${inv.total} healthy`
        : '—',
      alert: !!(inv?.atRisk > 0),
    },
  ]
})

const leasingLines = computed((): MetricLine[] => {
  const av  = availabilityStats.value
  const run = latestRun.value
  // Per-property solver summary for new leases & notices this upload cycle
  const ps  = (run?.summary as any)?.[activeProperty.value] as any
  return [
    {
      icon: 'i-heroicons-building-office-2',
      label: 'Available',
      value: String(av?.totalAvailable ?? 0),
      alert: false,
    },
    {
      icon: 'i-heroicons-user-plus',
      label: 'Applied',
      value: String(av?.applicants ?? 0),
      alert: false,
    },
    {
      icon: 'i-heroicons-document-check',
      label: 'New Leases',
      value: String(ps?.leasesRenewed ?? 0),
      alert: false,
    },
    {
      icon: 'i-heroicons-megaphone',
      label: 'On Notice',
      value: String(av?.notice ?? 0),
      alert: !!(av?.notice > 0),
    },
  ]
})

const managementLines = computed((): MetricLine[] => {
  const ren = renewalsStats.value
  const del = delinquencyStats.value
  const al  = alertsStats.value
  const wo  = workOrdersStats.value
  return [
    {
      icon: 'i-heroicons-arrow-path',
      label: 'Renewals',
      value: ren
        ? `${ren.pending} pending · ${ren.accepted} signed`
        : '—',
      alert: !!(ren?.pending > 0),
    },
    {
      icon: 'i-heroicons-banknotes',
      label: 'Delinquencies',
      value: del
        ? del.resident_count > 0
          ? `${del.resident_count} residents · $${Number(del.total_unpaid_sum || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          : 'None outstanding'
        : '—',
      alert: !!(del?.resident_count > 0),
    },
    {
      icon: 'i-heroicons-chart-bar',
      label: 'Operations',
      value: `${al?.totalActive ?? '—'} alerts · ${wo?.totalOpen ?? '—'} WO open`,
      alert: !!(al?.overdue > 0 || wo?.overdue > 0),
    },
  ]
})

const summaryGroups = computed(() => {
  if (showAllGroups.value) {
    return [
      { label: 'Maintenance', lines: maintenanceLines.value },
      { label: 'Leasing',     lines: leasingLines.value },
      { label: 'Management',  lines: managementLines.value },
    ]
  }
  const dept = department.value
  if (dept === 'Maintenance') return [{ label: '', lines: maintenanceLines.value }]
  if (dept === 'Leasing')     return [{ label: '', lines: leasingLines.value }]
  if (dept === 'Management')  return [{ label: '', lines: managementLines.value }]
  // Fallback — show leasing summary as safest default
  return [{ label: '', lines: leasingLines.value }]
})

// ── Right Card: Last Sync ─────────────────────────────────────────────────────
const syncCard = computed(() => {
  const run = latestRun.value
  if (!run) return {
    icon: 'i-heroicons-clock',
    bgClass: 'bg-gray-500',
    title: 'No Sync Yet',
    sub: 'Run the Solver to populate data',
  }
  const d = new Date(run.upload_date || run.created_at)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const dateStr = isToday
    ? `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  const propCount = run.properties_processed?.length || 0

  if (run.status === 'completed') return {
    icon: 'i-heroicons-check-circle',
    bgClass: 'bg-green-500',
    title: 'Data Current',
    sub: `${dateStr} · ${propCount} propert${propCount !== 1 ? 'ies' : 'y'}`,
  }
  if (run.status === 'failed') return {
    icon: 'i-heroicons-x-circle',
    bgClass: 'bg-red-500',
    title: 'Sync Failed',
    sub: dateStr,
  }
  return {
    icon: 'i-lucide-loader-circle',
    bgClass: 'bg-amber-500',
    title: 'Syncing…',
    sub: dateStr,
  }
})


onMounted(() => {
  fetchLatestRun()
  fetchAvailabilityStats()
  fetchDelinquencyStats()
  fetchAlertsStats()
  fetchWorkOrdersStats()
  fetchRenewalsStats()
  fetchInventoryStats()
  fetchMakeReadyStats()
})
</script>

<template>
  <div class="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-8 border border-white/20 shadow-2xl">
    <!-- Animated Mesh Background -->
    <div class="absolute inset-0 -z-10 animate-mesh bg-gradient-to-br from-primary-600/30 via-purple-600/20 to-blue-600/30 blur-3xl" />
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px] animate-pulse" />
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse-slow" />

    <div class="relative z-10 flex flex-col xl:flex-row xl:items-start justify-between gap-8">

      <!-- LEFT: Identity + Dynamic Summary -->
      <div class="space-y-4 flex-grow">

        <!-- Greeting (Client-only to avoid time/user hydration mismatch) -->
        <ClientOnly>
          <h1 class="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm leading-tight">
            {{ greeting }},
            <span class="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">
              {{ displayName }}
            </span>
          </h1>
          <template #fallback>
            <div class="h-[60px] md:h-[120px]" /> <!-- Spacer to prevent layout shift -->
          </template>
        </ClientOnly>

        <!-- Department + Role badges -->
        <div class="flex items-center gap-2 flex-wrap">
          <UBadge v-if="department" color="primary" variant="subtle" size="sm" class="font-bold">
            <UIcon name="i-heroicons-building-office" class="w-3 h-3 mr-1" />
            {{ department }}
          </UBadge>
          <UBadge color="neutral" variant="outline" size="sm" class="font-bold">
            {{ highestRole }}
          </UBadge>
        </div>

        <!-- Dynamic Summary -->
        <div class="pt-2 space-y-4 max-w-4xl">

          <!-- ADMIN / OPERATIONS: compact 3-group table view -->
          <template v-if="showAllGroups">
            <div
              v-for="group in summaryGroups"
              :key="group.label"
              class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4"
            >
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 w-24 shrink-0 pt-1">
                {{ group.label }}
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                <div
                  v-for="line in group.lines"
                  :key="line.label"
                  class="flex items-center gap-2 text-xs"
                >
                  <UIcon :name="line.icon" class="w-4 h-4 text-gray-400 shrink-0" />
                  <span :class="line.alert ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'">
                    {{ line.value }}
                  </span>
                </div>
              </div>
            </div>
          </template>

          <!-- SINGLE DEPARTMENT: 3 metric rows (enhanced mobile layout) -->
          <template v-else>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="line in summaryGroups[0]?.lines"
                :key="line.label"
                class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
              >
                <div :class="['p-2 rounded-xl shadow-sm', line.alert ? 'bg-orange-500/10' : 'bg-gray-500/5']">
                  <UIcon
                    :name="line.icon"
                    :class="['w-5 h-5 shrink-0', line.alert ? 'text-orange-500' : 'text-gray-400']"
                  />
                </div>
                <div>
                  <div class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ line.label }}</div>
                  <div :class="['text-sm font-bold', line.alert ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300']">
                    {{ line.value }}
                  </div>
                </div>
              </div>
            </div>
          </template>

        </div>
      </div>

      <!-- RIGHT: Sync Card + Widgets Toggle -->
      <div class="flex flex-col sm:flex-row xl:flex-col items-center xl:items-end gap-4 shrink-0 xl:self-start w-full xl:w-auto">
        <!-- Sync Card -->
        <div class="flex items-center gap-4 bg-white/40 dark:bg-black/40 backdrop-blur-xl px-5 py-4 rounded-2xl border border-white/20 shadow-inner w-full sm:flex-1 xl:w-auto">
          <div :class="['p-3 rounded-xl shadow-lg', syncCard.bgClass]">
            <UIcon :name="syncCard.icon" class="w-6 h-6 text-white" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ syncCard.title }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ syncCard.sub }}</div>
          </div>
        </div>

        <!-- View Toggle: Monitors ↔ Widgets -->
        <UButton
          size="lg"
          :icon="showWidgets ? 'i-heroicons-squares-2x2' : 'i-heroicons-puzzle-piece'"
          :label="showWidgets ? 'Show Monitors' : 'Show Widgets'"
          color="primary"
          variant="solid"
          class="w-full sm:w-auto xl:w-full justify-center shadow-lg shadow-primary-500/40 font-black uppercase tracking-wider text-xs h-14 xl:h-12"
          @click="showWidgets = !showWidgets"
        />
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes mesh {
  0%   { transform: scale(1)   translate(0px,   0px);  }
  33%  { transform: scale(1.1) translate(20px, -30px); }
  66%  { transform: scale(0.9) translate(-20px, 20px); }
  100% { transform: scale(1)   translate(0px,   0px);  }
}
.animate-mesh { animation: mesh 15s ease-in-out infinite; }

@keyframes pulse-slow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
.animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
</style>
