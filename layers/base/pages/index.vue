<script setup lang="ts">
import Sortable from 'sortablejs'

// Import widgets
import UploadsWidget       from '../components/widgets/UploadsWidget.vue'
import AvailabilityWidget  from '../components/widgets/AvailabilityWidget.vue'
import AlertsWidget        from '../components/widgets/AlertsWidget.vue'
import RenewalsWidget      from '../components/widgets/RenewalsWidget.vue'
import WorkOrdersWidget    from '../components/widgets/WorkOrdersWidget.vue'
import DelinquenciesWidget from '../components/widgets/DelinquenciesWidget.vue'
import InventoryWidget     from '../components/widgets/InventoryWidget.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const { userContext } = usePropertyState()

// Last upload time for subtitle
const latestRun = ref<any>(null)
async function fetchLatestRun() {
  const { data } = await supabase
    .from('solver_runs')
    .select('upload_date, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  latestRun.value = data
}

const uploadTimeLabel = computed(() => {
  if (!latestRun.value) return 'Daily portfolio metrics'
  const d = new Date(latestRun.value.upload_date || latestRun.value.created_at)
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' })
  return `Daily portfolio metrics · as of ${timeStr} (PST) ${dateStr}`
})

// --- Widget Registry ---
// `departments`: which departments see this widget by default (recommended).
// All widgets are visible to everyone — departments only control the smart default.
const allWidgets = [
  {
    id: 'uploads',
    title: "Today's Uploads",
    icon: 'i-heroicons-cloud-arrow-up',
    component: markRaw(UploadsWidget),
    departments: ['Admin', 'Operations'],
  },
  {
    id: 'availability',
    title: 'Availability',
    icon: 'i-heroicons-building-office-2',
    component: markRaw(AvailabilityWidget),
    departments: ['Admin', 'Operations', 'Leasing'],
  },
  {
    id: 'alerts',
    title: 'Alerts Summary',
    icon: 'i-heroicons-bell-alert',
    iconColor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    component: markRaw(AlertsWidget),
    departments: ['Admin', 'Operations', 'Leasing', 'Maintenance'],
  },
  {
    id: 'renewals',
    title: 'Renewals',
    icon: 'i-heroicons-arrow-path',
    component: markRaw(RenewalsWidget),
    departments: ['Admin', 'Operations', 'Leasing', 'Accounting'],
  },
  {
    id: 'work_orders',
    title: 'Work Orders',
    icon: 'i-heroicons-wrench-screwdriver',
    component: markRaw(WorkOrdersWidget),
    departments: ['Admin', 'Operations', 'Maintenance'],
  },
  {
    id: 'delinquencies',
    title: 'Delinquencies',
    icon: 'i-heroicons-banknotes',
    component: markRaw(DelinquenciesWidget),
    departments: ['Admin', 'Operations', 'Accounting', 'Legal'],
  },
  {
    id: 'inventory',
    title: 'Inventory Health',
    icon: 'i-heroicons-cpu-chip',
    component: markRaw(InventoryWidget),
    departments: ['Admin', 'Operations', 'Maintenance'],
  },
]

// --- User Role Helpers ---
const department = computed(() => userContext.value?.profile?.department || '')

const isSuperAdmin = computed(() => !!userContext.value?.access?.is_super_admin)

// True if user is admin or manager on any property
const isManager = computed(() => {
  if (isSuperAdmin.value) return true
  const roles = Object.values(userContext.value?.access?.property_roles || {}) as string[]
  return roles.some(r => ['Asset', 'RPM', 'Owner', 'admin', 'manager', 'Manager'].includes(r))
})

// IDs of widgets recommended for this user based on department + role
const recommendedIds = computed((): Set<string> => {
  // Admins and managers get everything
  if (isSuperAdmin.value || isManager.value) {
    return new Set(allWidgets.map(w => w.id))
  }
  const dept = department.value
  if (!dept) {
    // No department set — safe universal defaults
    return new Set(['availability', 'alerts'])
  }
  return new Set(
    allWidgets.filter(w => w.departments.includes(dept)).map(w => w.id)
  )
})

const isRecommended = (id: string) => recommendedIds.value.has(id)

// Admin-view: sees the admin-only section of the context helper
const isAdminView = computed(() => {
  if (isSuperAdmin.value) return true
  const roles = Object.values(userContext.value?.access?.property_roles || {}) as string[]
  return roles.some(r => ['Asset', 'RPM'].includes(r))
})

// --- Settings ---
interface WidgetSettings {
  order: string[]
  visibility: Record<string, boolean>
}

// User-scoped key so each user gets independent dashboard settings
const storageKey = computed(() =>
  `ee-manager-dashboard-${userContext.value?.id || 'default'}`
)

const widgetSettings  = ref<WidgetSettings>({ order: [], visibility: {} })
const widgetGrid      = ref<HTMLElement | null>(null)
const isConfigModalOpen = ref(false)

// Shared with DashboardHero via composable
const { showWidgets } = useDashboardWidgets()

function buildRecommendedSettings(): WidgetSettings {
  const recommended = recommendedIds.value
  return {
    order: allWidgets.map(w => w.id),
    visibility: Object.fromEntries(allWidgets.map(w => [w.id, recommended.has(w.id)])),
  }
}

function loadSettings() {
  const saved = localStorage.getItem(storageKey.value)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as WidgetSettings
      const allIds = new Set(allWidgets.map(w => w.id))
      // Preserve saved order; append any newly-added widgets at the end
      const validOrder  = (parsed.order || []).filter((id: string) => allIds.has(id))
      const missingIds  = Array.from(allIds).filter(id => !validOrder.includes(id))
      widgetSettings.value.order = [...validOrder, ...missingIds]
      // For any new widgets not yet in saved prefs, default to recommended
      widgetSettings.value.visibility = {
        ...buildRecommendedSettings().visibility,
        ...(parsed.visibility || {}),
      }
    } catch {
      widgetSettings.value = buildRecommendedSettings()
    }
  } else {
    // First visit — use role-based recommended defaults
    widgetSettings.value = buildRecommendedSettings()
  }
}

function saveSettings() {
  localStorage.setItem(storageKey.value, JSON.stringify(widgetSettings.value))
}

const toggleVisibility = (id: string) => {
  widgetSettings.value.visibility[id] = !widgetSettings.value.visibility[id]
  saveSettings()
}

const resetToRecommended = () => {
  widgetSettings.value = buildRecommendedSettings()
  saveSettings()
}

const getWidgetById = (id: string) => allWidgets.find(w => w.id === id)

const anyVisible = computed(() =>
  Object.values(widgetSettings.value.visibility).some(v => v)
)

onMounted(() => {
  showWidgets.value = false  // always start on Monitors when landing on dashboard
  loadSettings()
  fetchLatestRun()

  if (widgetGrid.value) {
    new Sortable(widgetGrid.value, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'opacity-30',
      chosenClass: 'scale-[1.02]',
      dragClass: 'shadow-2xl',
      onEnd: (evt) => {
        const newOrder = Array.from(evt.to.children)
          .map(el => (el as HTMLElement).dataset.widgetId)
          .filter(Boolean) as string[]
        widgetSettings.value.order = newOrder
        saveSettings()
      },
    })
  }
})

// Reload settings if userContext hydrates after mount (slow SSR fallback)
watch(() => userContext.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    loadSettings()
  }
})

</script>

<template>
  <div class="h-full bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
    <div class="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">

      <!-- Hero Greeting -->
      <DashboardHero />

      <!-- Monitors Section (default view) -->
      <div v-show="!showWidgets" class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-squares-2x2" class="text-primary-700 dark:text-primary-400" />
            Monitors
          </h2>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{{ uploadTimeLabel }}</p>
        </div>

        <UButton
          icon="i-heroicons-cog-6-tooth"
          color="white"
          variant="ghost"
          class="hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
          @click="isConfigModalOpen = true"
        >
          Configure
        </UButton>
      </div>

      <!-- Monitors Grid -->
      <div v-show="!showWidgets" ref="widgetGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <template v-for="widgetId in widgetSettings.order" :key="widgetId">
          <div
            v-if="widgetSettings.visibility[widgetId]"
            :data-widget-id="widgetId"
            class="h-full"
          >
            <SummaryWidget
              :title="getWidgetById(widgetId)?.title || ''"
              :icon="getWidgetById(widgetId)?.icon"
              :icon-color="getWidgetById(widgetId)?.iconColor"
            >
              <component :is="getWidgetById(widgetId)?.component" />
            </SummaryWidget>
          </div>
        </template>
      </div>

      <!-- Monitors Empty State -->
      <div
        v-if="!showWidgets && !anyVisible"
        class="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl"
      >
        <UIcon name="i-heroicons-squares-2x2" class="text-6xl text-gray-300 mb-4" />
        <h3 class="text-xl font-bold text-gray-500">Your monitors are empty</h3>
        <p class="text-sm text-gray-400 mt-2">Click "Configure" to add monitors back.</p>
        <UButton color="primary" variant="soft" class="mt-6" @click="isConfigModalOpen = true">
          Add Monitors
        </UButton>
      </div>

      <!-- Widgets Section (swapped in via toggle) -->
      <WidgetsDashboard v-if="showWidgets" />

    </div>

    <!-- Context Helper (Client-only to avoid positioning hydration mismatch) -->
    <ClientOnly>
      <ContextHelper
        title="Dashboard"
        description="Personalized portfolio overview"
      >
        <div class="space-y-5 text-sm leading-relaxed">

          <!-- General: all users -->
          <section>
            <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Greeting Block</h3>
            <p>The top banner shows a live summary tailored to your department and role. Metrics refresh each time you switch properties or the page loads.</p>
            <ul class="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-400">
              <li><strong>Maintenance</strong> — Work Orders open/overdue, MakeReady overdue, Inventory health</li>
              <li><strong>Leasing</strong> — Last upload date, Availability pipeline, Active alerts</li>
              <li><strong>Management</strong> — Renewals pending/signed, Delinquencies, Operations snapshot</li>
            </ul>
          </section>

          <section>
            <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Monitors</h3>
            <p>Your personal monitor board. Click <strong>Configure</strong> to toggle monitors on or off and reorder them by dragging. Settings are saved per user so each person gets their own layout.</p>
            <p class="mt-1 text-gray-500">The <strong>For you</strong> badge marks monitors recommended for your department. You can enable any monitor regardless of department.</p>
            <p class="mt-1 text-gray-500">Use the <strong>Show Widgets</strong> button in the greeting banner to swap to your personal productivity widgets (clock, notes, calculator, etc.).</p>
          </section>

          <section>
            <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Last Sync Card</h3>
            <p>The card on the right of the greeting shows when Yardi data was last processed by the Solver. All metrics on this page reflect that snapshot — not real-time Yardi data.</p>
            <ul class="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-400">
              <li><span class="text-green-600 font-bold">Data Current</span> — Last run completed successfully</li>
              <li><span class="text-amber-500 font-bold">Syncing…</span> — Solver is currently running</li>
              <li><span class="text-red-600 font-bold">Sync Failed</span> — Last run encountered an error</li>
            </ul>
          </section>

          <!-- Admin-only section -->
          <template v-if="isAdminView">
            <div class="border-t border-gray-200 dark:border-gray-700 pt-5">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-primary-500" />
                <span class="text-xs font-black uppercase tracking-widest text-primary-500">Admin Reference</span>
              </div>

              <section class="mb-4">
                <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Greeting Summary — Access Matrix</h3>
                <p class="text-gray-500 mb-3">Who sees all three department summaries vs. their own department only:</p>
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="bg-gray-100 dark:bg-gray-800">
                      <th class="text-left p-2 rounded-tl font-black uppercase tracking-wider text-gray-500">Condition</th>
                      <th class="text-left p-2 rounded-tr font-black uppercase tracking-wider text-gray-500">Shows</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr>
                      <td class="p-2 font-medium">Super Admin</td>
                      <td class="p-2 text-primary-600 dark:text-primary-400 font-bold">All 3 groups</td>
                    </tr>
                    <tr>
                      <td class="p-2 font-medium">Role = Asset</td>
                      <td class="p-2 text-primary-600 dark:text-primary-400 font-bold">All 3 groups</td>
                    </tr>
                    <tr>
                      <td class="p-2 font-medium">Role = RPM</td>
                      <td class="p-2 text-primary-600 dark:text-primary-400 font-bold">All 3 groups</td>
                    </tr>
                    <tr>
                      <td class="p-2 font-medium">Dept = Management + Role = Manager</td>
                      <td class="p-2 text-primary-600 dark:text-primary-400 font-bold">All 3 groups</td>
                    </tr>
                    <tr>
                      <td class="p-2 font-medium">Dept = Leasing (any role)</td>
                      <td class="p-2 text-gray-600 dark:text-gray-400">Leasing summary only</td>
                    </tr>
                    <tr>
                      <td class="p-2 font-medium">Dept = Maintenance (any role)</td>
                      <td class="p-2 text-gray-600 dark:text-gray-400">Maintenance summary only</td>
                    </tr>
                    <tr>
                      <td class="p-2 font-medium">Dept = Management + Role = Owner/Staff</td>
                      <td class="p-2 text-gray-600 dark:text-gray-400">Management summary only</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Role Hierarchy</h3>
                <p class="text-gray-500 mb-2">When a user has roles across multiple properties, the highest role wins:</p>
                <div class="flex items-center gap-2 flex-wrap text-xs font-bold">
                  <UBadge color="primary" variant="solid" size="sm">Asset</UBadge>
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-400" />
                  <UBadge color="primary" variant="soft" size="sm">RPM</UBadge>
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-400" />
                  <UBadge color="neutral" variant="soft" size="sm">Owner</UBadge>
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-400" />
                  <UBadge color="neutral" variant="soft" size="sm">Manager</UBadge>
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-400" />
                  <UBadge color="neutral" variant="outline" size="sm">Staff</UBadge>
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-400" />
                  <UBadge color="neutral" variant="outline" size="sm">Viewer</UBadge>
                </div>
              </section>
            </div>
          </template>

        </div>
      </ContextHelper>
    </ClientOnly>

    <!-- Configuration Modal -->
    <SimpleModal v-model="isConfigModalOpen" title="Configure Dashboard" width="max-w-xl">
      <div class="p-6 space-y-5">

        <!-- Department context -->
        <div class="flex items-center justify-between p-3 bg-primary-500/5 border border-primary-500/10 rounded-xl">
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <UIcon name="i-heroicons-user-circle" class="w-4 h-4 text-primary-500" />
            <span v-if="department">
              Showing recommendations for
              <strong class="text-gray-900 dark:text-white">{{ department }}</strong>
            </span>
            <span v-else class="italic">No department set on your profile</span>
          </div>
          <UButton
            size="xs"
            color="primary"
            variant="ghost"
            icon="i-heroicons-arrow-path"
            @click="resetToRecommended"
          >
            Reset
          </UButton>
        </div>

        <!-- Widget list -->
        <div class="divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
          <div
            v-for="widget in allWidgets"
            :key="widget.id"
            class="flex items-center justify-between py-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div :class="['p-2 rounded-lg shrink-0', widget.iconColor || 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300']">
                <UIcon :name="widget.icon" class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ widget.title }}</span>
                <UBadge
                  v-if="isRecommended(widget.id)"
                  size="xs"
                  color="primary"
                  variant="subtle"
                  class="ml-2 font-bold"
                >
                  For you
                </UBadge>
              </div>
            </div>
            <USwitch
              :model-value="widgetSettings.visibility[widget.id]"
              class="shrink-0 ml-4"
              @update:model-value="toggleVisibility(widget.id)"
            />
          </div>
        </div>

        <UButton block color="primary" size="lg" @click="isConfigModalOpen = false">
          Done
        </UButton>
      </div>
    </SimpleModal>
  </div>
</template>

<style scoped>
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
</style>
