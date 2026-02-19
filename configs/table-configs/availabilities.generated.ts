// ============================================================
// AUTO-GENERATED from availabilities.xlsx
// Generated: 2026-02-15
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
    width: '150px'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (4 columns, +390px → 710px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '130px',
    class: 'hidden md:table-cell',
    headerClass: 'hidden md:table-cell'
  },
  {
    key: 'sf',
    label: 'SF',
    sortable: true,
    width: '80px',
    align: 'right',
    class: 'hidden md:table-cell',
    headerClass: 'hidden md:table-cell'
  },
  {
    key: 'bedroom_count',
    label: 'Beds',
    sortable: true,
    width: '70px',
    align: 'center',
    class: 'hidden md:table-cell',
    headerClass: 'hidden md:table-cell'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden md:table-cell',
    headerClass: 'hidden md:table-cell'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Desktop Basic (4 columns, +400px → 1110px total)
  // BREAKPOINT: hidden lg:table-cell (1024px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'rent_offered',
    label: 'Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'hidden lg:table-cell',
    headerClass: 'hidden lg:table-cell'
  },
  {
    key: 'available_date',
    label: 'Available',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden lg:table-cell',
    headerClass: 'hidden lg:table-cell'
  },
  {
    key: 'vacant_days',
    label: 'Vacant',
    sortable: true,
    width: '80px',
    align: 'center',
    class: 'hidden lg:table-cell',
    headerClass: 'hidden lg:table-cell'
  },
  {
    key: 'move_out_date',
    label: 'Move Out',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden lg:table-cell',
    headerClass: 'hidden lg:table-cell'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Desktop Wide - QHD BASELINE (5 columns, +710px → 1820px total)
  // BREAKPOINT: hidden xl:table-cell (1280px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'resident_name',
    label: 'Applicant',
    sortable: true,
    width: '160px',
    class: 'hidden xl:table-cell',
    headerClass: 'hidden xl:table-cell'
  },
  {
    key: 'resident_email',
    label: 'Email',
    sortable: true,
    width: '200px',
    class: 'hidden xl:table-cell',
    headerClass: 'hidden xl:table-cell'
  },
  {
    key: 'application_date',
    label: 'Applied',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden xl:table-cell',
    headerClass: 'hidden xl:table-cell'
  },
  {
    key: 'screening_result',
    label: 'Screening',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden xl:table-cell',
    headerClass: 'hidden xl:table-cell'
  },
  {
    key: 'move_in_date',
    label: 'Target Move-In',
    sortable: true,
    width: '130px',
    align: 'center',
    class: 'hidden xl:table-cell',
    headerClass: 'hidden xl:table-cell'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 5: Desktop Ultra - 4K ENHANCED (5 columns, +550px → 2370px total)
  // BREAKPOINT: hidden 2xl:table-cell (1536px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'concession_display',
    label: '% Concession',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden 2xl:table-cell',
    headerClass: 'hidden 2xl:table-cell'
  },
  {
    key: 'leasing_agent',
    label: 'Agent',
    sortable: true,
    width: '120px',
    class: 'hidden 2xl:table-cell',
    headerClass: 'hidden 2xl:table-cell'
  },
  {
    key: 'lease_start_date',
    label: 'Lease Start',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden 2xl:table-cell',
    headerClass: 'hidden 2xl:table-cell'
  },
  {
    key: 'lease_end_date',
    label: 'Lease End',
    sortable: true,
    width: '110px',
    align: 'center',
    class: 'hidden 2xl:table-cell',
    headerClass: 'hidden 2xl:table-cell'
  },
  {
    key: 'lease_rent_amount',
    label: 'Lease Rent',
    sortable: true,
    width: '100px',
    align: 'right',
    class: 'hidden 2xl:table-cell',
    headerClass: 'hidden 2xl:table-cell'
  },
]

// Filter Groups
const filterGroups = {
  available: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'bedroom_count', 'status', 'rent_offered', 'available_date', 'vacant_days', 'move_out_date', 'resident_name', 'resident_email', 'application_date', 'screening_result', 'move_in_date', 'concession_display', 'leasing_agent', 'lease_start_date', 'lease_end_date', 'lease_rent_amount'],
  applied: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'bedroom_count', 'status', 'rent_offered', 'available_date', 'vacant_days', 'move_out_date', 'resident_name', 'resident_email', 'application_date', 'screening_result', 'move_in_date', 'concession_display', 'leasing_agent', 'lease_start_date', 'lease_end_date', 'lease_rent_amount'],
  leased: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'bedroom_count', 'status', 'rent_offered', 'available_date', 'vacant_days', 'move_out_date', 'resident_name', 'resident_email', 'application_date', 'screening_result', 'move_in_date', 'concession_display', 'leasing_agent', 'lease_start_date', 'lease_end_date', 'lease_rent_amount'],
  all: ['unit_name', 'sync_alerts', 'building_name', 'floor_plan_name', 'sf', 'bedroom_count', 'status', 'rent_offered', 'available_date', 'vacant_days', 'move_out_date', 'resident_name', 'resident_email', 'application_date', 'screening_result', 'move_in_date', 'concession_display', 'leasing_agent', 'lease_start_date', 'lease_end_date', 'lease_rent_amount']
}

// Role-based column visibility
const roleColumns = {
  admin: ['resident_name', 'resident_email', 'screening_result', 'concession_display'],
  leasing: ['resident_name', 'resident_email', 'screening_result'],
  finance: ['concession_display']
}

// Department-based column visibility
const departmentColumns = {
  leasing: ['resident_name', 'resident_email', 'screening_result', 'concession_display'],
  operations: ['resident_name', 'resident_email'],
  finance: ['concession_display']
}