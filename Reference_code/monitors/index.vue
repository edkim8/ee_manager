<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});

import { useHead, onMounted, ref, watch } from '#imports';
import { markRaw } from 'vue'; // markRaw is still good practice if components were in a reactive object
import Sortable from 'sortablejs';

// Import all our widget components
import CalendarWidget from '@/components/widgets/CalendarWidget.vue';
import CountdownTimerWidget from '@/components/widgets/CountdownTimerWidget.vue';
import DigitalClockWidget from '@/components/widgets/DigitalClockWidget.vue';
import StickyNoteWidget from '@/components/widgets/StickyNoteWidget.vue';
import AmortizeRentWidget from '@/components/widgets/AmortizeRentWidget.vue';
import AnnouncementWidget from '@/components/widgets/AnnouncementWidget.vue';

useHead({ title: 'My Widgets' });

// --- Widget Configuration ---
// THIS IS THE KEY FIX: allWidgets is now a plain constant, not a ref.
// It's a static definition list and doesn't need to be reactive.
const allWidgets = [
  {
    id: 'announcements',
    title: 'Announcements',
    component: markRaw(AnnouncementWidget),
  },
  {
    id: 'amortize_rent',
    title: 'Amortize Rent Calculator',
    component: markRaw(AmortizeRentWidget),
    props: { initialRent: 2350, initialDate: new Date() },
  },
  { id: 'calendar', title: 'Calendar', component: markRaw(CalendarWidget) },
  {
    id: 'timer',
    title: 'Countdown Timer',
    component: markRaw(CountdownTimerWidget),
  },
  {
    id: 'clock',
    title: 'Digital Clock',
    component: markRaw(DigitalClockWidget),
  },
  {
    id: 'stickynote',
    title: 'Sticky Note',
    component: markRaw(StickyNoteWidget),
  },
];

const clientOnlyWidgets = ['clock', 'stickynote', 'announcements'];

// Helper to find widget data by its ID (now uses the plain array)
const getWidgetById = (id: string) => allWidgets.find((w) => w.id === id);

// --- UNIFIED STATE FOR WIDGETS ---
const SETTINGS_KEY = 'dashboard-widget-settings';

interface WidgetSettings {
  order: string[];
  visibility: Record<string, boolean>;
}

// Function to generate default settings (now uses the plain array)
const getDefaultSettings = (): WidgetSettings => {
  const allIds = allWidgets.map((w) => w.id);
  const defaultVisibility = allIds.reduce((acc, id) => {
    acc[id] = true; // All widgets visible by default
    return acc;
  }, {} as Record<string, boolean>);

  return {
    order: allIds,
    visibility: defaultVisibility,
  };
};

// The single reactive state for our dashboard
const widgetSettings = ref<WidgetSettings>(getDefaultSettings());

// --- PERSISTENCE & DRAGGABLE LOGIC ---
const widgetGrid = ref<HTMLElement | null>(null);

onMounted(() => {
  // 1. Load settings from localStorage
  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings) as WidgetSettings;
      const defaults = getDefaultSettings();

      // Merge logic now uses the plain `allWidgets` array
      const allCurrentIds = new Set(allWidgets.map((w) => w.id));
      const validSavedOrder = parsed.order.filter((id) =>
        allCurrentIds.has(id)
      );
      const newWidgets = Array.from(allCurrentIds).filter(
        (id) => !parsed.order.includes(id)
      );

      widgetSettings.value.order = [...validSavedOrder, ...newWidgets];
      widgetSettings.value.visibility = {
        ...defaults.visibility,
        ...parsed.visibility,
      };
    } catch (e) {
      console.error(
        'Failed to parse widget settings, falling back to default.',
        e
      );
    }
  }

  // 2. Initialize SortableJS
  if (widgetGrid.value) {
    new Sortable(widgetGrid.value, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'opacity-50',
      onEnd: (evt) => {
        const newOrder = Array.from(evt.to.children).map(
          (el) => (el as HTMLElement).dataset.widgetId!
        );
        widgetSettings.value.order = newOrder;
      },
    });
  }
});

// 3. Watch for any changes and save to localStorage
watch(
  widgetSettings,
  (newSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  },
  { deep: true }
);
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">My Dashboard</h1>

      <ClientOnly>
        <UModal title="Configure Widgets">
          <UButton
            icon="i-heroicons-cog-6-tooth"
            label="Configure Widgets"
            color="neutral"
            variant="outline"
          />
          <template #body>
            <UCard>
              <p class="mb-4 text-sm text-gray-500">
                Select which widgets you would like to display on your
                dashboard.
              </p>
              <div class="space-y-4">
                <div
                  v-for="widget in allWidgets"
                  :key="`setting-${widget.id}`"
                  class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <label
                    :for="`toggle-${widget.id}`"
                    class="font-medium text-sm"
                    >{{ widget.title }}</label
                  >
                  <USwitch
                    :id="`toggle-${widget.id}`"
                    :model-value="widgetSettings.visibility[widget.id]"
                    @update:model-value="
                      widgetSettings.visibility[widget.id] = $event
                    "
                  />
                </div>
              </div>
            </UCard>
          </template>
        </UModal>
      </ClientOnly>
    </div>

    <div ref="widgetGrid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <template v-for="widgetId in widgetSettings.order" :key="widgetId">
        <div
          v-if="widgetSettings.visibility[widgetId]"
          :data-widget-id="widgetId"
          class="bg-white dark:bg-gray-900 rounded-lg shadow-md flex flex-col h-[400px]"
        >
          <div
            class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700"
          >
            <h2 class="text-lg font-semibold">
              {{ getWidgetById(widgetId)?.title }}
            </h2>
            <UButton
              icon="i-heroicons-arrows-pointing-out"
              color="neutral"
              variant="ghost"
              class="drag-handle cursor-move"
              aria-label="Move widget"
            />
          </div>

          <div class="flex-grow h-full p-2 flex items-center justify-center">
            <ClientOnly v-if="clientOnlyWidgets.includes(widgetId)">
              <component
                :is="getWidgetById(widgetId)?.component"
                v-bind="getWidgetById(widgetId)?.props"
              />
              <template #fallback>
                <div class="flex items-center justify-center h-full">
                  <UIcon
                    name="i-lucide-loader-circle"
                    class="animate-spin text-2xl text-gray-400"
                  />
                </div>
              </template>
            </ClientOnly>

            <component
              v-else-if="getWidgetById(widgetId)?.component"
              :is="getWidgetById(widgetId)?.component"
              v-bind="getWidgetById(widgetId)?.props"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
