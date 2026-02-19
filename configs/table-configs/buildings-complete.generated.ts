import type { TableColumn } from '../../layers/table/types'

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (2 columns, 240px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'name',
    label: 'Building',
    sortable: true,
    width: '180px'
  },
  {
    key: 'unit_count',
    label: 'Units',
    sortable: true,
    width: '60px',
    align: 'right'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (2 columns, +510px → 750px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'floor_plans_data',
    label: 'Floor Plans',
    sortable: false,
    width: '450px',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'floor_count',
    label: 'Floors',
    sortable: true,
    width: '60px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (1 columns, +200px → 950px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'street_address',
    label: 'Address',
    sortable: false,
    width: '200px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
]

// Filter Groups
const filterGroups = {
  all: ['name', 'unit_count', 'floor_plans_data', 'floor_count', 'street_address']
}

// Role-based column visibility
const roleColumns = {}

// Department-based column visibility
const departmentColumns = {}

export { allColumns, filterGroups, roleColumns, departmentColumns }