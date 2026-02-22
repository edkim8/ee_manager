// app/components/widgets/AmortizeRentWidget.vue

<script setup lang="ts">
import { ref } from 'vue';
import AmortizedRentCalendar from '@/components/widgets/AmortizedRentCalendar.vue';

// --- Internal State ---
// The widget now manages its own state and defaults as requested.
const rent = ref(1500);
// Default to today's date in YYYY-MM-DD format for the input
const availableDate = ref(new Date().toISOString().split('T')[0]);
const holdPeriod = ref(7);
const leaseTerm = ref(12);
</script>

<template>
  <div class="p-1 space-y-4 h-full w-[600px] flex flex-col">
    <!-- Input Controls -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-1 xl:gap-4">
      <UFormField label="Base Rent" name="baseRent" size="sm">
        <UInput
          v-model.number="rent"
          type="number"
          icon="i-heroicons-currency-dollar"
        />
      </UFormField>
      <UFormField label="Available Date" name="availableDate" size="sm">
        <UInput v-model="availableDate" type="date" />
      </UFormField>
      <UFormField label="Hold (Days)" name="holdPeriod" size="sm">
        <UInput v-model.number="holdPeriod" type="number" />
      </UFormField>
      <UFormField label="Term (Mths)" name="leaseTerm" size="sm">
        <UInput v-model.number="leaseTerm" type="number" />
      </UFormField>
    </div>

    <!-- Separator -->
    <USeparator />

    <!-- Embedded Calendar Display -->
    <!-- The calendar is now driven by the reactive state of this wrapper component. -->
    <div class="flex-grow">
      <!-- We add a v-if check to ensure we have a valid date before rendering -->
      <AmortizedRentCalendar
        v-if="availableDate"
        :rent="rent"
        :available-date="availableDate"
        :hold="holdPeriod"
        :term="leaseTerm"
      />
    </div>
  </div>
</template>
