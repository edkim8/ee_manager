// ============================================================
// AUTO-GENERATED from residents.xlsx
// Generated: 2026-02-17
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

import type { TableColumn } from '../../layers/table/types'

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (2 columns, 340px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'name',
    label: 'Residents',
    sortable: true,
    width: '260px'
  },
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '80px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (4 columns, +380px → 720px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'tenancy_status',
    label: 'Status',
    sortable: true,
    width: '80px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'lease_start_date',
    label: 'Lease Start',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'lease_end_date',
    label: 'Lease End',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'move_in_date',
    label: 'Move In',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (3 columns, +380px → 1100px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
    width: '160px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'phone',
    label: 'Phone',
    sortable: true,
    width: '120px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
]

// Filter Groups
const filterGroups = {
  current: ['name', 'unit_name', 'tenancy_status', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone'],
  future: ['name', 'unit_name', 'tenancy_status', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone'],
  past: ['name', 'unit_name', 'tenancy_status', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone'],
  all: ['name', 'unit_name', 'tenancy_status', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone']
}

// Role-based column visibility
const roleColumns = {}

// Department-based column visibility
const departmentColumns = {}

export { allColumns, filterGroups, roleColumns, departmentColumns }