import type { TableColumn } from '../types'

/**
 * Filter columns based on user profile and role-based / department-based configurations.
 * 
 * LOGIC:
 * 1. Identify "Sensitive" columns (those mentioned in ANY role or department list).
 * 2. If user is Super Admin, return everything from the active filter group.
 * 3. For non-admins, exclude "Sensitive" columns UNLESS the user's role or department
 *    explicitly allows the column.
 * 
 * @param allColumns Full list of all available columns
 * @param filterGroups Object containing arrays of keys per filter group (e.g., { all: [...], leased: [...] })
 * @param roleColumns Object containing arrays of keys per role (e.g., { Manager: [...] })
 * @param departmentColumns Object containing arrays of keys per department (e.g., { Leasing: [...] })
 * @param activeGroup The currently selected filter group (e.g., 'all', 'leased')
 * @param userContext The user's profile and access data
 * @param propertyCode The currently active property code (for role lookup)
 */
export function getAccessibleColumns(
  allColumns: TableColumn[],
  filterGroups: Record<string, string[]>,
  roleColumns: Record<string, string[]>,
  departmentColumns: Record<string, string[]>,
  activeGroup: string,
  userContext: any,
  propertyCode: string | null
): TableColumn[] {
  // 1. Context extraction
  const isSuperAdmin = !!userContext?.access?.is_super_admin
  const userDept = userContext?.profile?.department
  const userRole = propertyCode ? userContext?.access?.property_roles?.[propertyCode] : null

  // 2. Identify "Globally Sensitive" keys (fallback for legacy/summary checks)
  const sensitiveKeys = new Set<string>()
  Object.values(roleColumns).forEach(keys => keys.forEach(k => sensitiveKeys.add(k)))
  Object.values(departmentColumns).forEach(keys => keys.forEach(k => sensitiveKeys.add(k)))

  // 3. User summary pass (for key-based fallback)
  const allowedKeys = new Set<string>()
  if (userDept && departmentColumns[userDept]) {
    departmentColumns[userDept].forEach(k => allowedKeys.add(k))
  }
  if (userRole && roleColumns[userRole]) {
    roleColumns[userRole].forEach(k => allowedKeys.add(k))
  }

  // 4. Get the base keys for the current filter group
  const groupKeys = filterGroups[activeGroup.toLowerCase()] || filterGroups.all || []

  // 5. Final Granular Filter
  return allColumns.filter(col => {
    // Only consider columns in the current group
    if (!groupKeys.includes(col.key)) return false

    // Super Admin sees everything in the group
    if (isSuperAdmin) return true

    // A. PRIORITY: Granular Object-Level Checks
    if (col.roles || col.departments) {
      const roleAllowed = !col.roles || col.roles.includes('all') || (userRole && col.roles.includes(userRole))
      const deptAllowed = !col.departments || col.departments.includes('all') || (userDept && col.departments.includes(userDept))
      return roleAllowed && deptAllowed
    }

    // B. FALLBACK: Key-based Summary Checks (for backward compatibility)
    if (!sensitiveKeys.has(col.key)) return true
    return allowedKeys.has(col.key)
  })
}
