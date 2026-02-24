// ============================================================
// AUTO-GENERATED from example.xlsx
// Generated: 2026-02-24
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 320px total)
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
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '120px',
    align: 'left'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (5 columns, +380px → 700px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    key: 'market_base_rent',
    label: 'Market Rent',
    sortable: true,
    width: '80px',
    align: 'right',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'lease_rent_amount',
    label: 'Lease Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (4 columns, +430px → 1130px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'temp_amenities_total',
    label: 'Temp Amenities',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'concession_total_pct',
    label: 'Total Concession %',
    sortable: true,
    width: '130px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'concession_upfront_amount',
    label: 'Upfront $',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'concession_free_rent_days',
    label: 'Upfront Days',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (6 columns, +650px → 1780px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'concession_display_calc',
    label: 'C%/A%',
    sortable: true,
    width: '90px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'pricing_comment',
    label: 'Pricing Note',
    sortable: false,
    width: '150px',
    align: 'left',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'application_date',
    label: 'Applied',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'screening_result',
    label: 'Screening',
    sortable: true,
    width: '110px',
    align: 'center',
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
    key: 'move_in_date',
    label: 'Move-In',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 5: Desktop Ultra - 4K ENHANCED (6 columns, +660px → 2440px total)
  // BREAKPOINT: hidden 2xl:table-cell (1536px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'leasing_agent',
    label: 'Agent',
    sortable: true,
    width: '120px',
    align: 'left',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'lease_start_date',
    label: 'Lease Start',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'lease_end_date',
    label: 'Lease End',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true,
    width: '120px',
    align: 'left',
    roles: ['Manager', 'RPM', 'Asset'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'resident_email',
    label: 'Email',
    sortable: true,
    width: '120px',
    align: 'left',
    roles: ['Manager', 'RPM', 'Asset'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'resident_phone',
    label: 'Phone',
    sortable: false,
    width: '100px',
    align: 'left',
    roles: ['Manager', 'RPM', 'Asset'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
]

// Role-based column visibility
const roleColumns = {
  Manager: ['resident_name', 'resident_email', 'resident_phone'],
  RPM: ['resident_name', 'resident_email', 'resident_phone'],
  Asset: ['resident_name', 'resident_email', 'resident_phone']
}


export { allColumns, roleColumns }