import type { TableColumn } from '../../layers/table/types'

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (2 columns, 320px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    width: '240px'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '80px',
    align: 'right'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (5 columns, +460px → 780px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'marketing_name',
    label: 'Marketing Name',
    sortable: true,
    width: '200px',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
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

// Filter Groups
const filterGroups = {
  all: ['code', 'sf', 'marketing_name', 'bedroom_count', 'bathroom_count', 'base_rent', 'unit_count']
}

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

export { allColumns, filterGroups, roleColumns, departmentColumns }