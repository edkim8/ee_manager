// ============================================================
// AUTO-GENERATED from availabilities.xlsx
// Generated: 2026-02-16
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
    width: '90px',
    align: 'center'
  },
  {
    key: 'sync_alerts',
    label: 'Sync',
    sortable: true,
    width: '80px',
    align: 'center'
  },
  {
    key: 'building_name',
    label: 'Building',
    sortable: true,
    width: '150px',
    align: 'left'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (4 columns, +420px → 740px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '130px',
    align: 'left',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '80px',
    align: 'right',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'b_b',
    label: 'Beds/Baths',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (4 columns, +400px → 1140px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'rent_offered',
    label: 'Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'available_date',
    label: 'Available',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'vacant_days',
    label: 'Vacant',
    sortable: true,
    width: '80px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (5 columns, +680px → 1820px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'turnover_days',
    label: 'Turnover',
    sortable: true,
    width: '90px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'temp_amenities_total',
    label: 'Temp Amenities',
    sortable: true,
    width: '120px',
    align: 'right',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true,
    width: '160px',
    align: 'left',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'resident_email',
    label: 'Email',
    sortable: true,
    width: '200px',
    align: 'left',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'application_date',
    label: 'Applied',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 5: Desktop Ultra - 4K ENHANCED (10 columns, +1130px → 2950px total)
  // BREAKPOINT: hidden 2xl:table-cell (1536px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'screening_result',
    label: 'Screening',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'move_in_date',
    label: 'Move-In',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'concession_total_pct',
    label: 'Total Concession %',
    sortable: true,
    width: '130px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'concession_display_calc',
    label: 'C%/A%',
    sortable: true,
    width: '90px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'concession_upfront_amount',
    label: 'Upfront $',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
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
    width: '110px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'lease_end_date',
    label: 'Lease End',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'lease_rent_amount',
    label: 'Lease Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'pricing_comment',
    label: 'Pricing Note',
    sortable: false,
    width: '150px',
    align: 'left',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
]

// Filter Groups
const filterGroups = {
  all: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'b_b', 'status', 'rent_offered', 'available_date', 'temp_amenities_total', 'resident_name', 'move_in_date', 'pricing_comment'],
  available: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'b_b', 'status', 'rent_offered', 'available_date', 'vacant_days', 'move_out_date', 'turnover_days', 'temp_amenities_total', 'resident_name', 'move_in_date', 'pricing_comment'],
  applied: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'b_b', 'status', 'rent_offered', 'available_date', 'temp_amenities_total', 'resident_name', 'resident_email', 'application_date', 'screening_result', 'move_in_date', 'concession_total_pct', 'concession_display_calc', 'concession_upfront_amount', 'leasing_agent', 'pricing_comment'],
  leased: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'b_b', 'status', 'rent_offered', 'available_date', 'temp_amenities_total', 'resident_name', 'resident_email', 'move_in_date', 'concession_total_pct', 'concession_display_calc', 'concession_upfront_amount', 'lease_start_date', 'lease_end_date', 'lease_rent_amount', 'pricing_comment']
}

// Role-based column visibility
const roleColumns = {
  Owner: ['rent_offered', 'temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'concession_upfront_amount', 'lease_rent_amount'],
  Manager: ['rent_offered', 'temp_amenities_total', 'resident_name', 'resident_email', 'screening_result', 'concession_total_pct', 'concession_display_calc', 'concession_upfront_amount', 'lease_rent_amount', 'pricing_comment'],
  RPM: ['rent_offered', 'temp_amenities_total', 'resident_name', 'resident_email', 'screening_result', 'concession_total_pct', 'concession_display_calc', 'concession_upfront_amount', 'lease_rent_amount', 'pricing_comment']
}

// Department-based column visibility
const departmentColumns = {
  Management: ['rent_offered', 'temp_amenities_total', 'resident_name', 'resident_email', 'screening_result', 'concession_total_pct', 'concession_display_calc', 'concession_upfront_amount', 'lease_rent_amount', 'pricing_comment'],
  Leasing: ['resident_name', 'resident_email', 'screening_result']
}
export { allColumns, filterGroups, roleColumns, departmentColumns }
