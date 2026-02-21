// ============================================================
// AUTO-GENERATED from work_orders.xlsx
// Generated: 2026-02-20
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 330px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'work_order_number',
    label: 'WO #',
    sortable: true,
    width: '100px'
  },
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '100px'
  },
  {
    key: 'category',
    label: 'Category',
    sortable: true,
    width: '130px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (2 columns, +350px → 680px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'priority',
    label: 'Priority',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'description',
    label: 'Description',
    sortable: false,
    width: '250px',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (3 columns, +410px → 1090px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'assigned_to',
    label: 'Assigned',
    sortable: true,
    width: '150px',
    departments: ['maintenance', 'operations'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    width: '130px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'completed_at',
    label: 'Completed',
    sortable: true,
    width: '130px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (1 columns, +110px → 1200px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
]

// Filter Groups
const filterGroups = {
  open: ['work_order_number', 'unit_name', 'category', 'priority', 'description', 'assigned_to', 'created_at', 'completed_at', 'status'],
  in_progress: ['work_order_number', 'unit_name', 'category', 'priority', 'description', 'assigned_to', 'created_at', 'completed_at', 'status'],
  completed: ['work_order_number', 'unit_name', 'category', 'priority', 'description', 'assigned_to', 'created_at', 'completed_at', 'status'],
  all: ['work_order_number', 'unit_name', 'category', 'priority', 'description', 'assigned_to', 'created_at', 'completed_at', 'status']
}


export { allColumns, filterGroups }