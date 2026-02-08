// app/pages/apartments/amenities/index.vue

<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});
import { computed, ref } from 'vue';
import { useHead, useCookie } from '#imports';
import { useApartmentsStore } from '@/stores/useApartmentsStore';
import { storeToRefs } from 'pinia';

import { useApartmentAmenityList } from '@/composables/fetchers/apartments/useApartmentAmenityList';
import { useTableColumns } from '@/composables/useTableColumns';
import { useTableFiltering } from '@/composables/useTableFiltering';
import { useTableSorting } from '@/composables/useTableSorting';
import TableRow from '@/components/table-rows/TableRow.vue';
import { getColumnWidth } from '@/table-columns/amenitiesColumns';
import { getApartmentFullName } from '@/utils/apartment-helpers';

useHead({ title: 'Property Amenity List' });

const store = useApartmentsStore();
const { amenityListError } = storeToRefs(store);

const {
  pending: isLoading,
  error: pageError,
  data: amenityList,
  refresh: handleRefresh,
} = useApartmentAmenityList();
const { visibleColumns } = useTableColumns('amenities');
const { filteredData, globalFilter } = useTableFiltering(amenityList);
const { sortedData, sortOrder, sort } = useTableSorting(filteredData);

const displayError = computed(() => pageError.value || amenityListError.value);
const apartmentName = computed(() =>
  getApartmentFullName(useCookie('selected').value)
);

const sortData = (column: any) => {
  if (column.sortable) sort(column);
};
</script>

<template>
  <div>
    <div class="flex items-center justify-between py-3.5 border-b">
      <UInput v-model="globalFilter" placeholder="Filter amenities..." />
      <h4 class="flex-1 text-center">
        Amenities for: <span class="font-bold">{{ apartmentName }}</span>
      </h4>
      <UButton
        @click="handleRefresh"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
      />
    </div>

    <ClientOnly>
      <template #fallback>
        <div class="text-center py-10">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl" />
        </div>
      </template>
      <div v-if="displayError" class="text-center py-10 text-red-500">
        <p>Error: {{ displayError.message }}</p>
        <UButton @click="handleRefresh" label="Try Again" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                v-for="column in visibleColumns"
                :key="column.accessorKey"
                @click="sortData(column)"
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold cursor-pointer"
              >
                {{ column.header }}
              </th>
            </tr>
          </thead>
          <tbody v-if="!isLoading" class="bg-white dark:bg-gray-900 divide-y">
            <TableRow
              v-for="item in sortedData"
              :key="item.amenity_id"
              :row="item"
              :visible-columns="visibleColumns"
              :get-column-width="getColumnWidth"
            />
          </tbody>
        </table>
      </div>
    </ClientOnly>
  </div>
</template>
