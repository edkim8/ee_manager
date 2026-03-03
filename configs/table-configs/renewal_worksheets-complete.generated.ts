// ============================================================
// AUTO-GENERATED from renewal_worksheets.xlsx
// Generated: 2026-03-03
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (1 columns, 320px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'name',
    label: 'Worksheet Name',
    sortable: true,
    width: '320px',
    align: 'left'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (3 columns, +460px → 780px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '80px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'date_range',
    label: 'Date Range',
    sortable: false,
    width: '320px',
    align: 'left',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'total_items',
    label: 'Total',
    sortable: true,
    width: '60px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (1 columns, +320px → 1100px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'status_breakdown',
    label: 'Status Breakdown',
    sortable: false,
    width: '320px',
    align: 'left',
    roles: ['Manager', 'RPM'],
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (2 columns, +420px → 1520px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'financial_summary',
    label: 'Financial Summary',
    sortable: false,
    width: '320px',
    align: 'left',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    width: '100px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
]

// Role-based column visibility
const roleColumns = {
  Manager: ['status_breakdown', 'financial_summary'],
  RPM: ['status_breakdown', 'financial_summary'],
  Asset: ['financial_summary']
}

// Department-based column visibility
const departmentColumns = {
  Management: ['status_breakdown', 'financial_summary'],
  Leasing: ['status_breakdown', 'financial_summary']
}

export { allColumns, roleColumns, departmentColumns }