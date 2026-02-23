<script setup lang="ts">
import Sortable from 'sortablejs'
import DigitalClockWidget    from './widgets/DigitalClockWidget.vue'
import CalendarWidget        from './widgets/CalendarWidget.vue'
import StickyNoteWidget      from './widgets/StickyNoteWidget.vue'
import CountdownTimerWidget  from './widgets/CountdownTimerWidget.vue'
import AmortizeRentWidget    from './widgets/AmortizeRentWidget.vue'

// Widget registry — `wide: true` → lg:col-span-2
const allWidgets = [
  {
    id: 'clock',
    title: 'Digital Clock',
    icon: 'i-heroicons-clock',
    component: markRaw(DigitalClockWidget),
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: 'i-heroicons-calendar-days',
    component: markRaw(CalendarWidget),
  },
  {
    id: 'sticky',
    title: 'Sticky Note',
    icon: 'i-heroicons-pencil-square',
    component: markRaw(StickyNoteWidget),
  },
  {
    id: 'countdown',
    title: 'Countdown Timer',
    icon: 'i-heroicons-play-circle',
    component: markRaw(CountdownTimerWidget),
  },
  {
    id: 'amortize',
    title: 'Amortize Rent',
    icon: 'i-heroicons-calculator',
    component: markRaw(AmortizeRentWidget),
    wide: true,
  },
]

const SETTINGS_KEY = 'ee-manager-widgets-prefs'

interface WidgetSettings {
  order: string[]
  visibility: Record<string, boolean>
}

const getDefaultSettings = (): WidgetSettings => ({
  order: allWidgets.map(w => w.id),
  visibility: allWidgets.reduce((acc, w) => ({ ...acc, [w.id]: true }), {} as Record<string, boolean>),
})

const widgetSettings = ref<WidgetSettings>(getDefaultSettings())
const widgetGrid     = ref<HTMLElement | null>(null)
const isConfigOpen   = ref(false)

const getWidget = (id: string) => allWidgets.find(w => w.id === id)

onMounted(() => {
  const saved = localStorage.getItem(SETTINGS_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as WidgetSettings
      const allIds = new Set(allWidgets.map(w => w.id))
      const validOrder = (parsed.order || []).filter(id => allIds.has(id))
      const missing    = Array.from(allIds).filter(id => !validOrder.includes(id))
      widgetSettings.value.order      = [...validOrder, ...missing]
      widgetSettings.value.visibility = { ...getDefaultSettings().visibility, ...(parsed.visibility || {}) }
    } catch (e) {
      console.error('Failed to parse widget settings', e)
    }
  }

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

const saveSettings = () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(widgetSettings.value))
}

const toggleVisibility = (id: string) => {
  widgetSettings.value.visibility[id] = !widgetSettings.value.visibility[id]
  saveSettings()
}

const anyVisible = computed(() => Object.values(widgetSettings.value.visibility).some(v => v))
</script>

<template>
  <div class="space-y-8">

    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h2 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-puzzle-piece" class="text-primary-500" />
          My Widgets
        </h2>
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Personal productivity tools</p>
      </div>
      <UButton
        icon="i-heroicons-cog-6-tooth"
        color="white"
        variant="ghost"
        class="hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
        @click="isConfigOpen = true"
      >
        Configure
      </UButton>
    </div>

    <!-- Widget grid -->
    <div ref="widgetGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      <template v-for="widgetId in widgetSettings.order" :key="widgetId">
        <div
          v-if="widgetSettings.visibility[widgetId]"
          :data-widget-id="widgetId"
          :class="getWidget(widgetId)?.wide ? 'lg:col-span-2' : ''"
        >
          <SummaryWidget
            :title="getWidget(widgetId)?.title || ''"
            :icon="getWidget(widgetId)?.icon"
          >
            <component :is="getWidget(widgetId)?.component" />
          </SummaryWidget>
        </div>
      </template>
    </div>

    <!-- Empty state -->
    <div
      v-if="!anyVisible"
      class="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl"
    >
      <UIcon name="i-heroicons-puzzle-piece" class="text-6xl text-gray-300 mb-4" />
      <h3 class="text-xl font-bold text-gray-500">No widgets enabled</h3>
      <p class="text-sm text-gray-400 mt-2">Click "Configure" to add widgets back.</p>
      <UButton color="primary" variant="soft" class="mt-6" @click="isConfigOpen = true">
        Add Widgets
      </UButton>
    </div>

    <!-- Configure modal -->
    <SimpleModal v-model="isConfigOpen" title="Configure Widgets" width="max-w-xl">
      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-500">Toggle widgets on or off. Drag them directly on the page to reorder.</p>

        <div class="divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
          <div v-for="widget in allWidgets" :key="widget.id" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-primary-500/10 text-primary-500">
                <UIcon :name="widget.icon" class="w-4 h-4" />
              </div>
              <div>
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ widget.title }}</span>
                <span v-if="widget.wide" class="ml-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Wide</span>
              </div>
            </div>
            <USwitch
              :model-value="widgetSettings.visibility[widget.id]"
              @update:model-value="toggleVisibility(widget.id)"
            />
          </div>
        </div>

        <UButton block color="primary" size="lg" @click="isConfigOpen = false">
          Done
        </UButton>
      </div>
    </SimpleModal>

  </div>
</template>

<style scoped>
.ghost { opacity: 0.5; }
</style>
