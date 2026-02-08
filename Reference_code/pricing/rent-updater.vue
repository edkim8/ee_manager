<!-- File: app/pages/availables/rent-updater.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCookie, useOverlay, defineAsyncComponent } from '#imports';
import { useToastHelpers } from '@/composables/useToastHelpers';
import { useAuth } from '@/composables/useAuth';
import { useParseRentUpdate } from '@/composables/parsers/useParseRentUpdate';
// 1. Import the composable to fetch the lookup and the store to read from
import { useUnitsLookup } from '@/composables/fetchers/apartments/useUnitsLookup';
import { useApartmentsStore } from '@/stores/useApartmentsStore';
import type { UnitLookupItem } from '@/types/apartments';

// --- PAGE META & SECURITY ---
definePageMeta({ middleware: ['auth'] });
const { isManagerOrAdmin } = useAuth();
const overlay = useOverlay();
const { toastSuccess, toastError } = useToastHelpers();
const RentUpdateConfirmationModal = defineAsyncComponent(
  () => import('@/components/modals/RentUpdateConfirmationModal.vue')
);

// --- STATE ---
const file = ref<File | null>(null);
const isLoading = ref(false);
const aptCode = useCookie('selected');

// 2. Pre-fetch the units lookup data and read it from the Pinia store
const apartmentsStore = useApartmentsStore();
const { pending: unitsLoading, error: unitsError } = useUnitsLookup(); // Triggers the fetch
const unitsLookup = computed(() => apartmentsStore.unitsLookup); // Gets the reactive data

// --- METHODS ---
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  file.value = target.files?.[0] || null;
};

const handlePreview = async () => {
  if (!file.value || !aptCode.value || !unitsLookup.value) {
    toastError({
      title: 'Error',
      description: 'Please select a file and a property.',
    });
    return;
  }
  isLoading.value = true;
  try {
    // 3. Parse the file in the browser
    const parsedData = await useParseRentUpdate(
      file.value,
      aptCode.value,
      unitsLookup.value
    );
    // --- DEBUG LOG ---
    console.log('[DEBUG] Parsing successful, data to be sent:', parsedData);
    if (!parsedData) {
      // Parser will show its own error toast if it fails
      return;
    }

    // 4. Send the parsed data to the "preview" API
    const previewData = await $fetch('/api/availables/rent-updater-preview', {
      method: 'POST',
      body: {
        apt_code: aptCode.value,
        rentData: parsedData,
      },
    });
    // --- DEBUG LOG ---
    console.log('[DEBUG] Preview API successful, response:', previewData);
    // 5. Open the confirmation modal with the preview data
    const modal = overlay.create(RentUpdateConfirmationModal, {
      props: { previewData },
    });
    const confirmedChanges = await modal.open().result;

    // 6. If the user confirmed, call the "execute" API
    if (confirmedChanges) {
      await handleConfirm(confirmedChanges);
    }
  } catch (error: any) {
    console.error('[DEBUG] Full error object in handlePreview:', error);
    toastError({
      title: 'Preview Failed',
      description: error.data?.message || 'An unknown error occurred.',
    });
  } finally {
    isLoading.value = false;
  }
};

const handleConfirm = async (changes: any[]) => {
  isLoading.value = true;
  try {
    await $fetch('/api/availables/rent-updater-execute', {
      method: 'PATCH',
      body: {
        apt_code: aptCode.value,
        changesToConfirm: changes,
      },
    });
    toastSuccess({
      title: 'Success!',
      description: `${changes.length} rents have been updated.`,
    });
    file.value = null; // Reset the file input
  } catch (error: any) {
    toastError({
      title: 'Update Failed',
      description: error.data?.message || 'An unknown error occurred.',
    });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div>
    <div v-if="isManagerOrAdmin">
      <h1 class="text-2xl font-bold mb-4">Manual Rent Updater</h1>
      <UCard>
        <div v-if="unitsLoading" class="text-center text-gray-500">
          Loading unit data...
        </div>
        <div v-else-if="unitsError" class="text-center text-red-500">
          Could not load required unit data. Please try again.
        </div>
        <div v-else class="space-y-4">
          <p class="text-sm text-gray-500">
            This tool allows you to update the Yardi Rent for available units
            for the selected property (<span class="font-bold">{{
              aptCode
            }}</span
            >). It will only update existing available units and will ignore any
            new or removed units from your file.
          </p>
          <UFormField label="Rent Update File (.xlsx)" required>
            <UInput
              type="file"
              @change="handleFileChange"
              accept=".xlsx, .xls"
            />
          </UFormField>
          <UButton
            label="Upload & Preview Changes"
            @click="handlePreview"
            :loading="isLoading"
            :disabled="!file"
          />
        </div>
      </UCard>
    </div>
    <div v-else>
      <p class="text-red-500">
        You do not have permission to access this page.
      </p>
    </div>
  </div>
</template>
