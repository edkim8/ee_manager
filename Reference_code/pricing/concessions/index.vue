<!--
  File: app/pages/availables/concessions/index.vue
  Description: The final, corrected version of the concessions page, implementing
  the robust "Props Down, Events Up" pattern for configuration.
-->
<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});

import { computed, ref, watch, watchEffect, defineAsyncComponent } from 'vue';
import { useHead, useRouter, useRoute, useCookie, useOverlay } from '#imports';
import type {
  AvailableHistoryItem,
  AvailableListItem,
} from '@/types/availables';

// --- ARCHITECTURE: Step 1 ---
// Import the correct, separated composables for fetching and mutating data.
import { useConstantsFetcher } from '@/composables/fetchers/constants/useConstantsFetcher';
import { useConstantsMutation } from '@/composables/mutations/constants/useConstantsMutation';

// --- Component Imports ---
const ConfigurationModalAsync = defineAsyncComponent(
  () => import('@/components/modals/ConfigurationModal.vue')
);

// --- Import other necessary composables ---
import { useApartmentUnitTypeList } from '@/composables/fetchers/apartments/useApartmentUnitTypeList';
import { useAvailableList } from '@/composables/fetchers/availables/useAvailableList';
import { useAvailableHistory } from '@/composables/fetchers/availables/useAvailableHistory';
import { useAvailableSummary } from '@/composables/fetchers/availables/useAvailableSummary';
import { useAvailableStatusSummary } from '@/composables/fetchers/availables/useAvailableStatusSummary';
import {
  useConcessionModel,
  availableWeightingModels,
  type WeightingModel,
} from '@/composables/useConcessionModel';
import { useTableColumns } from '@/composables/useTableColumns';
import { useTableFiltering } from '@/composables/useTableFiltering';
import { useTableSorting } from '@/composables/useTableSorting';
import { useTableExport } from '@/composables/useTableExport';
import AvailablesTable from '@/components/tables/AvailablesTable.vue';
import AvailableHistoryTable from '@/components/tables/AvailableHistoryTable.vue';
import { getApartmentFullName } from '@/utils/apartment-helpers';
import { capitalize } from '@/utils/formatters';

useHead({ title: 'Concession Model Dashboard' });

const router = useRouter();
const route = useRoute();
const selectedPropertyCookie = useCookie<string | null>('selected');

// --- DATA FETCHING & STATE ---
const {
  data: unitTypes,
  pending: unitTypesLoading,
  error: pageError,
} = useApartmentUnitTypeList();
const {
  data: allAvailableUnits,
  pending: availablesLoading,
  refresh: refreshAvailables,
} = useAvailableList();
const { data: availablesSummary, refresh: refreshSummary } =
  useAvailableSummary();
const { data: availablesStatusSummary, refresh: refreshStatusSummary } =
  useAvailableStatusSummary();

// --- ARCHITECTURE: Step 2 ---
// The page is the "Control Center". It fetches the constants data.
const {
  constants: modelConstants,
  isLoading: constantsLoading,
  refresh: refreshModelConstants,
} = useConstantsFetcher({
  category: ref('concession_model'),
  aptCode: selectedPropertyCookie,
});

// The page also gets the functions for saving/resetting data.
const { updateConstants, resetConstant } = useConstantsMutation();

const selectedUnitType = computed<string | null>(
  () =>
    (route.query.unit_type as string) ||
    (unitTypes.value?.[0]?.unit_type ?? null)
);
const { data: leaseHistory, pending: historyLoading } =
  useAvailableHistory(selectedUnitType);

const isLoading = computed(
  () =>
    unitTypesLoading.value || availablesLoading.value || constantsLoading.value
);

// --- CONCESSION MODEL LOGIC ---
const filteredAvailableUnits = computed(() => {
  if (!allAvailableUnits.value || !selectedUnitType.value) return [];
  return allAvailableUnits.value.filter(
    (unit) =>
      unit.unit_type === selectedUnitType.value && unit.status === 'available'
  );
});
const totalUnitsForType = computed(
  () =>
    unitTypes.value?.find((ut) => ut.unit_type === selectedUnitType.value)
      ?.num_units || 0
);

// --- DEBUGGING STEP ---
// This watchEffect will log the total units whenever the selected unit type changes.
watchEffect(() => {
  if (selectedUnitType.value) {
    console.log(
      `[concessions/index.vue] Debug: Unit Type: ${selectedUnitType.value}, Total Units: ${totalUnitsForType.value}`
    );
  }
});

const upcomingRenewals = ref(0);
const selectedWeightingModel = ref<WeightingModel>('exponential');

// The page passes the fetched constants to the concession model.
const {
  finalTargetDiscount,
  supplyPressure,
  unitsWithRecommendations,
  currentOccupancy,
} = useConcessionModel(
  leaseHistory,
  filteredAvailableUnits,
  upcomingRenewals,
  totalUnitsForType,
  selectedWeightingModel,
  modelConstants
);

// --- MODAL LOGIC ---
const overlay = useOverlay();
const openConcessionSettings = async () => {
  const aptCode = selectedPropertyCookie.value;
  if (!aptCode || !modelConstants.value) return;

  const modal = overlay.create(ConfigurationModalAsync, {
    props: {
      title: 'Concession Model Settings',
      initialConstants: modelConstants.value,
    },
  });

  // --- THIS IS THE FIX ---
  // 1. We now correctly await the result of the modal's close event.
  const instance = modal.open();
  // 2. We now correctly `await` the `instance.result` promise.
  //    This will pause the function until the modal emits `close`.
  const result = await instance.result;

  // 3. We check the payload from the `close` event to see if a save occurred.
  if (result?.saved) {
    console.log('Modal was saved. Refreshing constants for the page...');
    // 4. We only refresh the data if the save was successful.
    await refreshModelConstants();
  } else {
    console.log('Modal was cancelled. No refresh needed.');
  }
};

// --- EVENT HANDLERS ---
const apartmentName = computed(() =>
  getApartmentFullName(useCookie('selected').value)
);
const handleRefreshAll = () => {
  refreshAvailables();
  refreshSummary();
  refreshStatusSummary();
  refreshModelConstants(); // Also refresh constants on a full refresh
};

const { exportToPdf } = useTableExport();
const handleExportToPdf = () =>
  exportToPdf(unitsWithRecommendations.value, [], 'Availables');
const navigateToAvailables = () => router.push('/availables');

function selectUnitType(unitTypeCode: string) {
  router.push({ query: { unit_type: unitTypeCode } });
}
watch(
  unitTypes,
  (newUnitTypes) => {
    if (newUnitTypes && newUnitTypes.length > 0 && !route.query.unit_type) {
      selectUnitType(newUnitTypes[0].unit_type);
    }
  },
  { once: true }
);
</script>

<template>
  <div>
    <!-- Header & Unit Type Tabs -->
    <div class="flex justify-between items-center py-4">
      <h1 class="text-2xl font-bold">Concession & Pricing Model</h1>
      <h2 class="text-lg text-gray-500 dark:text-gray-400">
        {{ apartmentName }}
      </h2>
      <UButton
        icon="i-heroicons-cog-6-tooth"
        label="Configure Model"
        color="neutral"
        variant="outline"
        @click="openConcessionSettings"
      />
    </div>
    <div
      v-if="unitTypes && unitTypes.length"
      class="flex flex-wrap gap-2 p-4 border-y border-gray-200 dark:border-gray-800"
    >
      <UButton
        v-for="ut in unitTypes"
        :key="ut.unit_type_id"
        :label="`${ut.unit_type} (${ut.b_b})`"
        :variant="selectedUnitType === ut.unit_type ? 'solid' : 'outline'"
        @click="selectUnitType(ut.unit_type)"
      />
    </div>

    <!-- Main Content Area -->
    <div v-if="isLoading" class="text-center py-10">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl" />
    </div>
    <div v-else-if="pageError" class="text-center py-10 text-red-500">
      <p>Error: {{ pageError.message }}</p>
    </div>
    <div v-else class="py-6">
      <ClientOnly>
        <template #fallback>
          <div class="text-center py-10">
            <UIcon
              name="i-lucide-loader-circle"
              class="animate-spin text-4xl"
            />
          </div>
        </template>

        <!-- Top Half: Analysis Section -->
        <div>
          <h2 class="text-xl font-semibold mb-3">
            Analysis for Unit Type:
            <span class="text-primary">{{ selectedUnitType }}</span>
          </h2>
          <UCard class="mb-4">
            <template #header
              ><h3 class="font-semibold">Model Controls & Output</h3></template
            >
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
              <URadioGroup
                v-model="selectedWeightingModel"
                :items="
                  availableWeightingModels.map((m) => ({
                    value: m,
                    label: capitalize(m),
                  }))
                "
                legend="Weighting Model"
              />
              <div class="text-center">
                <p class="text-sm text-gray-500">Target Discount</p>
                <p class="text-2xl font-bold text-primary">
                  {{ finalTargetDiscount.toFixed(2) }}%
                </p>
              </div>
              <div class="text-center">
                <p class="text-sm text-gray-500">Available Now : Occupancy %</p>
                <p class="text-2xl font-bold">
                  {{ filteredAvailableUnits.length }} :
                  {{ (100 * currentOccupancy).toFixed(1) }}%
                </p>
              </div>
              <div class="text-center">
                <p class="text-sm text-gray-500">Upcoming Renewals</p>
                <UInput
                  v-model.number="upcomingRenewals"
                  type="number"
                  size="xl"
                  class="max-w-[100px] mx-auto"
                />
              </div>
              <div class="text-center">
                <p class="text-sm text-gray-500">Supply Pressure</p>
                <p class="text-2xl font-bold">
                  {{ supplyPressure.toFixed(1) }}
                </p>
              </div>
            </div>
          </UCard>

          <AvailableHistoryTable
            :data="leaseHistory ?? []"
            :loading="historyLoading"
          />
        </div>

        <!-- Bottom Half: The Availables Table -->
        <div class="mt-8">
          <h2 class="text-xl font-semibold mb-3">
            Currently Available Units of this Type
          </h2>
          <AvailablesTable
            :data="unitsWithRecommendations"
            :summary-data="availablesSummary"
            :status-summary-data="availablesStatusSummary"
            :loading="availablesLoading"
            initial-group="manager"
            @refresh="handleRefreshAll"
          >
            <template #actions>
              <UButton
                label="Back to Main List"
                icon="i-heroicons-arrow-left"
                @click="navigateToAvailables"
              />
              <UButton
                label="Create PDF"
                icon="i-heroicons-arrow-down-tray"
                @click="handleExportToPdf"
              />
            </template>
          </AvailablesTable>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>
