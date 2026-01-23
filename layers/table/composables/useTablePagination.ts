import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { PaginationState } from '../types'

/**
 * useTablePagination - Composable for table pagination logic
 *
 * Manages page state, computes paginated data slice, and provides navigation.
 */
export function useTablePagination<T>(
  data: Ref<T[]> | ComputedRef<T[]>,
  pageSize: number = 25
) {
  const currentPage = ref(1)
  const limit = ref(pageSize)

  const total = computed(() => data.value.length)
  const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)

  const paginationState = computed<PaginationState>(() => ({
    page: currentPage.value,
    limit: limit.value,
    total: total.value
  }))

  const paginatedData = computed<T[]>(() => {
    const start = (currentPage.value - 1) * limit.value
    return data.value.slice(start, start + limit.value)
  })

  const visiblePageRange = computed<number[]>(() => {
    const delta = 2
    const maxButtons = 5
    let start = Math.max(1, currentPage.value - delta)
    let end = Math.min(totalPages.value, currentPage.value + delta)

    if (currentPage.value <= delta) end = Math.min(totalPages.value, maxButtons)
    if (currentPage.value > totalPages.value - delta) start = Math.max(1, totalPages.value - maxButtons + 1)

    const pages: number[] = []
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  })

  const showingText = computed(() => {
    if (total.value === 0) return 'No items'
    const start = (currentPage.value - 1) * limit.value + 1
    const end = Math.min(currentPage.value * limit.value, total.value)
    return `${start}-${end} of ${total.value}`
  })

  watch(total, () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value)
    }
  })

  const goToPage = (p: number) => { currentPage.value = Math.max(1, Math.min(p, totalPages.value)) }
  const firstPage = () => { currentPage.value = 1 }
  const lastPage = () => { currentPage.value = totalPages.value }
  const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
  const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }

  return {
    currentPage, totalPages, paginationState, paginatedData,
    visiblePageRange, showingText,
    goToPage, firstPage, lastPage, nextPage, prevPage
  }
}
