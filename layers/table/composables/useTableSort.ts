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

      // Determine if values are null-ish
      const aIsNull = aVal === null || aVal === undefined
      const bIsNull = bVal === null || bVal === undefined

      // NULL-SAFE: Always push nulls to the bottom regardless of direction
      if (aIsNull && bIsNull) return 0
      if (aIsNull) return 1
      if (bIsNull) return -1

      // NUMERIC COERCION: If both are number-like strings or actual numbers, compare numerically
      const aNum = Number(aVal)
      const bNum = Number(bVal)
      const isANumeric = typeof aVal !== 'boolean' && !isNaN(aNum) && String(aVal).trim() !== ''
      const isBNumeric = typeof bVal !== 'boolean' && !isNaN(bNum) && String(bVal).trim() !== ''

      if (isANumeric && isBNumeric) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum
      }

      // Default String Comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
        return direction === 'asc' ? cmp : -cmp
      }

      // Fallback Comparison
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
