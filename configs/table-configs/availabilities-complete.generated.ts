// ============================================================
// AUTO-GENERATED from availabilities.xlsx
// Generated: 2026-02-20
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (4 columns, 305px total)
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
    key: 'sync_alerts',
    label: 'Sync',
    sortable: true,
    width: '45px',
    align: 'center'
  },
  {
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '120px',
    align: 'left',
    departments: ['Leasing']
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '60px',
    align: 'right'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (6 columns, +460px → 765px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    departments: ['Management', 'Leasing'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'available_date',
    label: 'Make Ready',
    sortable: true,
    width: '100px',
    align: 'center',
    departments: ['Maintenance'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'vacant_days',
    label: 'Vacant',
    sortable: true,
    width: '60px',
    align: 'center',
    departments: ['Management', 'Leasing'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },
  {
    key: 'turnover_days',
    label: 'Turnover',
    sortable: true,
    width: '60px',
    align: 'center',
    departments: ['Management', 'Maintenance'],
    class: 'max-md:hidden',
    headerClass: 'max-md:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (2 columns, +160px → 925px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'market_base_rent',
    label: 'Market Rent',
    sortable: true,
    width: '80px',
    align: 'right',
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },
  {
    key: 'rent_offered',
    label: 'Offered Rent',
    sortable: true,
    width: '80px',
    align: 'right',
    departments: ['Management', 'Leasing'],
    class: 'max-lg:hidden',
    headerClass: 'max-lg:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (8 columns, +920px → 1845px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'temp_amenities_total',
    label: 'Temp Amenities',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Owner', 'Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'concession_total_pct',
    label: 'Total Concession %',
    sortable: true,
    width: '130px',
    align: 'center',
    roles: ['Owner', 'Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'concession_upfront_amount',
    label: 'Upfront $',
    sortable: true,
    width: '100px',
    align: 'right',
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'concession_free_rent_days',
    label: 'Upfront Days',
    sortable: true,
    width: '100px',
    align: 'right',
    departments: ['Management', 'Leasing'],
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
    departments: ['Management', 'Leasing'],
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
    departments: ['Management', 'Leasing'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'resident_name',
    label: 'Resident',
    sortable: true,
    width: '150px',
    align: 'left',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    filterGroups: ['applied', 'leased'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },
  {
    key: 'application_date',
    label: 'Applied',
    sortable: true,
    width: '100px',
    align: 'center',
    departments: ['Management', 'Leasing'],
    filterGroups: ['applied'],
    class: 'max-xl:hidden',
    headerClass: 'max-xl:hidden'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 5: Desktop Ultra - 4K ENHANCED (10 columns, +1130px → 2975px total)
  // BREAKPOINT: hidden 2xl:table-cell (1536px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'screening_result',
    label: 'Screening',
    sortable: true,
    width: '110px',
    align: 'center',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    filterGroups: ['applied'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '100px',
    align: 'center',
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'move_in_date',
    label: 'Move-In',
    sortable: true,
    width: '100px',
    align: 'center',
    filterGroups: ['applied', 'leased'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'leasing_agent',
    label: 'Agent',
    sortable: true,
    width: '120px',
    align: 'left',
    departments: ['Management', 'Leasing'],
    filterGroups: ['applied', 'leased'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'lease_start_date',
    label: 'Lease Start',
    sortable: true,
    width: '100px',
    align: 'center',
    departments: ['Management', 'Leasing'],
    filterGroups: ['leased'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'lease_end_date',
    label: 'Lease End',
    sortable: true,
    width: '100px',
    align: 'center',
    departments: ['Management', 'Leasing'],
    filterGroups: ['leased'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'lease_rent_amount',
    label: 'Lease Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    roles: ['Owner', 'Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    filterGroups: ['leased'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'building_name',
    label: 'Building',
    sortable: true,
    width: '150px',
    align: 'left',
    departments: ['Leasing'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
  {
    key: 'resident_email',
    label: 'Email',
    sortable: true,
    width: '150px',
    align: 'left',
    roles: ['Manager', 'RPM', 'Asset'],
    departments: ['Management', 'Leasing'],
    filterGroups: ['applied', 'leased'],
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
    departments: ['Leasing'],
    filterGroups: ['applied', 'leased'],
    class: 'max-2xl:hidden',
    headerClass: 'max-2xl:hidden'
  },
]

// Filter Groups
const filterGroups = {
  all: ['unit_name', 'sync_alerts', 'floor_plan_name', 'sf', 'b_b', 'status', 'available_date', 'available_date', 'vacant_days', 'turnover_days', 'market_base_rent', 'rent_offered', 'temp_amenities_total', 'concession_total_pct', 'concession_upfront_amount', 'concession_free_rent_days', 'concession_display_calc', 'pricing_comment', 'move_out_date', 'building_name'],
  available: ['unit_name', 'sync_alerts', 'floor_plan_name', 'sf', 'b_b', 'status', 'available_date', 'available_date', 'vacant_days', 'turnover_days', 'market_base_rent', 'rent_offered', 'temp_amenities_total', 'concession_total_pct', 'concession_upfront_amount', 'concession_free_rent_days', 'concession_display_calc', 'pricing_comment', 'move_out_date', 'building_name'],
  applied: ['unit_name', 'sync_alerts', 'floor_plan_name', 'sf', 'b_b', 'status', 'available_date', 'available_date', 'vacant_days', 'turnover_days', 'market_base_rent', 'rent_offered', 'temp_amenities_total', 'concession_total_pct', 'concession_upfront_amount', 'concession_free_rent_days', 'concession_display_calc', 'pricing_comment', 'resident_name', 'application_date', 'screening_result', 'move_out_date', 'move_in_date', 'leasing_agent', 'building_name', 'resident_email', 'resident_phone'],
  leased: ['unit_name', 'sync_alerts', 'floor_plan_name', 'sf', 'b_b', 'status', 'available_date', 'available_date', 'vacant_days', 'turnover_days', 'market_base_rent', 'rent_offered', 'temp_amenities_total', 'concession_total_pct', 'concession_upfront_amount', 'concession_free_rent_days', 'concession_display_calc', 'pricing_comment', 'resident_name', 'move_out_date', 'move_in_date', 'leasing_agent', 'lease_start_date', 'lease_end_date', 'lease_rent_amount', 'building_name', 'resident_email', 'resident_phone']
}

// Role-based column visibility
const roleColumns = {
  Owner: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'lease_rent_amount'],
  Manager: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'resident_name', 'screening_result', 'lease_rent_amount', 'resident_email', 'resident_phone'],
  RPM: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'resident_name', 'screening_result', 'lease_rent_amount', 'resident_email', 'resident_phone'],
  Asset: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'resident_name', 'screening_result', 'lease_rent_amount', 'resident_email', 'resident_phone']
}

// Department-based column visibility
const departmentColumns = {
  Management: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'resident_name', 'screening_result', 'lease_rent_amount', 'resident_email'],
  Leasing: ['temp_amenities_total', 'concession_total_pct', 'concession_display_calc', 'pricing_comment', 'resident_name', 'screening_result', 'lease_rent_amount', 'resident_email', 'resident_phone']
}

export { allColumns, filterGroups, roleColumns, departmentColumns }