// ============================================================
// AUTO-GENERATED from example.xlsx
// Generated: 2026-02-24
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 245px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'building_name',
    label: 'Building',
    sortable: true,
    width: '120px',
    align: 'left'
  },
  {
    key: 'sync_alerts',
    label: 'Sync',
    sortable: true,
    width: '45px',
    align: 'center'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (6 columns, +480px → 725px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '120px',
    align: 'left',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '60px',
    align: 'right',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'b_b',
    label: 'Beds/Baths',
    sortable: true,
    width: '60px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
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
    key: 'available_date',
    label: 'Available',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'vacant_days',
    label: 'Vacant',
    sortable: true,
    width: '60px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (4 columns, +320px → 1045px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'turnover_days',
    label: 'Turnover',
    sortable: true,
    width: '60px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'market_base_rent',
    label: 'Market Rent',
    sortable: true,
    width: '80px',
    align: 'right',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'rent_offered',
    label: 'Offered Rent',
    sortable: true,
    width: '80px',
    align: 'right',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'temp_amenities_total',
    label: 'Temp Amenities',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Owner', 'Manager', 'RPM', 'Asset'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (7 columns, +730px → 1775px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'concession_total_pct',
    label: 'Total Concession %',
    sortable: true,
    width: '130px',
    align: 'center',
    roles: ['Owner', 'Manager', 'RPM', 'Asset'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'concession_upfront_amount',
    label: 'Upfront $',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'concession_free_rent_days',
    label: 'Upfront Days',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'concession_display_calc',
    label: 'C%/A%',
    sortable: true,
    width: '90px',
    align: 'center',
    roles: ['Owner', 'Manager', 'RPM', 'Asset'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'pricing_comment',
    label: 'Pricing Note',
    sortable: false,
    width: '150px',
    align: 'left',
    roles: ['Manager', 'RPM', 'Asset'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'actions',
    label: '""',
    sortable: false,
    width: '60px',
    align: 'center',
    roles: ['Manager', 'RPM', 'Asset'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
]

// Role-based column visibility
const roleColumns = {
  Owner: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc'],
  Manager: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'actions'],
  RPM: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'actions'],
  Asset: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'actions']
}


export { allColumns, roleColumns }