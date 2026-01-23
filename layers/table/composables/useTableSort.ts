import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { SortState, TableColumn } from '../types'

/**
 * useTableSort - Composable for table sorting logic
 *
 * Provides reactive sorting state and sorted data computation.
 * Supports string, number, and date comparisons with null handling.
 */
export function useTableSort<T extends Record<string, any>>(
  data: Ref<T[]> | ComputedRef<T[]>,
  defaultField: string | null = null,
  defaultDirection: 'asc' | 'desc' = 'asc'
) {
  const sortState = ref<SortState>({
    field: defaultField,
    direction: defaultDirection
  })

  const sortedData = computed<T[]>(() => {
    const { field, direction } = sortState.value
    if (!field) return [...data.value]

    return [...data.value].sort((a, b) => {
      const aVal = a[field]
      const bVal = b[field]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
        return direction === 'asc' ? cmp : -cmp
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  })

  function toggleSort(column: TableColumn): void {
    if (!column.sortable) return
    const { field, direction } = sortState.value

    if (field !== column.key) {
      sortState.value = { field: column.key, direction: 'asc' }
    } else if (direction === 'asc') {
      sortState.value = { field: column.key, direction: 'desc' }
    } else {
      sortState.value = { field: null, direction: 'asc' }
    }
  }

  function setSort(field: string | null, direction: 'asc' | 'desc' = 'asc'): void {
    sortState.value = { field, direction }
  }

  return { sortState, sortedData, toggleSort, setSort }
}
