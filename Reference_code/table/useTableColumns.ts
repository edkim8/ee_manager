// layers/base/composables/useTableColumns.ts

import { ref, computed, watch, toValue, type Ref } from 'vue'
import type { TableColumn, TableColumnOptions } from '../types/tables'
import type { DropdownMenuItem } from '@nuxt/ui/dist/runtime/types'

// Use glob import to dynamically load column definitions
// Adjusted path for Nuxt 4 layers structure
const columnModules = import.meta.glob('../table-columns/*Columns.{js,ts}', {
  eager: false
})

async function loadColumnDefinitions(tableName: string) {
  // Construct the lookup path to match the keys that import.meta.glob generates
  const tsPath = `../table-columns/${tableName}Columns.ts`
  const jsPath = `../table-columns/${tableName}Columns.js`

  const loader = columnModules[tsPath] || columnModules[jsPath]

  if (loader) {
    return await loader()
  } else {
    // Provide a clear error in the server terminal if a file is missing
    console.error(
      `[useTableColumns] Could not find module for table: "${tableName}". Discovered modules are:`,
      Object.keys(columnModules)
    )
    throw new Error(`No column definition found for table: ${tableName}`)
  }
}

export function useTableColumns(
  tableName: string,
  initialGroup = 'columns_all',
  options: Ref<TableColumnOptions>
) {
  const allColumns = ref<TableColumn[]>([])
  const columnGroups = ref<Record<string, any>>({})
  const currentGroup = ref(initialGroup)
  const columnVisibility = ref<Record<string, boolean>>({})

  const visibleColumns = computed(() =>
    allColumns.value.filter(
      (col) => col.accessorKey && columnVisibility.value[col.accessorKey]
    )
  )

  const loadColumns = async () => {
    try {
      // Use toValue to get the current value of the options ref
      const currentOptions = toValue(options)
      const module: any = await loadColumnDefinitions(tableName)

      const {
        createColumns,
        getColumnGroups,
        columnGroups: staticGroups,
      } = module

      const columns = createColumns ? createColumns(currentOptions) : []
      allColumns.value = columns

      if (typeof getColumnGroups === 'function') {
        columnGroups.value = getColumnGroups(currentOptions)
      } else if (staticGroups) {
        columnGroups.value = staticGroups
      } else {
        columnGroups.value = {}
      }

      setColumnGroup(currentGroup.value)
    } catch (e: any) {
      console.error(
        `[useTableColumns] Error loading columns for ${tableName}:`,
        e
      )
      allColumns.value = []
    }
  }

  const setColumnGroup = (groupName: string) => {
    currentGroup.value = groupName
    const group = columnGroups.value[groupName]
    if (group) {
      const groupKeys = new Set(group.map((c: TableColumn) => c.accessorKey))
      const newVisibilityState: Record<string, boolean> = {}
      allColumns.value.forEach((col) => {
        newVisibilityState[col.accessorKey] = groupKeys.has(col.accessorKey)
      })
      columnVisibility.value = newVisibilityState
    }
  }

  const handleVisibilityChange = (accessorKey: string, isChecked: boolean) => {
    const newState = { ...columnVisibility.value }
    newState[accessorKey] = isChecked
    columnVisibility.value = newState
  }

  const updateColumnSortOrder = (
    column: any,
    newSortOrder: 'asc' | 'desc' | null
  ) => {
    const col = allColumns.value.find(
      (c) => c.accessorKey === column.accessorKey
    )
    if (col) col.sortOrder = newSortOrder
  }

  // Watch for changes to options and reload columns
  watch([() => tableName, options], loadColumns, {
    immediate: true,
    deep: true,
  })

  const columnVisibilityItems = computed<DropdownMenuItem[][]>(() => [
    allColumns.value.map((column) => ({
      label: column.header,
      type: 'checkbox' as const,
      checked: !!columnVisibility.value[column.accessorKey],
      onUpdateChecked: (isChecked: boolean) =>
        handleVisibilityChange(column.accessorKey, isChecked),
      onSelect: (e: Event) => {
        e.preventDefault()
      },
    })),
  ])

  return {
    visibleColumns,
    columnVisibilityItems,
    setColumnGroup,
    currentGroup,
    updateColumnSortOrder,
    columnGroups,
  }
}
