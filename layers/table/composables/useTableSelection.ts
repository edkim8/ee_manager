import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * useTableSelection - Composable for row selection logic
 *
 * Tracks selected rows by key, supports single/multi select and select-all.
 */
export function useTableSelection<T extends Record<string, any>>(
  data: Ref<T[]> | ComputedRef<T[]>,
  rowKey: string = 'id'
) {
  const selectedKeys = ref<Set<any>>(new Set())

  const selectedRows = computed<T[]>(() =>
    data.value.filter(row => selectedKeys.value.has(row[rowKey]))
  )

  const selectedCount = computed(() => selectedKeys.value.size)

  const allSelected = computed(() => {
    if (data.value.length === 0) return false
    return data.value.every(row => selectedKeys.value.has(row[rowKey]))
  })

  const someSelected = computed(() => {
    if (data.value.length === 0) return false
    const count = data.value.filter(row => selectedKeys.value.has(row[rowKey])).length
    return count > 0 && count < data.value.length
  })

  const isSelected = (row: T): boolean => selectedKeys.value.has(row[rowKey])

  const toggleRow = (row: T): void => {
    const key = row[rowKey]
    const newSet = new Set(selectedKeys.value)
    newSet.has(key) ? newSet.delete(key) : newSet.add(key)
    selectedKeys.value = newSet
  }

  const selectAll = (): void => {
    const newSet = new Set(selectedKeys.value)
    data.value.forEach(row => newSet.add(row[rowKey]))
    selectedKeys.value = newSet
  }

  const deselectAll = (): void => {
    const newSet = new Set(selectedKeys.value)
    data.value.forEach(row => newSet.delete(row[rowKey]))
    selectedKeys.value = newSet
  }

  const toggleSelectAll = (): void => {
    allSelected.value ? deselectAll() : selectAll()
  }

  const clearSelection = (): void => { selectedKeys.value = new Set() }

  return {
    selectedKeys, selectedRows, selectedCount,
    allSelected, someSelected, isSelected,
    toggleRow, selectAll, deselectAll, toggleSelectAll, clearSelection
  }
}
