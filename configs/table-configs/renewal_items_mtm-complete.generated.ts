// ============================================================
// AUTO-GENERATED from renewal_items_mtm.xlsx
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
    width: '100px'
  },
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true,
    width: '180px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (4 columns, +420px → 700px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'floor_plan',
    label: 'Floor Plan',
    sortable: true,
    width: '130px',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'lease_to_date',
    label: 'MTM Since',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'days_on_mtm',
    label: 'Days MTM',
    sortable: true,
    width: '80px',
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
    roles: ['admin', 'finance'],
    departments: ['finance', 'leasing'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (5 columns, +490px → 1190px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'current_rent',
    label: 'Current',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['admin', 'finance'],
    departments: ['finance', 'leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'mtm_rent',
    label: 'MTM Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['admin', 'finance'],
    departments: ['finance', 'leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'final_rent',
    label: 'Offered Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['admin', 'finance'],
    departments: ['finance', 'leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'last_mtm_offer_date',
    label: 'Last Offered',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '80px',
    align: 'center',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (2 columns, +180px → 1370px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  admin: ['market_rent', 'current_rent', 'mtm_rent', 'final_rent'],
  finance: ['market_rent', 'current_rent', 'mtm_rent', 'final_rent'],
  Manager: ['status', 'approved', 'actions'],
  RPM: ['status', 'approved', 'actions'],
  Asset: ['status', 'approved', 'actions']
}

// Department-based column visibility
const departmentColumns = {
  finance: ['market_rent', 'current_rent', 'mtm_rent', 'final_rent'],
  leasing: ['market_rent', 'current_rent', 'mtm_rent', 'final_rent'],
  Management: ['status', 'approved', 'actions'],
  Leasing: ['status', 'approved', 'actions']
}

export { allColumns, roleColumns, departmentColumns }