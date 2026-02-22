<script setup lang="ts">
import Sortable from 'sortablejs'

// Import widgets
import UploadsWidget from '../components/widgets/UploadsWidget.vue'
import AvailabilityWidget from '../components/widgets/AvailabilityWidget.vue'
import AlertsWidget from '../components/widgets/AlertsWidget.vue'
import RenewalsWidget from '../components/widgets/RenewalsWidget.vue'
import WorkOrdersWidget from '../components/widgets/WorkOrdersWidget.vue'
import DelinquenciesWidget from '../components/widgets/DelinquenciesWidget.vue'
import InventoryWidget from '../components/widgets/InventoryWidget.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const allWidgets = [
  { id: 'uploads', title: "Today's Uploads", icon: 'i-heroicons-cloud-arrow-up', component: markRaw(UploadsWidget) },
  { id: 'availability', title: 'Availability', icon: 'i-heroicons-building-office-2', component: markRaw(AvailabilityWidget) },
  { id: 'alerts', title: 'Alerts Summary', icon: 'i-heroicons-bell-alert', component: markRaw(AlertsWidget), iconColor: 'text-orange-500 bg-orange-500' },
  { id: 'renewals', title: 'Renewals', icon: 'i-heroicons-arrow-path', component: markRaw(RenewalsWidget) },
  { id: 'work_orders', title: 'Work Orders', icon: 'i-heroicons-wrench-screwdriver', component: markRaw(WorkOrdersWidget) },
  { id: 'delinquencies', title: 'Delinquencies', icon: 'i-heroicons-banknotes', component: markRaw(DelinquenciesWidget) },
  { id: 'inventory', title: 'Inventory Health', icon: 'i-heroicons-cpu-chip', component: markRaw(InventoryWidget) },
]

const SETTINGS_KEY = 'ee-manager-dashboard-prefs'

interface WidgetSettings {
  order: string[]
  visibility: Record<string, boolean>
}

const getDefaultSettings = (): WidgetSettings => {
  const allIds = allWidgets.map(w => w.id)
  const defaultVisibility = allIds.reduce((acc, id) => {
    acc[id] = true
    return acc
  }, {} as Record<string, boolean>)

  return {
    order: allIds,
    visibility: defaultVisibility
  }
}

const widgetSettings = ref<WidgetSettings>(getDefaultSettings())
const widgetGrid = ref<HTMLElement | null>(null)
const isConfigModalOpen = ref(false)

const getWidgetById = (id: string) => allWidgets.find(w => w.id === id)

onMounted(() => {
  // Load settings
  const saved = localStorage.getItem(SETTINGS_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as WidgetSettings
      const allCurrentIds = new Set(allWidgets.map(w => w.id))
      
      const validOrder = (parsed.order || []).filter(id => allCurrentIds.has(id))
      const missingIds = Array.from(allCurrentIds).filter(id => !validOrder.includes(id))
      
      widgetSettings.value.order = [...validOrder, ...missingIds]
      widgetSettings.value.visibility = {
        ...getDefaultSettings().visibility,
        ...(parsed.visibility || {})
      }
    } catch (e) {
      console.error('Failed to parse dashboard settings', e)
    }
  }

  // Initialize Sortable
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
      }
    })
  }
})

const saveSettings = () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(widgetSettings.value))
}

const toggleVisibility = (id: string) => {
  widgetSettings.value.visibility[id] = !widgetSettings.value.visibility[id]
  saveSettings()
}
</script>

<template>
  <div class="h-full bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
    <div class="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
      <!-- Hero Greeting -->
      <DashboardHero />

      <!-- Section Title & Actions -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-squares-2x2" class="text-primary-500" />
            Control Center
          </h2>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time portfolio metrics</p>
        </div>
        
        <div class="flex items-center gap-3">
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
      </div>

      <!-- Widget Grid -->
      <div ref="widgetGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <!-- Empty State -->
      <div v-if="!Object.values(widgetSettings.visibility).some(v => v)" class="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
        <UIcon name="i-heroicons-puzzle-piece" class="text-6xl text-gray-300 mb-4" />
        <h3 class="text-xl font-bold text-gray-500">Your dashboard is empty</h3>
        <p class="text-sm text-gray-400 mt-2">Click "Configure" to add widgets back.</p>
        <UButton color="primary" variant="soft" class="mt-6" @click="isConfigModalOpen = true">
          Add Widgets
        </UButton>
      </div>
    </div>

    <!-- Configuration Modal -->
    <SimpleModal v-model="isConfigModalOpen" title="Configure Dashboard" width="max-w-xl">
      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-500">Enable or disable widgets to personalize your view. Reorder them directly on the dashboard by dragging.</p>
        
        <div class="divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:divide-gray-800">
          <div v-for="widget in allWidgets" :key="widget.id" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <div :class="['p-2 rounded-lg opacity-20', widget.iconColor || 'bg-primary-500 text-primary-500']">
                <UIcon :name="widget.icon" />
              </div>
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ widget.title }}</span>
            </div>
            <USwitch
              :model-value="widgetSettings.visibility[widget.id]"
              @update:model-value="toggleVisibility(widget.id)"
            />
          </div>
        </div>
        
        <div class="pt-4">
          <UButton block color="primary" size="lg" @click="isConfigModalOpen = false">
            Save Changes
          </UButton>
        </div>
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
