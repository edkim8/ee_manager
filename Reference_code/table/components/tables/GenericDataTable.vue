<script setup lang="ts">
import { ref, computed, watch, type PropType, defineAsyncComponent } from 'vue'
import type { TableColumn } from '../../types/tables'
import { useTableFiltering } from '../../composables/useTableFiltering'
import { useTableSorting } from '../../composables/useTableSorting'

const props = defineProps({
  data: { type: Array as PropType<any[]>, required: true },
  columns: { type: Array as PropType<TableColumn[]>, required: true },
  rowKey: { type: String, required: true },
  getColumnWidth: {
    type: Function as PropType<(accessorKey: string) => string>,
    required: true,
  },
  loading: { type: Boolean, default: false },
  isClickable: {
    type: Boolean,
    default: true,
  },
  rowComponent: {
    type: Object as PropType<any>,
    default: () =>
      defineAsyncComponent(
        () => import('../table-rows/TableRow.vue')
      ),
  },
  enablePagination: { type: Boolean, default: false },
  pageSize: { type: Number, default: 25 },
  defaultSortBy: { type: String as PropType<string | null>, default: null },
  defaultSortOrder: { type: String as PropType<'asc' | 'desc'>, default: 'asc' }
})

const emit = defineEmits(['row-click'])

const filtering = useTableFiltering(
  computed(() => props.data)
)
const { sortedData, sortBy, sortOrder, sort } = useTableSorting(
  filtering.filteredData,
  props.defaultSortBy,
  props.defaultSortOrder
)

// Pagination Logic
const page = ref(1)
const totalRows = computed(() => sortedData.value.length)
const totalPages = computed(() => Math.ceil(totalRows.value / props.pageSize))

const displayData = computed(() => {
  if (!props.enablePagination) return sortedData.value
  const start = (page.value - 1) * props.pageSize
  return sortedData.value.slice(start, start + props.pageSize)
})

// Navigation Actions
const firstPage = () => {
  page.value = 1
}
const lastPage = () => {
  page.value = totalPages.value
}
const nextPage = () => {
  if (page.value < totalPages.value) page.value++
}
const prevPage = () => {
  if (page.value > 1) page.value--
}
const goToPage = (p: number) => {
  page.value = p
}

// Sliding Window Logic for Page Buttons
const visiblePageRange = computed(() => {
  const delta = 2 // Number of pages before/after current
  const maxButtons = 5
  
  let start = Math.max(1, page.value - delta)
  let end = Math.min(totalPages.value, page.value + delta)
  
  // Adjust range if at edges
  if (page.value <= delta) {
    end = Math.min(totalPages.value, maxButtons)
  }
  if (page.value > totalPages.value - delta) {
    start = Math.max(1, totalPages.value - maxButtons + 1)
  }
  
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Reset page when filter or data length changes
watch([() => filtering.state.globalFilter, () => props.data.length], () => {
  page.value = 1
})
</script>

<template>
  <div class="generic-data-table">
    <div class="mb-4">
      <slot name="toolbar" :filter-state="filtering.state"></slot>
    </div>

    <!-- Context Bar Slot -->
    <div v-if="$slots.context" class="mb-4">
      <slot name="context"></slot>
    </div>
    
    <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              v-for="column in columns"
              :key="column.accessorKey"
              scope="col"
              class="px-3 py-3.5 text-sm font-semibold text-gray-900 dark:text-white"
              :class="[
                { 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700': column.sortable },
                column.headerClass,
              ]"
              :style="{ 
                width: getColumnWidth(column.accessorKey),
                textAlign: column.align || 'left'
              }"
              @click="column.sortable && sort(column)"
            >
              <div 
                class="flex items-center gap-1"
                :class="{
                  'justify-start': column.align === 'left' || !column.align,
                  'justify-center': column.align === 'center',
                  'justify-end': column.align === 'right'
                }"
              >
                {{ column.header }}
                <span v-if="sortBy === column.accessorKey">
                  {{ sortOrder === 'asc' ? '🔼' : '🔽' }}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr v-if="loading">
            <td :colspan="columns.length" class="p-8 text-center text-gray-500">
              <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl inline mr-2" />
              Loading...
            </td>
          </tr>
          <tr v-else-if="!displayData.length">
            <td :colspan="columns.length" class="p-8 text-center text-gray-500 italic">
              No results match your criteria.
            </td>
          </tr>
          <component
            v-else
            v-for="(item, idx) in displayData"
            :is="rowComponent"
            :key="item[rowKey]"
            :row="item"
            :visible-columns="columns"
            :get-column-width="getColumnWidth"
            :is-clickable="isClickable"
            :row-index="idx"
            @row-click="emit('row-click', $event)"
          />
        </tbody>
      </table>
    </div>

    <!-- Custom Pagination Footer -->
    <div v-if="enablePagination && totalRows > 0" class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
      <div class="text-xs font-mono text-gray-500">
        Showing {{ (page - 1) * props.pageSize + 1 }}-{{ Math.min(page * props.pageSize, totalRows) }} of {{ totalRows }}
      </div>
      
      <div v-if="totalPages > 1" class="flex items-center gap-1">
        <!-- First Page -->
        <UButton
          icon="i-heroicons-chevron-double-left-20-solid"
          color="gray"
          variant="ghost"
          size="xs"
          :disabled="page === 1"
          @click="firstPage"
        />
        
        <UButton
          icon="i-heroicons-chevron-left-20-solid"
          color="gray"
          variant="ghost"
          size="xs"
          :disabled="page === 1"
          @click="prevPage"
        />
        
        <div class="flex gap-1">
          <!-- Optional: Start Ellipses -->
          <span v-if="visiblePageRange[0] > 1" class="px-2 text-gray-400 text-xs self-center">...</span>
          
          <UButton
            v-for="p in visiblePageRange"
            :key="p"
            :label="String(p)"
            size="xs"
            :variant="page === p ? 'solid' : 'ghost'"
            :color="page === p ? 'primary' : 'gray'"
            @click="goToPage(p)"
          />

          <!-- Optional: End Ellipses -->
          <span v-if="visiblePageRange[visiblePageRange.length-1] < totalPages" class="px-2 text-gray-400 text-xs self-center">...</span>
        </div>

        <UButton
          icon="i-heroicons-chevron-right-20-solid"
          color="gray"
          variant="ghost"
          size="xs"
          :disabled="page === totalPages"
          @click="nextPage"
        />

        <!-- Last Page -->
        <UButton
          icon="i-heroicons-chevron-double-right-20-solid"
          color="gray"
          variant="ghost"
          size="xs"
          :disabled="page === totalPages"
          @click="lastPage"
        />
      </div>
    </div>
  </div>
</template>
