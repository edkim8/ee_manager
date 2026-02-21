// ============================================================
// AUTO-GENERATED from buildings.xlsx
// Generated: 2026-02-20
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

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
  // PRIORITY 3: Desktop Basic (1 columns, +300px → 1050px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'street_address',
    label: 'Address',
    sortable: false,
    width: '300px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
]


export { allColumns }