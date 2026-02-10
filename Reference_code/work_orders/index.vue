<template>
  <div>
    <template v-if="isLoading">
      <div class="text-center py-4">Loading Work Orders...</div>
    </template>
    <template v-else-if="error">
      <div class="text-center py-4 text-red-500">
        Error loading work orders: {{ error.message }}
      </div>
    </template>
    <template v-else>
      <div
        class="flex items-center justify-around flex-wrap gap-3 px-2 py-3.5 border-b border-gray-200 dark:border-gray-700"
      >
        <div class="flex gap-3">
          <UInput v-model="globalFilter" placeholder="Filter all columns ..." />
        </div>
        <div class="flex flex-auto">
          <h4 class="text-gray-400 dark:text-gray-700 flex-1 text-center">
            Apartment:
            <span class="text-gray-700 dark:text-gray-400 font-bold">{{
              apartmentName
            }}</span>
          </h4>
          <h4 class="text-gray-400 dark:text-gray-700 flex-1 text-center">
            No. of WOs:
            <span class="text-gray-700 dark:text-gray-400 font-bold">{{
              workOrdersData?.length || 0
            }}</span>
          </h4>
        </div>
        <div class="flex gap-3">
          <UButton
            label="Work Orders Scheduler"
            icon="i-heroicons-arrow-right"
            to="/maintenances/work-orders/scheduler"
          />
          <UDropdownMenu
            class="mx-6"
            :items="columnVisibilityItems"
            :content="{ align: 'end' }"
          >
            <UButton
              label="Columns"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <!-- Open Work Orders Section -->
        <div class="border rounded-lg p-4">
          <h3 class="text-lg font-semibold mb-2">Open Work Orders</h3>
          <p>Total: {{ workOrdersOpenSummary?.total_count || 0 }}</p>
          <p>Over 3 Days: {{ workOrdersOpenSummary?.over_3_days || 0 }}</p>
        </div>
        <!-- Open Work Orders Section -->
        <!-- Work Orders by Category Section -->
        <div class="border rounded-lg p-4">
          <h3 class="text-lg font-semibold mb-2">Work Orders by Category</h3>
          <ul v-if="workOrdersByCategory" class="grid grid-cols-2 gap-2">
            <li
              v-for="item in workOrdersByCategory"
              :key="item.work_order_category"
            >
              {{ item.work_order_category }}: {{ item.count }}
            </li>
          </ul>
        </div>
        <!-- Work Orders by Category Section -->
        <!-- Closed Work Orders Section -->
        <div class="border rounded-lg p-4">
          <h3 class="text-lg font-semibold mb-2">Closed Work Orders</h3>
          <ul v-if="workOrdersClosedSummary">
            <li v-for="item in workOrdersClosedSummary" :key="item.month">
              {{ item.month }}: Total - {{ item.total_orders }}, Avg. Close
              Duration - {{ item.average_close_duration }}
            </li>
          </ul>
        </div>
        <!-- Closed Work Orders Section -->
      </div>
      <!-- Grid -->
      <UTable
        sticky
        ref="table"
        v-model:sorting="sorting"
        v-model:global-filter="globalFilter"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        :data="workOrdersData"
        :columns="tableColumns"
        :meta="{ router }"
      />
    </template>
  </div>
</template>

<script setup>
// --- PAGE META & SECURITY ---
definePageMeta({
  middleware: ['auth'],
});

import { computed, ref, onMounted, resolveComponent, watch } from 'vue';
import {
  useSupabaseClient,
  useCookie,
  useRouter,
  useAsyncData,
} from '#imports';
import { upperFirst } from 'scule';
import { createColumns } from '@/table-columns/workOrdersColumns';
import { usePdf } from '@/composables/usePdf';

const UButton = resolveComponent('UButton');
const UDropdownMenu = resolveComponent('UDropdownMenu');
const UInput = resolveComponent('UInput');
const UTable = resolveComponent('UTable');
const table = useTemplateRef('table');
const router = useRouter();

const supabase = useSupabaseClient();
const selectedPropertyCookie = useCookie('selected');
const { getApartmentName } = useApartmentName();
const { generatePdf } = usePdf();

const apartmentName = computed(
  () => getApartmentName(selectedPropertyCookie.value).value
);
const tableColumns = computed(() => createColumns(UDropdownMenu, UButton));
const columnFilters = ref([{ id: 'unit', value: '' }]);
const globalFilter = ref('');
const sorting = ref([]);
const columnVisibility = ref({});

const { data, isLoading, error, refresh } = await useAsyncData(
  'workOrdersData',
  async () => {
    if (!selectedPropertyCookie.value) {
      return {
        workOrdersData: [],
        workOrdersOpenSummary: null,
        workOrdersByCategory: [],
        workOrdersClosedSummary: [],
      };
    }
    try {
      const [
        workOrdersResponse,
        workOrdersOpenResponse,
        workOrdersCategoryResponse,
        workOrdersClosedResponse,
      ] = await Promise.all([
        supabase
          .from('v_work_orders_open_list')
          .select('*')
          .eq('apt_code', selectedPropertyCookie.value)
          .throwOnError(),
        supabase
          .from('v_work_orders_open_3days')
          .select('apt_code, total_count, over_3_days')
          .eq('apt_code', selectedPropertyCookie.value)
          .throwOnError(),
        supabase
          .from('v_work_orders_category')
          .select('apt_code, work_order_category, count')
          .eq('apt_code', selectedPropertyCookie.value)
          .throwOnError(),
        supabase
          .from('v_work_orders_closed')
          .select('apt_code, month, total_orders, average_close_duration')
          .eq('apt_code', selectedPropertyCookie.value)
          .throwOnError(),
      ]);

      return {
        workOrdersData: workOrdersResponse.data,
        workOrdersOpenSummary: workOrdersOpenResponse.data[0],
        workOrdersByCategory: workOrdersCategoryResponse.data,
        workOrdersClosedSummary: workOrdersClosedResponse.data,
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error; // Re-throw to handle the error in useAsyncData
    }
  }
);

const workOrdersData = computed(() => data.value?.workOrdersData);
const workOrdersOpenSummary = computed(() => data.value?.workOrdersOpenSummary);
const workOrdersByCategory = computed(() => data.value?.workOrdersByCategory);
const workOrdersClosedSummary = computed(
  () => data.value?.workOrdersClosedSummary
);

const columnVisibilityItems = computed(() =>
  table.value?.tableApi
    ?.getAllColumns()
    .filter((column) => column.getCanHide())
    .map((column) => ({
      label: upperFirst(column.id),
      type: 'checkbox',
      checked: column.getIsVisible(),
      onUpdateChecked: (checked) => {
        table.value?.tableApi
          ?.getColumn(column.id)
          ?.toggleVisibility(!!checked);
      },
    }))
);

watch(
  () => selectedPropertyCookie.value,
  (newValue) => {
    if (newValue) refresh();
  }
);

onMounted(() => {
  if (selectedPropertyCookie.value) refresh();
});

const handleExportToPdf = async () => {
  await generatePdf(workOrdersData.value, tableColumns.value, 'Work Orders');
};

const goToWorkOrdersDetails = () => {
  router.push('/maintenances/work-orders/details');
};
</script>

<style scoped>
.select-none {
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
