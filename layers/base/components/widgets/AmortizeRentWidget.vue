<script setup lang="ts">
const rent          = ref(1500)
const availableDate = ref(new Date().toISOString().split('T')[0])
const holdPeriod    = ref(7)
const leaseTerm     = ref(12)
</script>

<template>
  <div class="space-y-4">
    <!-- Inputs -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <UFormField label="Base Rent" size="sm">
        <UInput v-model.number="rent" type="number" icon="i-heroicons-currency-dollar" size="sm" />
      </UFormField>
      <UFormField label="Available Date" size="sm">
        <UInput v-model="availableDate" type="date" size="sm" />
      </UFormField>
      <UFormField label="Hold (Days)" size="sm">
        <UInput v-model.number="holdPeriod" type="number" size="sm" />
      </UFormField>
      <UFormField label="Term (Months)" size="sm">
        <UInput v-model.number="leaseTerm" type="number" size="sm" />
      </UFormField>
    </div>

    <USeparator />

    <!-- Calendar -->
    <WidgetsAmortizedRentCalendar
      v-if="availableDate"
      :rent="rent"
      :available-date="availableDate"
      :hold="holdPeriod"
      :term="leaseTerm"
    />
  </div>
</template>
