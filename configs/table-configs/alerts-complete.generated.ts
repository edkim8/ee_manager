// ============================================================
// AUTO-GENERATED from alerts.xlsx
// Generated: 2026-02-20
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (4 columns, 380px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '80px'
  },
  {
    key: 'building_name',
    label: 'Building',
    sortable: true,
    width: '100px'
  },
  {
    key: 'alert_type',
    label: 'Type',
    sortable: true,
    width: '100px',
    align: 'center'
  },
  {
    key: ' ',
    label: ' ',
    sortable: false,
    width: '100px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (3 columns, +310px → 690px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'severity',
    label: 'Severity',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    width: '130px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'days_open',
    label: 'Days Open',
    sortable: true,
    width: '80px',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (2 columns, +380px → 1070px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'description',
    label: 'Description',
    sortable: false,
    width: '250px',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'resolved_at',
    label: 'Resolved',
    sortable: true,
    width: '130px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
]

// Filter Groups
const filterGroups = {
  active: ['unit_name', 'building_name', 'alert_type', 'severity', 'created_at', 'days_open', 'description', 'resolved_at', ' '],
  resolved: ['unit_name', 'building_name', 'alert_type', 'severity', 'created_at', 'days_open', 'description', 'resolved_at', ' '],
  all: ['unit_name', 'building_name', 'alert_type', 'severity', 'created_at', 'days_open', 'description', 'resolved_at', ' ']
}


export { allColumns, filterGroups }