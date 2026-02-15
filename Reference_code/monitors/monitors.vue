<!--
  File: app/pages/my-page/monitors.vue
  Description: The main "My Page" dashboard. This version fixes the drag-and-drop
  persistence by using a more robust onEnd callback for SortableJS.
-->
<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});

import { ref, computed, watch, nextTick } from 'vue';
import {
  useCookie,
  useHead,
  useFetch,
  useOverlay,
  defineAsyncComponent,
} from '#imports';
import Sortable from 'sortablejs';

import { useProfileStore } from '@/stores/useProfileStore';
import { useToast } from '#imports'; // Import the toast helper
import { useAuth } from '@/composables/useAuth';
// --- COMPONENT IMPORTS ---
import ActionTrackerMonitor from '@/components/monitors/ActionTrackerMonitor.vue';
import AvailablesSummaryMonitor from '@/components/monitors/AvailablesSummaryMonitor.vue';
import WorkOrdersMonitor from '@/components/monitors/WorkOrdersMonitor.vue';
import WorkOrderAnalyticsMonitor from '@/components/monitors/WorkOrderAnalyticsMonitor.vue';
import DelinquencyMonitor from '@/components/monitors/DelinquencyMonitor.vue';
import MessagesMonitor from '@/components/monitors/MessagesMonitor.vue';
import OverdueMonitor from '@/components/monitors/OverdueMonitor.vue';
const CustomizeLayoutModalAsync = defineAsyncComponent(
  () => import('@/components/modals/CustomizeLayoutModal.vue')
);
const profileStore = useProfileStore();
const toast = useToast(); // Initialize the toast helper
const { isAdmin, isManagerOrAdmin } = useAuth();
useHead({ title: 'My Page Dashboard' });

// --- STATE MANAGEMENT ---
const monitorGrid = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;
const overlay = useOverlay();

// --- DATA FETCHING ---
const {
  data: layoutData,
  pending: isLoadingLayout,
  error: layoutError,
} = useFetch('/api/dashboard/layout', { cache: 'no-cache' });
const {
  data: availableMonitors,
  pending: isLoadingMonitors,
  error: monitorsError,
} = useFetch('/api/dashboard/available-monitors?type=monitor');

const isLoading = computed(
  () => isLoadingLayout.value || isLoadingMonitors.value
);
const error = computed(() => layoutError.value || monitorsError.value);

// This ref will hold the final, ordered list of full monitor objects for rendering.
const renderedMonitors = ref<any[]>([]);

// --- ACTIONS ---
let saveTimeout: ReturnType<typeof setTimeout>;
const saveLayout = () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    // Create the simple array of names from our renderedMonitors state before saving.
    const monitorOrderToSave = renderedMonitors.value.map(
      (m) => m.component_name
    );
    console.log('Saving new layout:', monitorOrderToSave);
    await $fetch('/api/dashboard/layout', {
      method: 'PATCH',
      body: { monitors: monitorOrderToSave },
    });
  }, 1500);
};

const openCustomizeModal = async () => {
  if (!availableMonitors.value) return;

  const modal = overlay.create(CustomizeLayoutModalAsync, {
    props: {
      type: 'monitor',
      currentLayout: renderedMonitors.value.map((m) => m.component_name),
    },
  });

  const instance = modal.open();
  const newLayoutNames = await instance.result;

  if (newLayoutNames) {
    const monitorDetailsMap = new Map(
      availableMonitors.value.map((m) => [m.component_name, m])
    );
    renderedMonitors.value = newLayoutNames
      .map((name: string) => monitorDetailsMap.get(name))
      .filter(Boolean);
    saveLayout();
  }
};
const isReady = computed(() => !!profileStore.profile);

// --- DYNAMIC COMPONENT MAP ---
const monitorComponents = {
  ActionTrackerMonitor,
  AvailablesSummaryMonitor,
  WorkOrdersMonitor,
  WorkOrderAnalyticsMonitor,
  DelinquencyMonitor,
  MessagesMonitor,
  OverdueMonitor,
};

// --- PROPS FOR MONITORS ---
const aptCode = useCookie('selected');
const monitorSize = ref({ width: 596, height: 380 });

// --- LIFECYCLE HOOKS ---
watch(
  [layoutData, availableMonitors],
  ([newLayout, newAvailable]) => {
    if (newLayout?.monitors && newAvailable) {
      const monitorDetailsMap = new Map(
        newAvailable.map((m) => [m.component_name, m])
      );
      renderedMonitors.value = newLayout.monitors
        .map((monitorName) => monitorDetailsMap.get(monitorName))
        .filter(Boolean);

      nextTick(() => {
        if (monitorGrid.value && !sortableInstance) {
          sortableInstance = new Sortable(monitorGrid.value, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'opacity-50',
            // --- THIS IS THE FIX ---
            // This `onEnd` callback now uses the same robust pattern as your working widgets page.
            onEnd: (event) => {
              // 1. Get the new order of component names directly from the DOM.
              const newOrderNames = Array.from(event.to.children).map(
                (el) => (el as HTMLElement).dataset.widgetId!
              );

              // 2. Rebuild the `renderedMonitors` array based on this new, definitive order.
              if (availableMonitors.value) {
                const monitorDetailsMap = new Map(
                  availableMonitors.value.map((m) => [m.component_name, m])
                );
                renderedMonitors.value = newOrderNames
                  .map((name) => monitorDetailsMap.get(name))
                  .filter(Boolean);
              }

              // 3. Trigger the save.
              saveLayout();
            },
          });
        }
      });
    }
  },
  { immediate: true }
);

// --- ADD THIS FUNCTION ---
// This function will call our notification API with a test payload.
const sendTestMessage = async () => {
  if (!profileStore.profile?.person_id || !profileStore.profile?.email) {
    toast.add({
      title: 'Error',
      description: 'Could not find your person ID or email.',
      color: 'red',
    });
    return;
  }

  toast.add({ title: 'Sending Test Message...' });

  try {
    await $fetch('/api/notifications/send', {
      method: 'POST',
      body: {
        recipient_ids: [profileStore.profile.person_id],
        recipient_emails: [profileStore.profile.email],
        subject: 'Test Message with a Link',
        body: `<p>This test message should include a button below.</p>`,
        user_comment: 'This is a test of the call-to-action link.',
        cta_link: '/renewals', // <-- ADDED
        isMessage: true,
        isEmail: true,
      },
    });
    toast.add({
      title: 'Success!',
      description: 'Test message sent. Refresh the Messages Monitor to see it.',
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to send test message.',
      color: 'red',
    });
  }
};
</script>

<template>
  <div class="">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">My Page Dashboard</h1>
      <div class="flex items-center gap-2">
        <div v-if="isAdmin">
          <UButton
            icon="i-heroicons-paper-airplane"
            label="Send Test Message"
            color="primary"
            variant="outline"
            @click="sendTestMessage"
          />
        </div>
        <UButton
          icon="i-heroicons-cog-6-tooth"
          label="Customize Layout"
          color="neutral"
          @click="openCustomizeModal"
        />
      </div>
    </div>

    <ClientOnly>
      <div
        v-if="isLoading && renderedMonitors.length === 0"
        class="text-center py-10"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin text-4xl text-gray-400"
        />
        <p class="mt-2 text-sm text-gray-500">Loading Your Dashboard...</p>
      </div>

      <div v-else-if="error" class="text-center py-10 text-red-500">
        <p>Could not load dashboard layout.</p>
        <p class="text-xs">{{ error.message }}</p>
      </div>

      <div
        v-else
        ref="monitorGrid"
        class="flex flex-wrap gap-6 sm:justify-start"
      >
        <div
          v-for="monitor in renderedMonitors"
          :key="monitor.component_name"
          class="monitor-item"
          :data-widget-id="monitor.component_name"
          :style="{
            flexBasis: `calc(${
              monitor.width_multiplier * monitorSize.width
            }px + ${
              monitor.width_multiplier > 1
                ? (monitor.width_multiplier - 1) * 24
                : 0
            }px)`,
            height: `${monitorSize.height}px`,
          }"
        >
          <component
            :is="monitorComponents[monitor.component_name as keyof typeof monitorComponents]"
            v-if="monitorComponents[monitor.component_name as keyof typeof monitorComponents]"
            :aptCode="aptCode"
            :isReady="isReady"
          />
          <div
            v-else
            class="p-4 border border-dashed border-red-500 rounded-lg h-full"
          >
            <p class="font-bold text-red-500">Error</p>
            <p class="text-sm">
              Monitor component "{{ monitor.component_name }}" not found.
            </p>
          </div>
        </div>
      </div>

      <template #fallback>
        <div class="text-center py-10">
          <UIcon
            name="i-lucide-loader-circle"
            class="animate-spin text-4xl text-gray-400"
          />
          <p class="mt-2 text-sm text-gray-500">Initializing Dashboard...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
