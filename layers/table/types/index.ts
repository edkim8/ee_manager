/**
 * Table Engine Type Definitions
 * =============================
 * Core types for the GenericDataTable component and related utilities.
 */

/**
 * Column definition for table headers and cell rendering.
 *
 * @example
 * const columns: TableColumn[] = [
 *   { key: 'name', label: 'Name', sortable: true },
 *   { key: 'status', label: 'Status', slotName: 'cell-status' },
 *   { key: 'amount', label: 'Amount', align: 'right', width: '120px' }
 * ]
 */
export interface TableColumn {
  /** Unique identifier matching the data object property */
  key: string
  /** Display text for the column header */
  label: string
  /** Enable sorting for this column (default: false) */
  sortable?: boolean
  /** Mark column as searchable - shows search icon in header */
  searchable?: boolean
  /** Custom CSS classes for header and cells */
  class?: string
  /** Fixed column width (e.g., '100px', '10%') */
  width?: string
  /** Override the default slot name (#cell-{key}) */
  slotName?: string
  /** Text alignment: 'left' | 'center' | 'right' */
  align?: 'left' | 'center' | 'right'
  /** Header-specific CSS classes */
  headerClass?: string
  /** Allowed roles for viewing this column (OR logic). Use ['all'] for no restriction. */
  roles?: string[]
  /** Allowed departments for viewing this column (OR logic). Use ['all'] for no restriction. */
  departments?: string[]
  /** Filter groups this column appears in (OR logic). Use ['all'] to show in all filters. */
  filterGroups?: string[]
}

/**
 * Sort state for table data ordering.
 */
export interface SortState {
  /** Column key to sort by (null for unsorted) */
  field: string | null
  /** Sort direction */
  direction: 'asc' | 'desc'
}

/**
 * Pagination state for paginated tables.
 */
export interface PaginationState {
  /** Current page number (1-indexed) */
  page: number
  /** Number of rows per page */
  limit: number
  /** Total number of rows in the dataset */
  total: number
}

/**
 * Selection state for row selection feature.
 */
export interface SelectionState<T = any> {
  /** Array of selected row items */
  selected: T[]
  /** Key field used for item identification */
  rowKey: string
}

/**
 * Slot scope provided to #cell-{key} slots.
 */
export interface CellSlotScope<T = any> {
  /** The entire row data object */
  row: T
  /** The column definition */
  column: TableColumn
  /** The cell value (row[column.key]) */
  value: any
  /** Row index in the current display data */
  rowIndex: number
}

/**
 * Slot scope provided to #header-{key} slots.
 */
export interface HeaderSlotScope {
  /** The column definition */
  column: TableColumn
  /** Whether this column is currently sorted */
  isSorted: boolean
  /** Current sort direction if sorted */
  sortDirection: 'asc' | 'desc' | null
}

/**
 * Props interface for GenericDataTable component.
 */
export interface GenericDataTableProps<T = any> {
  /** Array of data objects to display */
  data: T[]
  /** Column definitions */
  columns: TableColumn[]
  /** Unique identifier key for each row */
  rowKey: string
  /** Loading state indicator */
  loading?: boolean
  /** External sort state (for controlled sorting) */
  sortState?: SortState
  /** Enable built-in pagination */
  enablePagination?: boolean
  /** Rows per page when pagination enabled */
  pageSize?: number
  /** Empty state message */
  emptyMessage?: string
  /** Make rows clickable */
  clickable?: boolean
}

/**
 * Events emitted by GenericDataTable.
 */
export interface GenericDataTableEmits<T = any> {
  /** Emitted when a row is clicked */
  'row-click': [row: T, index: number]
  /** Emitted when sort state changes */
  'sort-change': [state: SortState]
  /** Emitted when page changes */
  'page-change': [page: number]
  /** Emitted when selection changes */
  'selection-change': [selected: T[]]
}
