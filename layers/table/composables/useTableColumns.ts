import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { TableColumn } from '../types'

/**
 * Column group definition for preset column visibility configurations
 */
export interface ColumnGroup {
  /** Display name for the group */
  label: string
  /** Column keys to show in this group */
  columns: string[]
}

// ============================================================
// Role and Department-Based Column Filtering
// ============================================================

/**
 * Check if a column should be visible based on role and department
 *
 * Logic:
 * - Items within roles[] are OR (any match passes)
 * - Items within departments[] are OR (any match passes)
 * - roles AND departments are AND (must pass both)
 *
 * Column visible IF:
 *   (user.role IN column.roles OR 'all' IN column.roles)
 *   AND
 *   (user.department IN column.departments OR 'all' IN column.departments)
 */
export function canShowColumn(
  column: TableColumn,
  userRole?: string,
  userDepartment?: string,
  isSuperAdmin = false
): boolean {
  // Super admin bypasses all restrictions unless we are specifically filtering
  // (We'll handle specific filters by passing 'all' if we want bypass)
  if (isSuperAdmin && (!userDepartment || userDepartment.toLowerCase() === 'all')) return true

  // Get column restrictions (normalized to lowercase)
  const allowedRoles = (column.roles || ['all']).map(s => s.toLowerCase())
  const allowedDepts = (column.departments || ['all']).map(s => s.toLowerCase())

  const simRole = (userRole || 'all').toLowerCase()
  const simDept = (userDepartment || 'all').toLowerCase()

  // Check role restriction
  const roleCheck =
    isSuperAdmin || // Super admin always passes role checks
    allowedRoles.includes('all') ||
    simRole === 'all' ||
    allowedRoles.includes(simRole)

  // Check department restriction
  const deptCheck =
    allowedDepts.includes('all') ||
    simDept === 'all' ||
    allowedDepts.includes(simDept)

  // Must pass BOTH checks
  return roleCheck && deptCheck
}

/**
 * Filter columns based on role, department, and optional filter group
 *
 * @example
 * const filteredColumns = filterColumnsByAccess(allColumns, {
 *   userRole: 'Manager',
 *   userDepartment: 'Leasing',
 *   isSuperAdmin: false,
 *   filterGroup: 'current' // Optional
 * })
 */
export function filterColumnsByAccess(
  columns: TableColumn[],
  options: {
    userRole?: string
    userDepartment?: string
    isSuperAdmin?: boolean
    filterGroup?: string
  } = {}
): TableColumn[] {
  const { userRole, userDepartment, isSuperAdmin, filterGroup } = options

  return columns.filter((column) => {
    // 1. Check role and department restrictions
    if (!canShowColumn(column, userRole, userDepartment, isSuperAdmin)) {
      return false
    }

    // 2. Check filter group (if specified)
    if (filterGroup && column.filterGroups) {
      const allowedGroups = column.filterGroups || ['all']
      const groupCheck =
        allowedGroups.includes('all') || allowedGroups.includes(filterGroup)

      if (!groupCheck) return false
    }

    return true
  })
}

/**
 * useTableColumns - Composable for managing column visibility and presets
 *
 * Provides column visibility toggling, preset groups, and visibility state.
 * Useful for tables with many columns where users need to customize their view.
 *
 * @example
 * const { visibleColumns, setColumnGroup, toggleColumn } = useTableColumns(
 *   allColumns,
 *   {
 *     all: { label: 'All Columns', columns: ['name', 'email', 'status', 'role'] },
 *     minimal: { label: 'Minimal', columns: ['name', 'status'] }
 *   },
 *   'all'
 * )
 */
export function useTableColumns(
  columns: Ref<TableColumn[]> | ComputedRef<TableColumn[]>,
  groups: Record<string, ColumnGroup> = {},
  initialGroup: string = 'all'
) {
  // Track visibility for each column by key
  const columnVisibility = ref<Record<string, boolean>>({})

  // Current active group name
  const currentGroup = ref<string>(initialGroup)

  /**
   * Initialize visibility based on initial group or show all
   */
  function initializeVisibility(): void {
    const group = groups[initialGroup]
    if (group) {
      const groupKeys = new Set(group.columns)
      columns.value.forEach(col => {
        columnVisibility.value[col.key] = groupKeys.has(col.key)
      })
    } else {
      // Default: show all columns
      columns.value.forEach(col => {
        columnVisibility.value[col.key] = true
      })
    }
  }

  // Initialize on composable creation
  initializeVisibility()

  /**
   * Computed list of currently visible columns
   */
  const visibleColumns = computed<TableColumn[]>(() => {
    return columns.value.filter(col => columnVisibility.value[col.key] !== false)
  })

  /**
   * Set visibility to a preset group
   */
  function setColumnGroup(groupName: string): void {
    const group = groups[groupName]
    if (!group) {
      console.warn(`[useTableColumns] Group "${groupName}" not found`)
      return
    }

    currentGroup.value = groupName
    const groupKeys = new Set(group.columns)

    columns.value.forEach(col => {
      columnVisibility.value[col.key] = groupKeys.has(col.key)
    })
  }

  /**
   * Toggle visibility for a single column
   */
  function toggleColumn(key: string): void {
    columnVisibility.value[key] = !columnVisibility.value[key]
    currentGroup.value = 'custom' // Mark as custom when manually toggled
  }

  /**
   * Set visibility for a single column
   */
  function setColumnVisibility(key: string, visible: boolean): void {
    columnVisibility.value[key] = visible
    currentGroup.value = 'custom'
  }

  /**
   * Show all columns
   */
  function showAllColumns(): void {
    columns.value.forEach(col => {
      columnVisibility.value[col.key] = true
    })
    currentGroup.value = 'all'
  }

  /**
   * Check if a column is visible
   */
  function isColumnVisible(key: string): boolean {
    return columnVisibility.value[key] !== false
  }

  /**
   * Get dropdown menu items for column visibility control
   * Compatible with UDropdownMenu items format
   */
  const columnVisibilityItems = computed(() => [
    columns.value.map(col => ({
      label: col.label,
      type: 'checkbox' as const,
      checked: columnVisibility.value[col.key] !== false,
      onUpdateChecked: (checked: boolean) => setColumnVisibility(col.key, checked),
      onSelect: (e: Event) => e.preventDefault()
    }))
  ])

  /**
   * Get group selector items for preset switching
   */
  const groupItems = computed(() => [
    Object.entries(groups).map(([key, group]) => ({
      label: group.label,
      icon: currentGroup.value === key ? 'i-heroicons-check-20-solid' : undefined,
      click: () => setColumnGroup(key)
    }))
  ])

  return {
    visibleColumns,
    columnVisibility,
    currentGroup,
    columnVisibilityItems,
    groupItems,
    setColumnGroup,
    toggleColumn,
    setColumnVisibility,
    showAllColumns,
    isColumnVisible
  }
}
