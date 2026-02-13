<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';
import GenericDataTable from '@/components/tables/GenericDataTable.vue';
import type { RenewalListItem } from '@/types/renewals';
import type { AppConstant } from '@/types/constants';
import { useTableColumns } from '@/composables/useTableColumns';
import { useTableFiltering } from '@/composables/useTableFiltering';
import { getColumnWidth } from '@/table-columns/renewalsColumns';

const props = defineProps({
  data: { type: Array as PropType<RenewalListItem[]>, required: true },
  loading: { type: Boolean, default: false },
  title: { type: String, default: '' },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  maxRentPercent: { type: Number, required: true },
  mtmFee: { type: Number, required: true },
  mtmMaxPercent: { type: Number, required: true },
  options: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({}),
  },
  // Add aptCode to determine which MTM field to show
  aptCode: { type: String, default: null },
});

const emit = defineEmits([
  'refresh',
  'row-click',
  'update:startDate',
  'update:endDate',
  'update:maxRentPercent',
  'update:mtmFee',
  'update:mtmMaxPercent',
  'configure', // Add emit for the new button
]);

// --- Two-way binding for filters ---
const localStartDate = computed({
  get: () => props.startDate,
  set: (value) => emit('update:startDate', value),
});
const localEndDate = computed({
  get: () => props.endDate,
  set: (value) => emit('update:endDate', value),
});
const localMaxRentPercent = computed({
  get: () => props.maxRentPercent,
  set: (value) => emit('update:maxRentPercent', value),
});
const localMtmFee = computed({
  get: () => props.mtmFee,
  set: (value) => emit('update:mtmFee', value),
});
const localMtmMaxPercent = computed({
  get: () => props.mtmMaxPercent,
  set: (value) => emit('update:mtmMaxPercent', value),
});

// --- Conditional Logic for CA properties ---
const isCaProperty = computed(() => {
  if (!props.aptCode) return false;
  return ['CV', 'WO', 'OB'].includes(props.aptCode);
});

const optionsRef = computed(() => props.options);
const { visibleColumns } = useTableColumns('renewals', 'default', optionsRef);

const { filteredData, globalFilter } = useTableFiltering(
  computed(() => props.data)
);
</script>

<template>
  <GenericDataTable
    :data="filteredData"
    :columns="visibleColumns"
    :loading="loading"
    :get-column-width="getColumnWidth"
    row-key="lease_id"
    :is-clickable="false"
    @row-click="emit('row-click', $event)"
  >
    <template #toolbar>
      <div
        class="flex items-center justify-between flex-wrap gap-4 p-3.5 border-b border-gray-200 dark:border-gray-700"
      >
        <!-- Left side: Title and Search -->
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ title }}
          </h2>
          <UInput
            v-model="globalFilter"
            placeholder="Filter residents..."
            icon="i-lucide-search"
          />
        </div>

        <!-- Middle: Filters and Parameters -->
        <div class="flex items-center gap-4">
          <UFormField label="Start Date">
            <UInput type="date" v-model="localStartDate" />
          </UFormField>
          <UFormField label="End Date">
            <UInput type="date" v-model="localEndDate" />
          </UFormField>
          <UFormField label="Max Increase %">
            <UInput type="number" v-model="localMaxRentPercent" />
          </UFormField>
          <UFormField v-if="!isCaProperty" label="MTM Fee ($)">
            <UInput type="number" v-model="localMtmFee" />
          </UFormField>
          <!-- Conditionally display MTM Max % for CA properties -->
          <UFormField v-if="isCaProperty" label="MTM Max %">
            <UInput type="number" v-model="localMtmMaxPercent" />
          </UFormField>
        </div>

        <!-- Right side: Actions -->
        <div class="flex items-center gap-3">
          <UButton
            @click="$emit('refresh')"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
          />
          <!-- Add the Configure button back -->
          <UButton
            @click="$emit('configure')"
            label="Configure Model"
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="outline"
          />
          <slot name="actions"></slot>
        </div>
      </div>
    </template>
  </GenericDataTable>
</template>
