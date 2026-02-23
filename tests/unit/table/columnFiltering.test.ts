import { describe, it, expect } from 'vitest'
import { getAccessibleColumns } from '../../../layers/table/utils/column-filtering'
import type { TableColumn } from '../../../layers/table/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function col(key: string, extras: Partial<TableColumn> = {}): TableColumn {
  return { key, label: key, ...extras }
}

function superAdminCtx() {
  return { access: { is_super_admin: true }, profile: {} }
}

/** Build a non-super-admin user context with optional role (scoped to PROP) and department. */
function userCtx(role?: string, dept?: string, propCode?: string) {
  const prop = propCode ?? 'SB'
  return {
    access: {
      is_super_admin: false,
      property_roles: role ? { [prop]: role } : {},
    },
    profile: { department: dept ?? null },
  }
}

const PROP = 'SB'

// ─── Filter-group selection ───────────────────────────────────────────────────

describe('getAccessibleColumns: filter groups', () => {
  it('returns only columns present in the active group', () => {
    const columns = [col('name'), col('rent'), col('status')]
    const filterGroups = { all: ['name', 'status'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', superAdminCtx(), PROP)
    expect(result.map(c => c.key)).toEqual(['name', 'status'])
  })

  it('uses the correct group when multiple groups exist', () => {
    const columns = [col('name'), col('rent'), col('status')]
    const filterGroups = { all: ['name', 'rent', 'status'], leased: ['name', 'rent'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'leased', superAdminCtx(), PROP)
    expect(result.map(c => c.key)).toEqual(['name', 'rent'])
  })

  it('group lookup is case-insensitive', () => {
    const columns = [col('name'), col('rent')]
    const filterGroups = { leased: ['name', 'rent'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'LEASED', superAdminCtx(), PROP)
    expect(result.map(c => c.key)).toEqual(['name', 'rent'])
  })

  it('falls back to filterGroups.all when active group is unknown', () => {
    const columns = [col('name'), col('rent')]
    const filterGroups = { all: ['name'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'unknown', superAdminCtx(), PROP)
    expect(result.map(c => c.key)).toEqual(['name'])
  })

  it('returns empty array when active group has no columns', () => {
    const columns = [col('name')]
    const filterGroups = { all: ['name'], leased: [] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'leased', superAdminCtx(), PROP)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when no fallback exists for unknown group', () => {
    const columns = [col('name')]
    const filterGroups = { leased: ['name'] } // no 'all' key
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'unknown', superAdminCtx(), PROP)
    expect(result).toHaveLength(0)
  })
})

// ─── Super admin ──────────────────────────────────────────────────────────────

describe('getAccessibleColumns: super admin', () => {
  it('super admin sees all columns in the active group regardless of sensitivity', () => {
    const columns = [col('name'), col('ssn'), col('rent')]
    const filterGroups = { all: ['name', 'ssn', 'rent'] }
    const roleColumns = { Manager: ['ssn'] }
    const result = getAccessibleColumns(columns, filterGroups, roleColumns, {}, 'all', superAdminCtx(), PROP)
    expect(result.map(c => c.key)).toEqual(['name', 'ssn', 'rent'])
  })

  it('super admin is still scoped to the active filter group', () => {
    const columns = [col('name'), col('ssn'), col('rent')]
    const filterGroups = { all: ['name', 'rent', 'ssn'], leased: ['name'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'leased', superAdminCtx(), PROP)
    expect(result.map(c => c.key)).toEqual(['name'])
  })
})

// ─── Key-based fallback (sensitive vs non-sensitive) ─────────────────────────

describe('getAccessibleColumns: key-based fallback', () => {
  it('non-sensitive columns (not in any role/dept list) are visible to all users', () => {
    const columns = [col('name'), col('unit')]
    const filterGroups = { all: ['name', 'unit'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx(), PROP)
    expect(result.map(c => c.key)).toEqual(['name', 'unit'])
  })

  it('sensitive column is hidden from user with wrong role', () => {
    const columns = [col('name'), col('ssn')]
    const filterGroups = { all: ['name', 'ssn'] }
    const roleColumns = { Manager: ['ssn'] }
    const result = getAccessibleColumns(columns, filterGroups, roleColumns, {}, 'all', userCtx('Leasing', undefined, PROP), PROP)
    expect(result.map(c => c.key)).toEqual(['name'])
  })

  it('sensitive column is visible to user with matching role', () => {
    const columns = [col('name'), col('ssn')]
    const filterGroups = { all: ['name', 'ssn'] }
    const roleColumns = { Manager: ['ssn'] }
    const result = getAccessibleColumns(columns, filterGroups, roleColumns, {}, 'all', userCtx('Manager', undefined, PROP), PROP)
    expect(result.map(c => c.key)).toEqual(['name', 'ssn'])
  })

  it('sensitive column is visible to user with matching department', () => {
    const columns = [col('name'), col('salary')]
    const filterGroups = { all: ['name', 'salary'] }
    const deptColumns = { HR: ['salary'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, deptColumns, 'all', userCtx(undefined, 'HR'), PROP)
    expect(result.map(c => c.key)).toEqual(['name', 'salary'])
  })

  it('sensitive column is blocked when user has a different department', () => {
    const columns = [col('name'), col('salary')]
    const filterGroups = { all: ['name', 'salary'] }
    const deptColumns = { HR: ['salary'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, deptColumns, 'all', userCtx(undefined, 'Leasing'), PROP)
    expect(result.map(c => c.key)).toEqual(['name'])
  })

  it('role grant is property-scoped: wrong property = no access', () => {
    const columns = [col('name'), col('ssn')]
    const filterGroups = { all: ['name', 'ssn'] }
    const roleColumns = { Manager: ['ssn'] }
    // User is Manager at RS, but we query for SB
    const ctx = { access: { is_super_admin: false, property_roles: { RS: 'Manager' } }, profile: {} }
    const result = getAccessibleColumns(columns, filterGroups, roleColumns, {}, 'all', ctx, PROP)
    expect(result.map(c => c.key)).toEqual(['name'])
  })

  it('null propertyCode means no role is resolved → sensitive columns blocked', () => {
    const columns = [col('name'), col('ssn')]
    const filterGroups = { all: ['name', 'ssn'] }
    const roleColumns = { Manager: ['ssn'] }
    // User has a Manager role but propertyCode is null → role can't be resolved
    const result = getAccessibleColumns(columns, filterGroups, roleColumns, {}, 'all', userCtx('Manager', undefined, PROP), null)
    expect(result.map(c => c.key)).toEqual(['name'])
  })
})

// ─── Granular column-level constraints ────────────────────────────────────────

describe('getAccessibleColumns: granular column-level constraints', () => {
  it('column.roles = ["all"] is visible to any user', () => {
    const columns = [col('phone', { roles: ['all'] })]
    const filterGroups = { all: ['phone'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx(), PROP)
    expect(result).toHaveLength(1)
  })

  it('column.roles restricts access to listed role', () => {
    const columns = [col('ssn', { roles: ['Manager'] })]
    const filterGroups = { all: ['ssn'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx('Leasing', undefined, PROP), PROP)
    expect(result).toHaveLength(0)
  })

  it('column.roles grants access to matching role', () => {
    const columns = [col('ssn', { roles: ['Manager'] })]
    const filterGroups = { all: ['ssn'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx('Manager', undefined, PROP), PROP)
    expect(result).toHaveLength(1)
  })

  it('column.departments = ["all"] is visible regardless of user dept', () => {
    const columns = [col('note', { departments: ['all'] })]
    const filterGroups = { all: ['note'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx(undefined, 'SomeOtherDept'), PROP)
    expect(result).toHaveLength(1)
  })

  it('column with only roles defined — any dept passes', () => {
    // No col.departments constraint → deptAllowed = true regardless of user dept
    const columns = [col('ssn', { roles: ['Manager'] })]
    const filterGroups = { all: ['ssn'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx('Manager', 'AnyDept', PROP), PROP)
    expect(result).toHaveLength(1)
  })

  it('column with only departments defined — any role passes', () => {
    // No col.roles constraint → roleAllowed = true regardless of user role
    const columns = [col('salary', { departments: ['HR'] })]
    const filterGroups = { all: ['salary'] }
    const result = getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx('SomeRole', 'HR', PROP), PROP)
    expect(result).toHaveLength(1)
  })

  it('column with both roles AND departments — both constraints must pass', () => {
    const columns = [col('audit', { roles: ['Manager'], departments: ['Ops'] })]
    const filterGroups = { all: ['audit'] }

    // Right role, wrong dept → blocked
    expect(
      getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx('Manager', 'Leasing', PROP), PROP)
    ).toHaveLength(0)

    // Right dept, wrong role → blocked
    expect(
      getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx('Leasing', 'Ops', PROP), PROP)
    ).toHaveLength(0)

    // Both match → allowed
    expect(
      getAccessibleColumns(columns, filterGroups, {}, {}, 'all', userCtx('Manager', 'Ops', PROP), PROP)
    ).toHaveLength(1)
  })

  it('granular check takes priority over key-based fallback', () => {
    // Column has explicit roles=[Manager] AND its key is in the global roleColumns — verify granular wins
    const columns = [col('ssn', { roles: ['Manager'] })]
    const filterGroups = { all: ['ssn'] }
    const roleColumns = { Admin: ['ssn'] } // fallback says only Admin can see ssn
    // But granular says Manager → Manager should get access (granular wins)
    const result = getAccessibleColumns(columns, filterGroups, roleColumns, {}, 'all', userCtx('Manager', undefined, PROP), PROP)
    expect(result).toHaveLength(1)
  })
})
