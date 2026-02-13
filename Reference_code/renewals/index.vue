<!-- app/pages/renewals/index.vue -->
<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});

import { defineAsyncComponent, ref } from 'vue';
import { useHead, useRouter, useOverlay, useToast } from '#imports';
import { useWorksheetList } from '@/composables/fetchers/renewals/useWorksheetList';
import { useDeleteWorksheet } from '@/composables/mutations/renewals/useDeleteWorksheet';
import { useFinalizeWorksheet } from '@/composables/mutations/renewals/useFinalizeWorksheet';
import { useUpdateWorksheetTerms } from '@/composables/mutations/renewals/useUpdateWorksheetTerms';
import { useRenewalsStore } from '@/stores/useRenewalsStore';
import { format } from 'date-fns';
import { useWorksheetExport } from '@/composables/useWorksheetExport';

// --- COMPONENTS ---
import RenewalWorksheetMonitor from '@/components/monitors/RenewalWorksheetMonitor.vue';
import LeaseExpirationDashboard from '@/components/monitors/LeaseExpirationDashboard.vue';

const ConfirmDeleteModal = defineAsyncComponent(
  () => import('@/components/modals/ConfirmDeleteModal.vue')
);
const ConfigureTermsModal = defineAsyncComponent(
  () => import('@/components/modals/ConfigureTermsModal.vue')
);
const NewWorksheetModal = defineAsyncComponent(
  () => import('@/components/modals/NewWorksheetModal.vue')
);
// 1. Import the new modal component
const MarkAsPendingModal = defineAsyncComponent(
  () => import('@/components/modals/MarkAsPendingModal.vue')
);

useHead({ title: 'Renewals' });
const router = useRouter();
const toast = useToast();
const overlay = useOverlay();

// --- STATE FOR PAGINATION & FILTERS ---.value
const page = ref(1);
const pageCount = ref(4);
const showArchived = ref(false);

// --- DATA FETCHING & MUTATIONS ---
const { worksheets, total, pending, error, refresh } = useWorksheetList({
  showArchived,
  page,
  limit: pageCount,
});

const { deleteWorksheet, loading: isDeleting } = useDeleteWorksheet();
const { finalizeWorksheet, loading: isFinalizing } = useFinalizeWorksheet();
const { exportToExcel, loading: isExporting } = useWorksheetExport();
const { updateWorksheetTerms, loading: isUpdatingTerms } =
  useUpdateWorksheetTerms();
const renewalsStore = useRenewalsStore();

// --- HANDLERS ---
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return format(date, 'MMM-dd-yyyy');
};

async function openNewWorksheetModal() {
  const modal = overlay.create(NewWorksheetModal, {});
  const settings = await modal.open().result;
  if (settings) {
    renewalsStore.setNewWorksheetSettings(settings);
    router.push('/renewals/new');
  }
}

async function openConfigureTermsModal(worksheet: any) {
  const modal = overlay.create(ConfigureTermsModal, {
    props: {
      initialSettings: {
        primary_term: worksheet.primary_term,
        first_term: worksheet.first_term,
        first_term_offset: worksheet.first_term_offset,
        second_term: worksheet.second_term,
        second_term_offset: worksheet.second_term_offset,
        third_term: worksheet.third_term,
        third_term_offset: worksheet.third_term_offset,
        early_discount: worksheet.early_discount,
        early_discount_date: worksheet.early_discount_date,
        term_goals: worksheet.term_goals,
      },
    },
  });
  const newSettings = await modal.open().result;
  if (newSettings) {
    const success = await updateWorksheetTerms(
      worksheet.worksheet_id,
      newSettings
    );
    if (success) {
      refresh();
    }
  }
}

// 2. Create the handler function for the new "Update Status" feature
async function handleUpdateStatus(worksheet: any) {
  const modal = overlay.create(MarkAsPendingModal, {
    props: { worksheetId: worksheet.worksheet_id },
  });
  const result = await modal.open().result;

  if (result) {
    try {
      // It now calls our new, generic API endpoint
      await $fetch(`/api/renewals/items/${result.item_id}/status`, {
        method: 'PATCH',
        // It sends the full payload from the modal
        body: {
          status: result.status,
          accepted_term: result.accepted_term,
        },
      });
      toast.add({
        title: 'Success!',
        description: `Renewal has been updated to ${result.status}.`,
      });
      await refresh(); // Refresh the page data to update the summaries
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.data?.message || 'Failed to save status.',
        color: 'red',
      });
    }
  }
}

async function handleDelete(worksheet: any) {
  const modal = overlay.create(ConfirmDeleteModal, {
    props: {
      title: 'Confirm Deletion',
      description: `Are you sure you want to delete the worksheet "${worksheet.name}"? This will also delete all of its items and cannot be undone.`,
    },
  });
  const confirmed = await modal.open().result;
  if (confirmed) {
    const success = await deleteWorksheet(worksheet.worksheet_id);
    if (success) {
      refresh();
    }
  }
}

async function handleFinalize(worksheet: any) {
  const success = await finalizeWorksheet(worksheet.worksheet_id);
  if (success) {
    refresh();
  }
}

function handleExport(worksheet: any) {
  const cleanName = worksheet.name.replace(/[^a-zA-Z0-9 ]/g, '');
  const dateRange = `${formatDisplayDate(
    worksheet.start_date
  )} to ${formatDisplayDate(worksheet.end_date)}`;
  const finalFileName = `${cleanName} ${dateRange}`;
  exportToExcel(worksheet.worksheet_id, finalFileName);
}
</script>

<template>
  <div>
    <ClientOnly>
      <LeaseExpirationDashboard :worksheets="worksheets || []" />
      <template #fallback>
        <div class="h-[400px] flex items-center justify-center">
          <UIcon
            name="i-lucide-loader-circle"
            class="animate-spin text-2xl text-gray-500"
          />
        </div>
      </template>
    </ClientOnly>

    <div>
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-semibold">Renewals Worksheets</h1>
          <UFormField
            label="Show Archived"
            :ui="{ container: 'flex items-center gap-2' }"
          >
            <USwitch v-model="showArchived" />
          </UFormField>
        </div>
        <UButton
          icon="i-heroicons-plus-circle"
          label="Create New Worksheet"
          @click="openNewWorksheetModal"
        />
      </div>
      <ClientOnly>
        <div v-if="pending" class="text-center py-10">
          <UIcon
            name="i-lucide-loader-circle"
            class="animate-spin text-4xl text-gray-400"
          />
        </div>
        <div v-else-if="error" class="text-center py-4 text-red-500">
          <p>Error loading worksheets: {{ error.message }}</p>
          <UButton @click="refresh" label="Try Again" />
        </div>
        <div v-else-if="worksheets && worksheets.length > 0" class="space-y-4">
          <RenewalWorksheetMonitor
            v-for="ws in worksheets"
            :key="ws.worksheet_id"
            :worksheet="ws"
          >
            <template #actions>
              <div class="flex items-center justify-end gap-2">
                <UButton
                  label="View Details"
                  variant="outline"
                  color="gray"
                  icon="i-heroicons-eye"
                  @click="router.push(`/renewals/${ws.worksheet_id}`)"
                />
                <UButton
                  label="Configure Terms"
                  variant="outline"
                  color="gray"
                  icon="i-heroicons-wrench-screwdriver"
                  :loading="isUpdatingTerms"
                  @click="openConfigureTermsModal(ws)"
                />

                <!-- 3. Add the new "Update Status" button -->
                <UButton
                  v-if="ws.status === 'draft' || ws.status === 'final'"
                  label="Update Status"
                  variant="outline"
                  color="yellow"
                  icon="i-heroicons-pencil-square"
                  @click="handleUpdateStatus(ws)"
                />

                <UButton
                  v-if="ws.status === 'draft' && ws.is_fully_approved"
                  label="Finalize"
                  icon="i-heroicons-check-badge"
                  color="primary"
                  :loading="isFinalizing"
                  @click="handleFinalize(ws)"
                />
                <UButton
                  v-if="ws.status === 'final'"
                  label="Export"
                  icon="i-heroicons-arrow-down-tray"
                  color="primary"
                  variant="soft"
                  :loading="isExporting"
                  @click="handleExport(ws)"
                />
                <UButton
                  label="Delete"
                  variant="outline"
                  color="red"
                  icon="i-heroicons-trash"
                  :loading="isDeleting"
                  @click="handleDelete(ws)"
                />
              </div>
            </template>
          </RenewalWorksheetMonitor>

          <div class="flex justify-center pt-4">
            <UPagination
              v-model="page"
              :itemsPerPage="pageCount"
              :total="total"
            />
          </div>
        </div>
        <div
          v-else
          class="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
        >
          <p class="text-gray-500">No worksheets found for this property.</p>
        </div>
        <template #fallback>
          <div class="text-center py-10">
            <UIcon
              name="i-lucide-loader-circle"
              class="animate-spin text-4xl text-gray-400"
            />
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
