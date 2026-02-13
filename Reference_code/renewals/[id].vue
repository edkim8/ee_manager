// :File pages/renewals/[id].vue

<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});

import { ref, computed, watch, defineAsyncComponent } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useHead, useCookie, useOverlay } from '#imports';
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  formatISO,
  isWithinInterval,
  parseISO,
} from 'date-fns';

// --- TYPES & HELPERS ---
import type { RenewalListItem } from '@/types/renewals';
import { useAuth } from '@/composables/useAuth';

// --- FETCHERS, MUTATIONS, & THE WORKSHEET COMPOSABLE ---
import { useConstantsFetcher } from '@/composables/fetchers/constants/useConstantsFetcher';
import { useConstantsMutation } from '@/composables/mutations/constants/useConstantsMutation';
import { useWorksheet } from '@/composables/fetchers/renewals/useWorksheet';
import { useRenewalsList } from '@/composables/fetchers/renewals/useRenewalsList';
import { useMtmList } from '@/composables/fetchers/renewals/useMtmList';
import { useSaveWorksheet } from '@/composables/mutations/renewals/useSaveWorksheet';
import { useRenewalsWorksheet } from '@/composables/useRenewalsWorksheet';
import { useRenewalsStore } from '@/stores/useRenewalsStore';

// --- COMPONENTS ---
import RenewalsTable from '@/components/tables/RenewalsTable.vue';
const SaveWorksheetModal = defineAsyncComponent(
  () => import('@/components/modals/SaveWorksheetModal.vue')
);
const CommentModal = defineAsyncComponent(
  () => import('@/components/modals/CommentModal.vue')
);
const ConfigurationModal = defineAsyncComponent(
  () => import('@/components/modals/ConfigurationModal.vue')
);

const route = useRoute();
const router = useRouter();
const worksheetId = ref(route.params.id as string);
const isNewWorksheet = computed(() => worksheetId.value === 'new');

useHead({
  title: isNewWorksheet.value
    ? 'New Renewals Worksheet'
    : 'Edit Renewals Worksheet',
});

const { isRpmOrAdmin, isManagerOrAdmin } = useAuth();
const overlay = useOverlay();
const renewalsStore = useRenewalsStore();

// --- FILTER & WORKSHEET STATE ---
const startDate = ref('');
const endDate = ref('');
const maxRentPercent = ref(5);
const mtmFee = ref(300);
const mtmMaxPercent = ref(0.09);
const mtmOfferFrequencyDays = ref(30);
// --- NEW: Refs to store the worksheet's original, saved date range ---
const originalStartDate = ref('');
const originalEndDate = ref('');

// This logic block now correctly sets the initial state for a new worksheet.
if (isNewWorksheet.value) {
  // 1. Check the store for settings passed from the modal.
  const settings = renewalsStore.getNewWorksheetSettings();
  if (settings) {
    // 2. If settings exist, apply them.
    startDate.value = settings.startDate;
    endDate.value = settings.endDate;
    mtmOfferFrequencyDays.value = settings.mtmOfferFrequencyDays;
  } else {
    // 3. If no settings are found (e.g., direct navigation), calculate defaults.
    const calculateDefaultDates = () => {
      const today = new Date();
      const dateIn60Days = addDays(today, 60);
      const monthAfter60Days = addMonths(dateIn60Days, 1);
      const startDateObj = startOfMonth(monthAfter60Days);
      const endDateObj = endOfMonth(startDateObj);
      return {
        defaultStartDate: formatISO(startDateObj, { representation: 'date' }),
        defaultEndDate: formatISO(endDateObj, { representation: 'date' }),
      };
    };
    const { defaultStartDate, defaultEndDate } = calculateDefaultDates();
    startDate.value = defaultStartDate;
    endDate.value = defaultEndDate;
  }
}

// --- DATA FETCHING ---
const selectedPropertyCookie = useCookie<string | null>('selected');

const {
  data: initialLeases,
  pending: listPending,
  error: listError,
  refresh: refreshInitialLeases,
} = useRenewalsList({ startDate, endDate, mtmFee, mtmCap: mtmMaxPercent });

const {
  data: initialMtmLeases,
  pending: mtmListPending,
  error: mtmListError,
} = useMtmList({ mtmFee, mtmCap: mtmMaxPercent, mtmOfferFrequencyDays });

const {
  data: savedWorksheet,
  pending: worksheetPending,
  error: worksheetError,
} = useWorksheet(worksheetId);

const aptCodeForConstants = computed(() =>
  isNewWorksheet.value
    ? selectedPropertyCookie.value
    : savedWorksheet.value?.apt_code || null
);
const {
  constants: renewalModel,
  isLoading: constantsPending,
  refresh: refreshConstants,
} = useConstantsFetcher({
  category: ref('renewal_model'),
  aptCode: aptCodeForConstants,
});
const { saveWorksheet, loading: isSaving } = useSaveWorksheet();

const isPageLoading = computed(
  () =>
    listPending.value ||
    constantsPending.value ||
    worksheetPending.value ||
    mtmListPending.value
);
const pageError = computed(
  () => listError.value || worksheetError.value || mtmListError.value
);

// --- WORKSHEET LOGIC ---
// --- NEW: A computed property to handle the "smart" filtering ---
const filteredSourceData = computed(() => {
  if (isNewWorksheet.value) {
    const standard = (initialLeases.value || []).map((lease) => ({
      ...lease,
      renewal_type: 'standard',
    }));
    const mtm = (initialMtmLeases.value || []).map((lease) => ({
      ...lease,
      renewal_type: 'mtm',
    }));
    return [...standard, ...mtm];
  }

  if (savedWorksheet.value?.renewal_worksheet_items) {
    return savedWorksheet.value.renewal_worksheet_items.filter((item) => {
      // Always include MTM items, regardless of the date filter.
      if (item.renewal_type === 'mtm') {
        return true;
      }

      // For standard items, apply the date filter.
      if (!startDate.value || !endDate.value) return true;
      const itemDate = parseISO(item.lease_to_date);
      const start = parseISO(startDate.value);
      const end = parseISO(endDate.value);
      return isWithinInterval(itemDate, { start, end });
    });
  }
  return null;
});

const {
  standardRenewals,
  mtmRenewals,
  isWorksheetDirty,
  handleRentSourceChange,
  handleCustomRentChange,
  handleAiRentUpdate,
  handleApprovalChange,
  handleToggleApproveAll,
  handleCommentChange,
} = useRenewalsWorksheet(
  filteredSourceData,
  renewalModel,
  maxRentPercent,
  mtmFee,
  mtmMaxPercent,
  aptCodeForConstants
);

// This watcher now ONLY handles loading the initial state from a saved worksheet.
watch(
  savedWorksheet,
  (loadedWorksheet) => {
    if (loadedWorksheet) {
      startDate.value = loadedWorksheet.start_date;
      endDate.value = loadedWorksheet.end_date;
      originalStartDate.value = loadedWorksheet.start_date;
      originalEndDate.value = loadedWorksheet.end_date;
      maxRentPercent.value = loadedWorksheet.max_rent_increase_percent;
      mtmFee.value = loadedWorksheet.mtm_fee;
      mtmMaxPercent.value = loadedWorksheet.mtm_max_percent;
    }
  },
  { immediate: true }
);

// This new, separate watcher ONLY handles reacting to user date changes.
watch([startDate, endDate], ([newStart, newEnd], [oldStart, oldEnd]) => {
  if (!isNewWorksheet.value && savedWorksheet.value) {
    const originalStart = parseISO(originalStartDate.value);
    const originalEnd = parseISO(originalEndDate.value);
    const newStartDate = parseISO(newStart);
    const newEndDate = parseISO(newEnd);

    if (newStartDate < originalStart || newEndDate > originalEnd) {
      if (
        confirm(
          'This date range is outside the scope of the original worksheet. This will start a new worksheet with these dates, and any unsaved changes will be lost. Do you want to continue?'
        )
      ) {
        renewalsStore.setNewWorksheetSettings({
          startDate: newStart,
          endDate: newEnd,
          mtmOfferFrequencyDays: mtmOfferFrequencyDays.value,
        });
        router.push('/renewals/new');
      } else {
        startDate.value = oldStart;
        endDate.value = oldEnd;
      }
    }
  }
});

const worksheetTitle = computed(() =>
  isNewWorksheet.value
    ? 'New Worksheet - Unsaved'
    : savedWorksheet.value?.name || 'Loading...'
);
// --- MODAL & SAVE HANDLERS ---
async function openCommentModal(row: RenewalListItem) {
  const modal = overlay.create(CommentModal, {
    props: {
      initialComment: row.comment,
      initialApproverComment: row.approver_comment,
      permissions: {
        isManagerOrAdmin: isManagerOrAdmin.value,
        isRpmOrAdmin: isRpmOrAdmin.value,
      },
    },
  });

  const instance = modal.open();
  const newComments = await instance.result;

  if (newComments) {
    // Call the handler from the composable to update the state
    handleCommentChange(row.lease_id, newComments);
  }
}
async function openConfigureModal() {
  const aptCode = selectedPropertyCookie.value;
  if (!aptCode || !renewalModel.value) return;

  const modal = overlay.create(ConfigurationModal, {
    props: {
      title: 'Renewal Model Settings',
      initialConstants: renewalModel.value,
    },
  });
  const instance = modal.open();
  const result = await instance.result;
  if (result?.saved) {
    await refreshConstants();
  }
}
const tableOptions = ref({});
watchEffect(() => {
  tableOptions.value = {
    onRentSourceChange: handleRentSourceChange,
    onCustomRentChange: handleCustomRentChange,
    onAiRentUpdate: handleAiRentUpdate,
    onApprovalChange: handleApprovalChange,
    onCommentChange: openCommentModal,
    permissions: {
      canApprove: isRpmOrAdmin.value,
      isManagerOrAdmin: isManagerOrAdmin.value,
      isRpmOrAdmin: isRpmOrAdmin.value,
    },
  };
});

// --- SAVE HANDLER ---
async function handleSave(worksheetName?: string) {
  const allItems = [...standardRenewals.value, ...mtmRenewals.value];

  // This logic now correctly prepares the items for saving
  const itemsToSave = allItems.map((lease) => {
    const finalLease = { ...lease };

    if (
      finalLease.rent_offer_source === 'live_ai_rent' ||
      finalLease.rent_offer_source === 'ai_rent'
    ) {
      finalLease.ai_rent = finalLease.live_ai_rent;
      finalLease.rent_offer_source = 'ai_rent';
    }

    return finalLease;
  });

  const payload = {
    worksheet: {
      apt_code: selectedPropertyCookie.value,
      name: worksheetName || savedWorksheet.value?.name,
      start_date: startDate.value,
      end_date: endDate.value,
      max_rent_increase_percent: maxRentPercent.value,
      mtm_fee: mtmFee.value,
      mtm_max_percent: mtmMaxPercent.value,
    },
    items: JSON.parse(JSON.stringify(itemsToSave)),
  };

  const idToSave = worksheetName ? undefined : worksheetId.value;
  const result = await saveWorksheet(payload, idToSave);

  if (result) {
    isWorksheetDirty.value = false;
    if (!idToSave) {
      router.push(`/renewals/${result.worksheet_id}`);
    }
  }
}

async function openSaveAsModal() {
  const modal = overlay.create(SaveWorksheetModal, {
    props: { aptCode: selectedPropertyCookie.value },
  });

  // Step 1: Open the modal and get the instance
  const instance = modal.open();
  // Step 2: Await the result from the instance
  const newName = await instance.result;

  if (newName) {
    await handleSave(newName);
  }
}

function onSave() {
  if (isNewWorksheet.value) {
    openSaveAsModal();
  } else {
    handleSave();
  }
}

const areAllApproved = computed(() => {
  const allItems = [...standardRenewals.value, ...mtmRenewals.value];
  if (allItems.length === 0) return false;
  return allItems.every((lease) => lease.approved);
});

// --- DATA LOSS PREVENTION ---
onBeforeRouteLeave((to, from, next) => {
  if (isWorksheetDirty.value) {
    if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
      next();
    } else {
      next(false);
    }
  } else {
    next();
  }
});
// --- THIS IS THE FIX ---
// This handles browser reload or close
const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
  if (isWorksheetDirty.value) {
    event.preventDefault();
    event.returnValue = ''; // Required for most browsers
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnloadHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler);
});
// --- TABS ---
const tabItems = [
  { slot: 'renewals', label: 'Renewals Worksheet' },
  { slot: 'mtm', label: 'Month-to-Month' },
];
</script>

<template>
  <div>
    <ClientOnly>
      <template #fallback>
        <div class="text-center py-10">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl" />
        </div>
      </template>
      <div v-if="pageError">
        <div class="text-center py-4 text-red-500">
          <p>Error: {{ pageError.message }}</p>
        </div>
      </div>
      <template v-else>
        <UTabs :items="tabItems" class="w-full">
          <template #renewals="{ item }">
            <div class="mt-4">
              <RenewalsTable
                :data="standardRenewals"
                :loading="isPageLoading"
                :title="worksheetTitle"
                :start-date="startDate"
                :end-date="endDate"
                :max-rent-percent="maxRentPercent"
                :mtm-fee="mtmFee"
                :mtm-max-percent="mtmMaxPercent"
                :options="tableOptions"
                :aptCode="selectedPropertyCookie"
                @update:startDate="startDate = $event"
                @update:endDate="endDate = $event"
                @update:maxRentPercent="maxRentPercent = $event"
                @update:mtmFee="mtmFee = $event"
                @update:mtmMaxPercent="mtmMaxPercent = $event"
                @configure="openConfigureModal"
              >
                <template #actions>
                  <UButton
                    label="Close"
                    variant="outline"
                    color="warning"
                    @click="router.push('/renewals')"
                  />
                  <UButton
                    label="Save As"
                    icon="i-heroicons-document-duplicate"
                    variant="outline"
                    color="primary"
                    @click="openSaveAsModal"
                  />
                  <UButton
                    label="Save"
                    icon="i-heroicons-check-circle"
                    :disabled="!isWorksheetDirty"
                    :loading="isSaving"
                    @click="onSave"
                  />
                  <UButton
                    :label="areAllApproved ? 'Disapprove All' : 'Approve All'"
                    :icon="
                      areAllApproved
                        ? 'i-heroicons-x-circle'
                        : 'i-heroicons-check-circle'
                    "
                    :color="areAllApproved ? 'warning' : 'primary'"
                    @click="handleToggleApproveAll"
                  />
                </template>
              </RenewalsTable>
            </div>
          </template>

          <template #mtm="{ item }">
            <div class="mt-4">
              <RenewalsTable
                :data="mtmRenewals"
                :loading="isPageLoading"
                :title="'Month-to-Month Leases'"
                :start-date="startDate"
                :end-date="endDate"
                :max-rent-percent="maxRentPercent"
                :mtm-fee="mtmFee"
                :mtm-max-percent="mtmMaxPercent"
                :options="tableOptions"
                :aptCode="selectedPropertyCookie"
                @update:startDate="startDate = $event"
                @update:endDate="endDate = $event"
                @update:maxRentPercent="maxRentPercent = $event"
                @update:mtmFee="mtmFee = $event"
                @update:mtmMaxPercent="mtmMaxPercent = $event"
                @configure="openConfigureModal"
              >
                <template #actions>
                  <UButton
                    label="Close"
                    variant="outline"
                    color="warning"
                    @click="router.push('/renewals')"
                  />
                  <UButton
                    label="Save As"
                    icon="i-heroicons-document-duplicate"
                    variant="outline"
                    color="primary"
                    @click="openSaveAsModal"
                  />
                  <UButton
                    label="Save"
                    icon="i-heroicons-check-circle"
                    :disabled="!isWorksheetDirty"
                    :loading="isSaving"
                    @click="onSave"
                  />
                  <UButton
                    :label="areAllApproved ? 'Disapprove All' : 'Approve All'"
                    :icon="
                      areAllApproved
                        ? 'i-heroicons-x-circle'
                        : 'i-heroicons-check-circle'
                    "
                    :color="areAllApproved ? 'warning' : 'primary'"
                    @click="handleToggleApproveAll"
                  />
                </template>
              </RenewalsTable>
            </div>
          </template>
        </UTabs>
      </template>
    </ClientOnly>
  </div>
</template>
