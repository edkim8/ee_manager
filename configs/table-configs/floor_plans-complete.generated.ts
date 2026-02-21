// ============================================================
// AUTO-GENERATED from floor_plans.xlsx
// Generated: 2026-02-20
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 350px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    width: '140px'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '60px',
    align: 'right'
  },
  {
    key: 'marketing_name',
    label: 'Marketing Name',
    sortable: true,
    width: '150px',
    departments: ['Leasing', 'Management']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (4 columns, +260px → 610px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'bedroom_count',
    label: 'Beds',
    sortable: true,
    width: '50px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'bathroom_count',
    label: 'Baths',
    sortable: true,
    width: '50px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'base_rent',
    label: 'Base Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'unit_count',
    label: 'Units',
    sortable: true,
    width: '60px',
    align: 'right',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
]

// Role-based column visibility
const roleColumns = {
  Manager: ['base_rent'],
  RPM: ['base_rent'],
  Asset: ['base_rent']
}

// Department-based column visibility
const departmentColumns = {
  Management: ['base_rent'],
  Leasing: ['base_rent']
}

export { allColumns, roleColumns, departmentColumns }