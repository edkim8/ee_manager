// ============================================================
// AUTO-GENERATED from renewal_items_standard.xlsx
// Generated: 2026-02-20
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (4 columns, 370px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'selection',
    label: '""',
    sortable: false,
    width: '40px',
    align: 'center'
  },
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '80px'
  },
  {
    key: 'floor_plan',
    label: 'Floor Plan',
    sortable: true,
    width: '100px'
  },
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true,
    width: '150px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (4 columns, +400px → 770px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'lease_to_date',
    label: 'Expires',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'market_rent',
    label: 'Market',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'current_rent',
    label: 'Current',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'ltl_rent',
    label: 'LTL %',
    sortable: false,
    width: '100px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (3 columns, +320px → 1090px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'max_rent',
    label: 'Max %',
    sortable: false,
    width: '100px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'manual_rent',
    label: 'Manual $Δ',
    sortable: false,
    width: '120px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'final_rent',
    label: 'Final Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (4 columns, +360px → 1450px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'increase',
    label: 'Increase',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '80px',
    align: 'center',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'approved',
    label: 'Approved',
    sortable: true,
    width: '80px',
    align: 'center',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'actions',
    label: '""',
    sortable: false,
    width: '100px',
    align: 'center',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
]

// Role-based column visibility
const roleColumns = {
  Manager: ['market_rent', 'current_rent', 'ltl_rent', 'max_rent', 'manual_rent', 'final_rent', 'increase', 'status', 'approved', 'actions'],
  RPM: ['market_rent', 'current_rent', 'ltl_rent', 'max_rent', 'manual_rent', 'final_rent', 'increase', 'status', 'approved', 'actions'],
  Asset: ['market_rent', 'current_rent', 'ltl_rent', 'max_rent', 'manual_rent', 'final_rent', 'increase', 'status', 'approved', 'actions']
}

// Department-based column visibility
const departmentColumns = {
  Management: ['market_rent', 'current_rent', 'ltl_rent', 'max_rent', 'manual_rent', 'final_rent', 'increase', 'status', 'approved', 'actions'],
  Leasing: ['market_rent', 'current_rent', 'ltl_rent', 'max_rent', 'manual_rent', 'final_rent', 'increase', 'status', 'approved', 'actions']
}

export { allColumns, roleColumns, departmentColumns }