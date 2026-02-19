// ============================================================
// AUTO-GENERATED from residents.xlsx
// Generated: 2026-02-16
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 280px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'last_name',
    label: 'Last Name',
    sortable: true,
    width: '100px'
  },
  {
    key: 'first_name',
    label: 'First Name',
    sortable: true,
    width: '100px'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '80px',
    align: 'center'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (5 columns, +480px → 760px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '80px',
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
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (2 columns, +280px → 1040px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  current: ['last_name', 'first_name', 'status', 'unit_name', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone'],
  future: ['last_name', 'first_name', 'status', 'unit_name', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone'],
  past: ['last_name', 'first_name', 'status', 'unit_name', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone'],
  all: ['last_name', 'first_name', 'status', 'unit_name', 'lease_start_date', 'lease_end_date', 'move_in_date', 'move_out_date', 'email', 'phone']
}

// Role-based column visibility
const roleColumns = {
  admin: ['email', 'phone'],
  leasing: ['email', 'phone']
}

// Department-based column visibility
const departmentColumns = {
  leasing: ['email', 'phone'],
  operations: ['email', 'phone']
}
export { allColumns, filterGroups, roleColumns, departmentColumns }
