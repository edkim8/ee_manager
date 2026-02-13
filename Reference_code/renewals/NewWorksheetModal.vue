<script setup lang="ts">
import { ref, reactive } from 'vue';
import {
  UModal,
  UForm,
  UFormField,
  UInput,
  UButton,
  USeparator,
} from '#components';
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  formatISO,
} from 'date-fns';
import type { Form } from '#ui/types';

const emit = defineEmits(['close']);

// --- Default Value Calculation ---
// This logic correctly calculates the default date range for a new worksheet.
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

const state = reactive({
  startDate: defaultStartDate,
  endDate: defaultEndDate,
  mtmOfferFrequencyDays: 30, // Default value as discussed
});

// When the form is submitted, emit the settings object back to the page.
function handleSubmit() {
  emit('close', state);
}
</script>

<template>
  <UModal>
    <template #header>
      <h3 class="text-base font-semibold">New Worksheet Parameters</h3>
    </template>

    <template #body>
      <!-- 
        The UForm and all its elements, including the action buttons,
        are now self-contained within the #body slot.
      -->
      <UForm :state="state" @submit="handleSubmit" class="space-y-4">
        <p class="text-sm text-gray-500">
          Set the parameters for the new renewal worksheet. These can be
          adjusted later.
        </p>

        <UFormField
          label="Start Date"
          name="startDate"
          required
          help="The start date for the expiring leases to include in this worksheet."
        >
          <UInput v-model="state.startDate" type="date" />
        </UFormField>

        <UFormField
          label="End Date"
          name="endDate"
          required
          help="The end date for the expiring leases to include in this worksheet."
        >
          <UInput v-model="state.endDate" type="date" />
        </UFormField>

        <USeparator />

        <UFormField
          label="MTM Offer Frequency (Days)"
          name="mtmOfferFrequencyDays"
          required
          help="Controls offer cadence (e.g., 30 = every month, 60 = every 2 months)."
        >
          <UInput v-model.number="state.mtmOfferFrequencyDays" type="number" />
        </UFormField>

        <!-- The action buttons are now at the bottom of the form -->
        <div class="flex justify-end gap-3 pt-4">
          <UButton
            @click="$emit('close', null)"
            color="warning"
            variant="outline"
            >Cancel</UButton
          >
          <UButton type="submit" label="Create Worksheet" />
        </div>
      </UForm>
    </template>

    <!-- The footer is no longer used for the form actions -->
  </UModal>
</template>
