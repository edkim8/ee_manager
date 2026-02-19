import type { TableColumn } from '../../layers/table/types'

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 350px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    width: '50px'
  },
  {
    key: 'website_url',
    label: 'Website',
    sortable: false,
    width: '50px'
  },
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    width: '250px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (2 columns, +160px → 510px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'total_unit_count',
    label: 'Units',
    sortable: true,
    width: '80px',
    align: 'right',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'year_built',
    label: 'Year',
    sortable: true,
    width: '80px',
    align: 'right',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (3 columns, +630px → 1140px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'street_address',
    label: 'Address',
    sortable: true,
    width: '350px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'city',
    label: 'City',
    sortable: true,
    width: '220px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'state_code',
    label: 'ST',
    sortable: true,
    width: '60px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
]

// Filter Groups
const filterGroups = {
  all: ['code', 'website_url', 'name', 'total_unit_count', 'year_built', 'street_address', 'city', 'state_code']
}

// Role-based column visibility
const roleColumns = {}

// Department-based column visibility
const departmentColumns = {}

export { allColumns, filterGroups, roleColumns, departmentColumns }