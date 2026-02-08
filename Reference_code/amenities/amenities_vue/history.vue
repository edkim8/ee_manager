// app/pages/apartments/amenities/history.vue

<script setup lang="ts">
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});
import { ref, computed, watch } from 'vue';
import { useHead, useCookie, useSupabaseUser } from '#imports';

// --- Import Types ---
import type { AmenityHistoryItem } from '@/types/apartments';

// --- Import Composables ---
import { useApartmentName } from '@/composables/useApartmentName';
import { useAmenityHistory } from '@/composables/fetchers/apartments/useApartmentAmenityHistory';
import { useTableColumns } from '@/composables/useTableColumns';
import { useTableSorting } from '@/composables/useTableSorting';

// --- Import Components & Helpers ---
import TableRow from '@/components/table-rows/TableRow.vue';
import { getColumnWidth } from '@/table-columns/amenityHistoryColumns';

useHead({ title: 'Amenity Change History' });

const selectedAptCode = useCookie<string | undefined>('selected');
const user = useSupabaseUser();
const { getApartmentName } = useApartmentName();

// --- State Management ---
const apartmentName = computed(() => getApartmentName(selectedAptCode.value));
const isAuthReady = computed(() => !!user.value);

const viewMode = ref<'recent' | 'all'>('recent');
const page = ref(1);
const pageCount = ref(50);

const pagination = {
  limit: pageCount,
  offset: computed(() => (page.value - 1) * pageCount.value),
};

// --- THE FIX: Create a simple computed ref for just the 'days' filter value ---
const daysFilter = computed(() => {
  return viewMode.value === 'recent' ? 7 : undefined;
});

// Pass the reactive `daysFilter` inside a plain object to the fetcher.
const {
  data: historyData,
  pending: isLoading,
  error,
} = useAmenityHistory(
  selectedAptCode,
  { days: daysFilter },
  pagination,
  isAuthReady
);

// --- Table Logic ---
const activeDataSource = computed(() => historyData.value?.items || []);
const totalItems = computed(() => historyData.value?.totalCount || 0);

const { visibleColumns, updateColumnSortOrder } =
  useTableColumns('amenityHistory');
const { sortedData, sortOrder, sort } = useTableSorting(activeDataSource);

const sortData = (column: any) => {
  if (column.sortable) {
    sort(column);
    updateColumnSortOrder(column, sortOrder.value);
  }
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">
        Unit Amenity History for {{ apartmentName }}
      </h1>
    </div>

    <!-- Filter & View Mode Controls -->
    <div
      class="flex items-center justify-between flex-wrap gap-3 px-3 py-3.5 border rounded-lg dark:border-gray-700"
    >
      <UButtonGroup size="sm">
        <UButton
          label="Recent Changes (7d)"
          @click="viewMode = 'recent'"
          :variant="viewMode === 'recent' ? 'solid' : 'outline'"
        />
        <UButton
          label="All History"
          @click="viewMode = 'all'"
          :variant="viewMode === 'all' ? 'solid' : 'outline'"
        />
      </UButtonGroup>
    </div>

    <!-- Table Display -->
    <ClientOnly>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                v-for="column in visibleColumns"
                :key="String(column.accessorKey)"
                @click="sortData(column)"
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
                :style="{ width: getColumnWidth(String(column.accessorKey)) }"
              >
                {{ column.header }}
                <template v-if="column.sortOrder === 'asc'">🔼</template>
                <template v-if="column.sortOrder === 'desc'">🔽</template>
              </th>
            </tr>
          </thead>
          <tbody
            class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700"
          >
            <TableRow
              v-for="(item, index) in sortedData"
              :key="`${item.unit_id}-${item.amenity_id}-${index}`"
              :row="item"
              :visible-columns="visibleColumns"
              :get-column-width="getColumnWidth"
            />
          </tbody>
        </table>
        <div v-if="isLoading" class="text-center py-10 text-gray-500">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl" />
        </div>
        <div
          v-else-if="!isLoading && sortedData.length === 0"
          class="text-center py-10 text-gray-500"
        >
          <p>No amenity history found for the selected criteria.</p>
        </div>
      </div>
    </ClientOnly>

    <!-- Pagination Controls -->
    <div
      v-if="viewMode === 'all' && totalItems > pageCount"
      class="flex justify-between items-center pt-4"
    >
      <span class="text-sm text-gray-500">
        Showing {{ sortedData.length }} of {{ totalItems }} results
      </span>
      <UPagination v-model="page" :page-count="pageCount" :total="totalItems" />
    </div>
  </div>
</template>
