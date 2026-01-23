// layers/base/composables/useTableSorting.ts
import { ref, computed, type Ref } from 'vue'

export function useTableSorting(data: Ref<any[]>, initialSortBy: string | null = null, initialSortOrder: 'asc' | 'desc' = 'asc') {
  const sortBy = ref<string | null>(initialSortBy)
  const sortOrder = ref<'asc' | 'desc'>(initialSortOrder)

  const sortedData = computed(() => {
    if (
      !sortBy.value ||
      !Array.isArray(data.value) ||
      data.value.length === 0
    ) {
      return [...data.value]
    }

    const sortKey = sortBy.value
    const order = sortOrder.value === 'asc' ? 1 : -1

    return [...data.value].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1 // a is null/undefined, so b comes first
      if (bValue == null) return -1 // b is null/undefined, so a comes first

      // Handle empty string values
      if (aValue === '' && bValue === '') return 0
      if (aValue === '') return 1 // a is empty, so b comes first
      if (bValue === '') return -1 // b is empty, so a comes first

      // Perform standard comparison
      if (aValue < bValue) {
        return order * -1
      } else if (aValue > bValue) {
        return order * 1
      }

      return 0
    })
  })

  const sort = (column: { accessorKey: string }) => {
    if (sortBy.value === column.accessorKey) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = column.accessorKey
      sortOrder.value = 'asc'
    }
  }

  return { sortedData, sortBy, sortOrder, sort }
}
