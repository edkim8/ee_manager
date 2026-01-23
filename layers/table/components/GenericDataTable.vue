<script setup lang="ts">
/**
 * GenericDataTable.vue - The Table Engine Core Component
 * ======================================================
 *
 * PHILOSOPHY: "HTML First"
 * We build raw <table> markup to maintain full control over:
 * - Sticky headers, complex colspans, accessibility
 * - Cell-level customization via scoped slots
 * - Performance (no virtual DOM abstraction layers)
 *
 * SLOT ARCHITECTURE EXPLAINED:
 * ----------------------------
 * This component uses Vue's dynamic slot system to allow consumers to
 * override any part of the table rendering without modifying the engine.
 *
 * 1. #toolbar - Rendered above the table for search/filter controls
 * 2. #toolbar-actions - Custom buttons between toolbar and export
 * 3. #header-{key} - Override individual column headers (e.g., add icons)
 * 4. #cell-{key} - Override individual cell rendering (the main extension point)
 * 5. #empty - Custom empty state when no data
 * 6. #footer - Rendered below the table for pagination/actions
 *
 * CELL SLOT SCOPE:
 * ----------------
 * Each #cell-{key} slot receives: { row, column, value, rowIndex }
 * - row: The entire data object for this row
 * - column: The column definition object
 * - value: The cell value (row[column.key])
 * - rowIndex: Index in the current displayed data
 *
 * Example consumer usage:
 *   <GenericDataTable :data="users" :columns="cols">
 *     <template #cell-status="{ value }">
 *       <UBadge :color="value === 'active' ? 'green' : 'red'">{{ value }}</UBadge>
 *     </template>
 *   </GenericDataTable>
 */

import { computed, watch } from 'vue'
import type { TableColumn, SortState, PaginationState } from '../types'
import { useTableSort } from '../composables/useTableSort'
import { useTablePagination } from '../composables/useTablePagination'
import { useTableExport } from '../composables/useTableExport'

// ---------------------------------------------------------------------------
// PROPS DEFINITION
// ---------------------------------------------------------------------------
const props = withDefaults(defineProps<{
  /** Array of data objects to render as rows */
  data: Record<string, any>[]
  /** Column definitions controlling header labels and cell keys */
  columns: TableColumn[]
  /** Unique key field in each data object (for v-for :key) */
  rowKey?: string
  /** Show loading spinner overlay */
  loading?: boolean
  /** Enable built-in pagination */
  enablePagination?: boolean
  /** Rows per page when pagination enabled */
  pageSize?: number
  /** Default sort field on mount */
  defaultSortField?: string | null
  /** Default sort direction on mount */
  defaultSortDirection?: 'asc' | 'desc'
  /** Make rows clickable (adds hover styles) */
  clickable?: boolean
  /** Message shown when data array is empty */
  emptyMessage?: string
  /** Enable zebra striping on rows */
  striped?: boolean
  /** Enable export functionality (shows export button) */
  enableExport?: boolean
  /** Filename prefix for exports (default: 'table-export') */
  exportFilename?: string
}>(), {
  rowKey: 'id',
  loading: false,
  enablePagination: false,
  pageSize: 25,
  defaultSortField: null,
  defaultSortDirection: 'asc',
  clickable: false,
  emptyMessage: 'No data available',
  striped: true,
  enableExport: false,
  exportFilename: 'table-export'
})

// ---------------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------------
const emit = defineEmits<{
  /** Fired when a row is clicked (if clickable=true) */
  'row-click': [row: Record<string, any>, index: number]
  /** Fired when sort state changes */
  'sort-change': [state: SortState]
  /** Fired when page changes */
  'page-change': [page: number]
}>()

// ---------------------------------------------------------------------------
// SORTING LOGIC
// Uses useTableSort composable to manage sort state and compute sorted data
// ---------------------------------------------------------------------------
const {
  sortState,
  sortedData,
  toggleSort
} = useTableSort(
  computed(() => props.data),
  props.defaultSortField,
  props.defaultSortDirection
)

// Emit sort changes for parent tracking
watch(sortState, (state) => {
  emit('sort-change', state)
}, { deep: true })

// ---------------------------------------------------------------------------
// PAGINATION LOGIC
// Uses useTablePagination to slice data and manage page navigation
// ---------------------------------------------------------------------------
const {
  currentPage,
  totalPages,
  paginatedData,
  visiblePageRange,
  showingText,
  goToPage,
  firstPage,
  lastPage,
  nextPage,
  prevPage
} = useTablePagination(sortedData, props.pageSize)

// Emit page changes for parent tracking
watch(currentPage, (page) => {
  emit('page-change', page)
})

// ---------------------------------------------------------------------------
// DISPLAY DATA
// If pagination disabled, show all sorted data; otherwise show current page
// ---------------------------------------------------------------------------
const displayData = computed(() => {
  return props.enablePagination ? paginatedData.value : sortedData.value
})

// ---------------------------------------------------------------------------
// COLUMN WIDTH HELPER
// Generates inline style for column width from column.width property
// ---------------------------------------------------------------------------
function getColumnStyle(column: TableColumn): Record<string, string> {
  return column.width ? { width: column.width } : {}
}

// ---------------------------------------------------------------------------
// ROW CLICK HANDLER
// Only fires event if clickable prop is true
// ---------------------------------------------------------------------------
function handleRowClick(row: Record<string, any>, index: number): void {
  if (props.clickable) {
    emit('row-click', row, index)
  }
}

// ---------------------------------------------------------------------------
// SLOT NAME HELPER
// Determines the slot name for a column's cells
// Uses column.slotName if provided, otherwise constructs "cell-{key}"
// ---------------------------------------------------------------------------
function getCellSlotName(column: TableColumn): string {
  return column.slotName || `cell-${column.key}`
}

function getHeaderSlotName(column: TableColumn): string {
  return `header-${column.key}`
}

// ---------------------------------------------------------------------------
// EXPORT FUNCTIONALITY
// Uses useTableExport composable for CSV/PDF generation
// ---------------------------------------------------------------------------
const { exportToCSV, exportToPDF } = useTableExport()

function handleExportCSV(): void {
  exportToCSV(sortedData.value, props.columns, props.exportFilename)
}

async function handleExportPDF(): Promise<void> {
  await exportToPDF(sortedData.value, props.columns, props.exportFilename)
}

// Export dropdown menu items
// NOTE: Nuxt UI UDropdownMenu uses 'onSelect', NOT 'click' for menu item handlers
const exportMenuItems = computed(() => [[
  {
    label: 'Export CSV',
    icon: 'i-heroicons-document-text-20-solid',
    onSelect: handleExportCSV
  },
  {
    label: 'Export PDF',
    icon: 'i-heroicons-document-20-solid',
    onSelect: handleExportPDF
  }
]])
</script>

<template>
  <div class="generic-data-table">
    <!--
      TOOLBAR SLOT + ACTIONS SLOT + EXPORT BUTTON
      ============================================
      Layout: [Toolbar (flex-1)] [Actions] [Spacer (flex-1)] [Export]
      - #toolbar: Search inputs, filter dropdowns (grows to fill space)
      - #toolbar-actions: Custom action buttons (centered via spacers)
      - Spacer: Pushes export button to the right
      - Export button: Appears on far right if enableExport is true
    -->
    <div v-if="$slots.toolbar || $slots['toolbar-actions'] || enableExport" class="mb-4 flex items-center gap-4">
      <div class="flex-1">
        <slot name="toolbar" />
      </div>
      <div v-if="$slots['toolbar-actions']" class="flex-shrink-0">
        <slot name="toolbar-actions" />
      </div>
      <!-- Spacer to push export button to the right -->
      <div class="flex-1"></div>
      <div v-if="enableExport" class="flex-shrink-0">
        <UDropdownMenu :items="exportMenuItems">
          <UButton
            icon="i-heroicons-arrow-down-tray-20-solid"
            color="neutral"
            variant="outline"
            size="sm"
            label="Export"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!--
      TABLE CONTAINER
      ===============
      Overflow wrapper enables horizontal scroll on narrow screens.
      Border and rounded corners applied here for consistent styling.
    -->
    <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <!--
          COLGROUP
          ========
          Defines column widths upfront for consistent sizing.
          Width values come from column.width property.
        -->
        <colgroup>
          <col
            v-for="column in columns"
            :key="`col-${column.key}`"
            :style="getColumnStyle(column)"
          />
        </colgroup>

        <!--
          TABLE HEADER
          ============
          Each <th> can be customized via #header-{key} slot.
          Sortable columns show cursor pointer and sort indicators.
        -->
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              v-for="column in columns"
              :key="`th-${column.key}`"
              scope="col"
              class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
              :class="[
                column.class,
                column.headerClass,
                { 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none': column.sortable }
              ]"
              :style="{ textAlign: column.align || 'left' }"
              @click="column.sortable && toggleSort(column)"
            >
              <!--
                HEADER SLOT CHECK
                =================
                If #header-{key} slot exists, use it for full customization.
                Otherwise render default header with label and sort indicator.
              -->
              <slot
                v-if="$slots[getHeaderSlotName(column)]"
                :name="getHeaderSlotName(column)"
                :column="column"
                :is-sorted="sortState.field === column.key"
                :sort-direction="sortState.field === column.key ? sortState.direction : null"
              />
              <div
                v-else
                class="flex items-center gap-1"
                :class="{
                  'justify-start': column.align === 'left' || !column.align,
                  'justify-center': column.align === 'center',
                  'justify-end': column.align === 'right'
                }"
              >
                <!-- Searchable indicator icon -->
                <UIcon
                  v-if="column.searchable"
                  name="i-heroicons-magnifying-glass-20-solid"
                  class="w-3 h-3 text-gray-400 dark:text-gray-500"
                />
                <span>{{ column.label }}</span>
                <!-- Sort indicator icons -->
                <span v-if="sortState.field === column.key" class="text-primary-500">
                  <UIcon
                    :name="sortState.direction === 'asc'
                      ? 'i-heroicons-chevron-up-20-solid'
                      : 'i-heroicons-chevron-down-20-solid'"
                    class="w-4 h-4"
                  />
                </span>
                <span v-else-if="column.sortable" class="text-gray-300 dark:text-gray-600">
                  <UIcon name="i-heroicons-chevron-up-down-20-solid" class="w-4 h-4" />
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <!--
          TABLE BODY
          ==========
          Handles three states: loading, empty, and data rows.
          Each cell checks for a custom slot before falling back to raw value.
        -->
        <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          <!-- LOADING STATE -->
          <tr v-if="loading">
            <td
              :colspan="columns.length"
              class="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
            >
              <div class="flex items-center justify-center gap-2">
                <UIcon name="i-heroicons-arrow-path-20-solid" class="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </div>
            </td>
          </tr>

          <!-- EMPTY STATE -->
          <tr v-else-if="displayData.length === 0">
            <td
              :colspan="columns.length"
              class="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
            >
              <slot name="empty">
                <div class="flex flex-col items-center gap-2">
                  <UIcon name="i-heroicons-inbox-20-solid" class="w-8 h-8 text-gray-300" />
                  <span>{{ emptyMessage }}</span>
                </div>
              </slot>
            </td>
          </tr>

          <!--
            DATA ROWS
            =========
            For each row, iterate columns and check for cell slot.
            The slot receives full context: row, column, value, rowIndex.
            Zebra striping applied when striped prop is true.
          -->
          <tr
            v-else
            v-for="(row, rowIndex) in displayData"
            :key="row[rowKey]"
            class="transition-colors"
            :class="[
              { 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer': clickable },
              { 'even:bg-gray-50 dark:even:bg-gray-800/50': striped }
            ]"
            @click="handleRowClick(row, rowIndex)"
          >
            <td
              v-for="column in columns"
              :key="`${row[rowKey]}-${column.key}`"
              class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
              :class="column.class"
              :style="{ textAlign: column.align || 'left' }"
            >
              <!--
                CELL SLOT PATTERN
                =================
                This is the primary extension point for custom cell rendering.

                HOW IT WORKS:
                1. Check if a slot named "cell-{column.key}" exists
                2. If yes, render the slot with full scope
                3. If no, render the raw value as text

                WHY THIS PATTERN:
                - Consumers only define slots for columns that need customization
                - Default columns "just work" with no extra code
                - Scope provides everything needed for complex cell logic
              -->
              <slot
                v-if="$slots[getCellSlotName(column)]"
                :name="getCellSlotName(column)"
                :row="row"
                :column="column"
                :value="row[column.key]"
                :row-index="rowIndex"
              />
              <template v-else>
                {{ row[column.key] }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!--
      FOOTER / PAGINATION
      ===================
      Built-in pagination UI when enablePagination is true.
      Can be completely replaced via #footer slot.
    -->
    <div v-if="$slots.footer" class="mt-4">
      <slot
        name="footer"
        :page="currentPage"
        :total-pages="totalPages"
        :showing-text="showingText"
        :go-to-page="goToPage"
        :next-page="nextPage"
        :prev-page="prevPage"
      />
    </div>
    <div
      v-else-if="enablePagination && displayData.length > 0"
      class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2"
    >
      <!-- Showing X-Y of Z -->
      <div class="text-xs font-mono text-gray-500 dark:text-gray-400">
        {{ showingText }}
      </div>

      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="flex items-center gap-1">
        <UButton
          icon="i-heroicons-chevron-double-left-20-solid"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="currentPage === 1"
          @click="firstPage"
        />
        <UButton
          icon="i-heroicons-chevron-left-20-solid"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="currentPage === 1"
          @click="prevPage"
        />

        <!-- Page Number Buttons -->
        <div class="flex gap-1">
          <span
            v-if="visiblePageRange[0] > 1"
            class="px-2 text-gray-400 text-xs self-center"
          >...</span>
          <UButton
            v-for="p in visiblePageRange"
            :key="p"
            :label="String(p)"
            size="xs"
            :variant="currentPage === p ? 'solid' : 'ghost'"
            :color="currentPage === p ? 'primary' : 'neutral'"
            @click="goToPage(p)"
          />
          <span
            v-if="visiblePageRange[visiblePageRange.length - 1] < totalPages"
            class="px-2 text-gray-400 text-xs self-center"
          >...</span>
        </div>

        <UButton
          icon="i-heroicons-chevron-right-20-solid"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="currentPage === totalPages"
          @click="nextPage"
        />
        <UButton
          icon="i-heroicons-chevron-double-right-20-solid"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="currentPage === totalPages"
          @click="lastPage"
        />
      </div>
    </div>
  </div>
</template>
