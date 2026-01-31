<!--
  File: app/pages/yardi-uploads/refactor.vue
  Description: The new container page for the refactored Yardi upload system.
-->
<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});

import { useHead } from '#imports';
import { useUnitsLookup } from '@/composables/fetchers/apartments/useUnitsLookup';
import AvailablesUploader from '@/components/uploaders/AvailablesUploader.vue';
import ResidentsStatusUploader from '@/components/uploaders/ResidentsStatusUploader.vue';
import NoticesUploader from '@/components/uploaders/NoticesUploader.vue';
import ApplicationsUploader from '@/components/uploaders/ApplicationsUploader.vue';
import AlertsUploader from '@/components/uploaders/AlertsUploader.vue';
import WorkOrdersUploader from '@/components/uploaders/WorkOrdersUploader.vue';
import ExpiringLeasesUploader from '@/components/uploaders/ExpiringLeasesUploader.vue';
import DelinquenciesUploader from '@/components/uploaders/DelinquenciesUploader.vue';
import LeasedUnitsUploader from '@/components/uploaders/LeasedUnitsUploader.vue';

useHead({ title: 'Yardi Data Processing' });

// --- PRE-FETCHING DATA ---
const { pending: isLoadingLookup, error: lookupError } = useUnitsLookup();

// --- ACCORDION SETUP ---
const accordionItems = [
  {
    label: 'Process Leased Units (Master Roster)',
    icon: 'i-heroicons-user-group',
    defaultOpen: true,
    slot: 'leased-units',
  },
  {
    label: 'Process Residents Status',
    icon: 'i-heroicons-users',
    slot: 'residents-status',
  },
  {
    label: 'Process Availables',
    icon: 'i-heroicons-arrow-down-tray',
    slot: 'availables',
  },
  {
    label: 'Process Notices',
    icon: 'i-heroicons-bell-alert',
    slot: 'notices',
  },
  {
    label: 'Process Applications',
    icon: 'i-heroicons-clipboard-document-check',
    slot: 'applications',
  },
  {
    label: 'Expiring Leases Uploader',
    icon: 'i-heroicons-arrow-path-rounded-square-20-solid',
    slot: 'expiring-leases',
  },
  {
    label: 'Process Alerts',
    icon: 'i-heroicons-light-bulb',
    slot: 'alerts',
  },
  {
    label: 'Process Make Ready (Coming Soon)',
    icon: 'i-heroicons-paint-brush',
    disabled: true,
  },
  {
    label: 'Process Work Orders',
    icon: 'i-heroicons-wrench-screwdriver',
    slot: 'work-orders',
  },
  {
    label: 'Delinquencies Uploader',
    icon: 'i-heroicons-arrow-path-rounded-square-20-solid',
    slot: 'delinquencies',
  },
];
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Yardi Data Processing (New)</h1>
    </div>

    <div v-if="isLoadingLookup" class="text-center py-10">
      <UIcon
        name="i-lucide-loader-circle"
        class="animate-spin text-4xl text-gray-400"
      />
      <p class="mt-2 text-sm text-gray-500">Loading lookup data...</p>
    </div>
    <div v-else-if="lookupError" class="text-center py-10 text-red-500">
      <p>Could not load necessary lookup data. Please try again.</p>
      <p class="text-xs">{{ lookupError.message }}</p>
    </div>

    <!-- 
      The `:unmount="false"` prop tells the accordion to keep the content
      of its items mounted in the DOM even when they are closed.
    -->
    <UAccordion v-else :items="accordionItems" :unmount="false">
      <template #leased-units>
        <LeasedUnitsUploader />
      </template>
      <template #residents-status>
        <ResidentsStatusUploader />
      </template>

      <template #availables>
        <AvailablesUploader />
      </template>

      <template #notices>
        <NoticesUploader />
      </template>

      <template #applications>
        <ApplicationsUploader />
      </template>

      <template #expiring-leases>
        <ExpiringLeasesUploader />
      </template>

      <template #alerts>
        <AlertsUploader />
      </template>

      <template #work-orders>
        <WorkOrdersUploader />
      </template>

      <template #delinquencies>
        <DelinquenciesUploader />
      </template>
    </UAccordion>
  </div>
</template>
