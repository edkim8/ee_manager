// ============================================================
// AUTO-GENERATED from property_ownership.xlsx
// Generated: 2026-02-25
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (1 columns, 260px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'property_code',
    label: 'Property',
    sortable: true,
    width: '260px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (2 columns, +380px → 640px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'entity_name',
    label: 'Ownership Entity',
    sortable: true,
    width: '260px',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'equity_pct',
    label: 'Equity %',
    sortable: true,
    width: '120px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (2 columns, +420px → 1060px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'notes',
    label: 'Notes',
    sortable: false,
    width: '260px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'actions',
    label: '',
    sortable: false,
    width: '160px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
]


export { allColumns }