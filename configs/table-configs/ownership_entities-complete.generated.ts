// ============================================================
// AUTO-GENERATED from ownership_entities.xlsx
// Generated: 2026-02-25
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================
import type { TableColumn } from '../../layers/table/types'

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 310px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'name',
    label: 'Entity Name',
    sortable: true,
    width: '150px'
  },
  {
    key: 'entity_type',
    label: 'Type',
    sortable: true,
    width: '100px',
    align: 'center'
  },
  {
    key: 'actions',
    label: '',
    sortable: false,
    width: '60px',
    align: 'center'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (3 columns, +440px → 750px total)
  // BREAKPOINT: max-md:hidden (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'legal_title',
    label: 'Legal Title',
    sortable: true,
    width: '200px',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'distribution_gl',
    label: 'Distribution GL',
    sortable: false,
    width: '120px',
    align: 'center',
    roles: ['Asset'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'contribution_gl',
    label: 'Contribution GL',
    sortable: false,
    width: '120px',
    align: 'center',
    roles: ['Asset'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop+ (1 column, +120px → 870px total)
  // BREAKPOINT: max-lg:hidden (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'tax_id',
    label: 'Tax ID',
    sortable: false,
    width: '120px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Wide Desktop (1 column, +400px → 1270px total)
  // BREAKPOINT: max-xl:hidden (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'address',
    label: 'Address',
    sortable: false,
    width: '400px',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
]

// Role-based column visibility (GL codes restricted to Asset role)
const roleColumns = {
  Asset: ['distribution_gl', 'contribution_gl']
}

// Department-based column visibility
const departmentColumns = {}

export { allColumns, roleColumns, departmentColumns }
