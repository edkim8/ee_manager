// ============================================================
// AUTO-GENERATED from leases.xlsx
// Generated: 2026-02-20
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (2 columns, 280px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '80px'
  },
  {
    key: 'resident_name',
    label: 'Residents',
    sortable: true,
    width: '200px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (5 columns, +480px → 760px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'lease_status',
    label: 'Status',
    sortable: true,
    width: '80px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'start_date',
    label: 'Lease Start',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'end_date',
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
  // PRIORITY 3: Desktop Basic (4 columns, +360px → 1120px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'rent_amount',
    label: 'Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'deposit_amount',
    label: 'Deposit',
    sortable: true,
    width: '100px',
    align: 'center',
    roles: ['manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'household_count',
    label: 'HH Count',
    sortable: true,
    width: '80px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'term_months',
    label: 'Term',
    sortable: true,
    width: '80px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
]

// Role-based column visibility
const roleColumns = {
  manager: ['rent_amount', 'deposit_amount'],
  RPM: ['rent_amount', 'deposit_amount'],
  Asset: ['rent_amount', 'deposit_amount']
}

// Department-based column visibility
const departmentColumns = {
  Management: ['rent_amount', 'deposit_amount'],
  Leasing: ['rent_amount', 'deposit_amount']
}

export { allColumns, roleColumns, departmentColumns }