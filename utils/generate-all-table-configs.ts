/**
 * Generate All Table Configurations
 *
 * Creates Excel configurations for all existing tables based on current Vue components.
 *
 * Usage:
 *   npx tsx utils/generate-all-table-configs.ts
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

// Helper: Calculate priority based on cumulative width
const calculatePriority = (cumulativeWidth: number): string => {
  if (cumulativeWidth <= 350) return 'P1'
  if (cumulativeWidth <= 780) return 'P2'
  if (cumulativeWidth <= 1140) return 'P3'
  if (cumulativeWidth <= 1880) return 'P4'
  return 'P5'
}

// Helper: Generate Excel workbook from table definition
function generateTableConfig(tableConfig: any): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  // ============================================================
  // Sheet 1: Column Definitions
  // ============================================================
  const columnsData: any[][] = [
    ['key', 'label', 'width', 'sortable', 'align', 'priority', 'roles', 'departments', 'filter_groups', 'notes']
  ]

  let cumulativeWidth = 0
  tableConfig.columns.forEach((col: any) => {
    cumulativeWidth += col.width
    const priority = calculatePriority(cumulativeWidth)
    columnsData.push([
      col.key,
      col.label,
      col.width,
      col.sortable ? 'TRUE' : 'FALSE',
      col.align || '',
      priority,
      col.roles || 'all',
      col.departments || 'all',
      col.filter_groups || 'all',
      col.notes || ''
    ])
  })

  const columnsSheet = XLSX.utils.aoa_to_sheet(columnsData)
  columnsSheet['!cols'] = [
    { wch: 25 },  // key
    { wch: 20 },  // label
    { wch: 10 },  // width
    { wch: 10 },  // sortable
    { wch: 10 },  // align
    { wch: 12 },  // priority
    { wch: 25 },  // roles
    { wch: 25 },  // departments
    { wch: 25 },  // filter_groups
    { wch: 35 }   // notes
  ]

  XLSX.utils.book_append_sheet(workbook, columnsSheet, 'Column Definitions')

  // ============================================================
  // Sheet 2: Table Configuration
  // ============================================================
  const configData = [
    ['Parameter', 'Value'],
    ['table_name', tableConfig.table_name],
    ['file_path', tableConfig.file_path],
    ['has_filter_groups', tableConfig.has_filter_groups ? 'TRUE' : 'FALSE'],
    ['default_sort_field', tableConfig.default_sort_field],
    ['default_sort_direction', tableConfig.default_sort_direction || 'asc'],
    ['enable_pagination', 'TRUE'],
    ['page_size', 25],
    ['enable_export', 'TRUE'],
    ['clickable_rows', 'TRUE']
  ]

  const configSheet = XLSX.utils.aoa_to_sheet(configData)
  configSheet['!cols'] = [{ wch: 25 }, { wch: 50 }]

  XLSX.utils.book_append_sheet(workbook, configSheet, 'Table Configuration')

  // ============================================================
  // Sheet 3: Filter Groups
  // ============================================================
  const filterData: any[][] = [['group_name', 'label', 'description']]

  if (tableConfig.filter_groups) {
    tableConfig.filter_groups.forEach((fg: any) => {
      filterData.push([fg.name, fg.label, fg.description || ''])
    })
  } else {
    filterData.push(['all', 'All Items', 'Show all records'])
  }

  const filterSheet = XLSX.utils.aoa_to_sheet(filterData)
  filterSheet['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 45 }]

  XLSX.utils.book_append_sheet(workbook, filterSheet, 'Filter Groups')

  // ============================================================
  // Sheet 4: Priority Reference
  // ============================================================
  const priorityData = [
    ['Priority', 'Max Cumulative Width', 'Breakpoint', 'Devices', 'Target Columns'],
    ['P1', '350px', 'base (no class)', 'Phone (portrait)', '2-3 columns'],
    ['P2', '780px', 'md: (768px+)', 'Tablet (portrait), Phone (landscape)', '+3-4 columns'],
    ['P3', '1140px', 'lg: (1024px+)', 'Tablet (landscape), Desktop', '+2-3 columns'],
    ['P4', '1880px', 'xl: (1280px+)', 'QHD, 4K (scaled) ⭐', '+4-5 columns'],
    ['P5', '2520px', '2xl: (1536px+)', '4K (native), Ultra-wide', '+4-5 columns']
  ]

  const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData)
  prioritySheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 20 }]

  XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Reference')

  // ============================================================
  // Sheet 5: Instructions
  // ============================================================
  const instructionsData = [
    [`${tableConfig.table_name} Table - Configuration`],
    [''],
    ['QUICK START:'],
    ['1. Review the "Column Definitions" sheet - columns are from existing Vue component'],
    ['2. Adjust column widths, order, or priorities as needed'],
    ['3. Modify roles/departments restrictions if needed'],
    ['4. Run: npx tsx utils/table-config-parser.ts configs/table-configs/' + tableConfig.table_name + '.xlsx'],
    ['5. Copy generated code to: ' + tableConfig.file_path],
    [''],
    ['PRIORITY AUTO-CALCULATION:'],
    ['Priorities are pre-calculated based on current column widths.'],
    ['To change priorities: adjust column widths or reorder columns.'],
    [''],
    ['CURRENT CONFIGURATION:'],
    [`Total Columns: ${tableConfig.columns.length}`],
    [`Default Sort: ${tableConfig.default_sort_field}`],
    [`Filter Groups: ${tableConfig.filter_groups ? tableConfig.filter_groups.length : 0}`],
    [''],
    ['For detailed documentation, see: /docs/tools/EXCEL_TABLE_CONFIG_TEMPLATE.md']
  ]

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
  instructionsSheet['!cols'] = [{ wch: 100 }]

  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

  return workbook
}

// ============================================================
// Table Definitions
// ============================================================

const tableDefinitions = [
  // 1. Properties
  {
    table_name: 'properties',
    file_path: 'layers/ops/pages/assets/properties/index.vue',
    has_filter_groups: false,
    default_sort_field: 'name',
    columns: [
      { key: 'code', label: 'Code', width: 100, sortable: true, notes: 'Property code identifier' },
      { key: 'name', label: 'Name', width: 200, sortable: true, notes: 'Property name' },
      { key: 'website_url', label: 'Website', width: 120, sortable: false, notes: 'External website link' },
      { key: 'street_address', label: 'Address', width: 200, sortable: true, notes: 'Street address' },
      { key: 'city', label: 'City', width: 150, sortable: true, notes: 'City' },
      { key: 'state_code', label: 'ST', width: 60, sortable: true, align: 'center', notes: 'State code' },
      { key: 'total_unit_count', label: 'Units', width: 100, sortable: true, align: 'right', notes: 'Total units' },
      { key: 'year_built', label: 'Year', width: 80, sortable: true, align: 'right', notes: 'Year built' }
    ]
  },

  // 2. Buildings
  {
    table_name: 'buildings',
    file_path: 'layers/ops/pages/assets/buildings/index.vue',
    has_filter_groups: false,
    default_sort_field: 'name',
    columns: [
      { key: 'name', label: 'Building', width: 200, sortable: true, notes: 'Building name' },
      { key: 'unit_count', label: 'Units', width: 100, sortable: true, align: 'right', notes: 'Unit count' },
      { key: 'floor_plans_data', label: 'Floor Plans', width: 250, sortable: false, notes: 'Associated floor plans' },
      { key: 'street_address', label: 'Address', width: 200, sortable: false, notes: 'Street address' },
      { key: 'floor_count', label: 'Floors', width: 100, sortable: true, align: 'center', notes: 'Number of floors' }
    ]
  },

  // 3. Floor Plans
  {
    table_name: 'floor_plans',
    file_path: 'layers/ops/pages/assets/floor-plans/index.vue',
    has_filter_groups: false,
    default_sort_field: 'marketing_name',
    columns: [
      { key: 'code', label: 'Code', width: 100, sortable: true, notes: 'Floor plan code' },
      { key: 'marketing_name', label: 'Marketing Name', width: 200, sortable: true, notes: 'Public-facing name' },
      { key: 'bedroom_count', label: 'Beds', width: 80, sortable: true, align: 'center', notes: 'Bedrooms' },
      { key: 'bathroom_count', label: 'Baths', width: 80, sortable: true, align: 'center', notes: 'Bathrooms' },
      { key: 'sf', label: 'SF', width: 100, sortable: true, align: 'right', notes: 'Square footage' },
      { key: 'unit_count', label: 'Units', width: 100, sortable: true, align: 'right', notes: 'Total units with this plan' },
      { key: 'base_rent', label: 'Base Rent', width: 120, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,operations', notes: 'Base rent amount' }
    ]
  },

  // 4. Units (from earlier read)
  {
    table_name: 'units',
    file_path: 'layers/ops/pages/assets/units/index.vue',
    has_filter_groups: false,
    default_sort_field: 'unit_name',
    columns: [
      { key: 'unit_name', label: 'Unit', width: 120, sortable: true, notes: 'Unit number/name' },
      { key: 'building_name', label: 'Building', width: 180, sortable: true, notes: 'Building name' },
      { key: 'resident_name', label: 'Resident', width: 180, sortable: true, roles: 'Owner,Manager', departments: 'Leasing,Management', notes: 'Current resident' },
      { key: 'floor_plan_marketing_name', label: 'Floor Plan', width: 180, sortable: true, notes: 'Floor plan type' },
      { key: 'b_b', label: 'Bed/Bath', width: 90, sortable: true, align: 'center', notes: 'Bedroom x Bathroom (e.g., 3x2)' },
      { key: 'sf', label: 'SF', width: 80, sortable: true, align: 'right', notes: 'Square footage' },
      { key: 'tenancy_status', label: 'Tenancy', width: 120, sortable: true, align: 'center', notes: 'Current, Past, Future, Notice' },
      { key: 'move_in_date', label: 'In', width: 110, sortable: true, align: 'center', notes: 'Move-in date' },
      { key: 'move_out_date', label: 'Out', width: 110, sortable: true, align: 'center', notes: 'Move-out date' },
      { key: 'floor_number', label: 'Floor', width: 80, sortable: true, align: 'center', notes: 'Floor number' }
    ]
  },

  // 5. Residents
  {
    table_name: 'residents',
    file_path: 'layers/ops/pages/office/residents/index.vue',
    has_filter_groups: true,
    default_sort_field: 'last_name',
    filter_groups: [
      { name: 'current', label: 'Current', description: 'Active residents' },
      { name: 'future', label: 'Future', description: 'Upcoming move-ins' },
      { name: 'past', label: 'Past', description: 'Moved out' },
      { name: 'all', label: 'All', description: 'All statuses' }
    ],
    columns: [
      { key: 'last_name', label: 'Last Name', width: 150, sortable: true, filter_groups: 'all', notes: 'Resident last name' },
      { key: 'first_name', label: 'First Name', width: 150, sortable: true, filter_groups: 'all', notes: 'Resident first name' },
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, filter_groups: 'all', notes: 'Unit number' },
      { key: 'status', label: 'Status', width: 110, sortable: true, align: 'center', filter_groups: 'all', notes: 'Current, Future, Past, Notice' },
      { key: 'email', label: 'Email', width: 200, sortable: true, roles: 'admin,leasing', departments: 'leasing,operations', filter_groups: 'current,future,all', notes: 'Contact email - PII' },
      { key: 'phone', label: 'Phone', width: 130, sortable: true, roles: 'admin,leasing', departments: 'leasing,operations', filter_groups: 'current,future,all', notes: 'Contact phone - PII' },
      { key: 'move_in_date', label: 'Move In', width: 110, sortable: true, align: 'center', filter_groups: 'current,future,all', notes: 'Move-in date' },
      { key: 'move_out_date', label: 'Move Out', width: 110, sortable: true, align: 'center', filter_groups: 'current,past,all', notes: 'Move-out date' },
      { key: 'lease_end_date', label: 'Lease End', width: 110, sortable: true, align: 'center', filter_groups: 'current,all', notes: 'Lease expiration' }
    ]
  },

  // 6. Leases
  {
    table_name: 'leases',
    file_path: 'layers/ops/pages/office/leases/index.vue',
    has_filter_groups: false,
    default_sort_field: 'lease_start_date',
    default_sort_direction: 'desc',
    columns: [
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, notes: 'Unit number' },
      { key: 'resident_name', label: 'Resident', width: 180, sortable: true, notes: 'Primary resident' },
      { key: 'lease_start_date', label: 'Start Date', width: 110, sortable: true, align: 'center', notes: 'Lease start' },
      { key: 'lease_end_date', label: 'End Date', width: 110, sortable: true, align: 'center', notes: 'Lease end' },
      { key: 'term_months', label: 'Term', width: 80, sortable: true, align: 'center', notes: 'Lease term in months' },
      { key: 'rent_amount', label: 'Rent', width: 120, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,operations', notes: 'Monthly rent' },
      { key: 'status', label: 'Status', width: 110, sortable: true, align: 'center', notes: 'Current, Future, Past' },
      { key: 'lease_type', label: 'Type', width: 100, sortable: true, align: 'center', notes: 'Fixed, MTM' }
    ]
  },

  // 7. Alerts
  {
    table_name: 'alerts',
    file_path: 'layers/ops/pages/office/alerts/index.vue',
    has_filter_groups: true,
    default_sort_field: 'created_at',
    default_sort_direction: 'desc',
    filter_groups: [
      { name: 'active', label: 'Active', description: 'Current alerts' },
      { name: 'resolved', label: 'Resolved', description: 'Closed alerts' },
      { name: 'all', label: 'All', description: 'All statuses' }
    ],
    columns: [
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, filter_groups: 'all', notes: 'Related unit' },
      { key: 'alert_type', label: 'Type', width: 150, sortable: true, filter_groups: 'all', notes: 'Alert category' },
      { key: 'severity', label: 'Severity', width: 100, sortable: true, align: 'center', filter_groups: 'active,all', notes: 'Low, Medium, High, Critical' },
      { key: 'description', label: 'Description', width: 300, sortable: false, filter_groups: 'all', notes: 'Alert details' },
      { key: 'created_at', label: 'Created', width: 130, sortable: true, align: 'center', filter_groups: 'all', notes: 'Alert timestamp' },
      { key: 'resolved_at', label: 'Resolved', width: 130, sortable: true, align: 'center', filter_groups: 'resolved,all', notes: 'Resolution timestamp' },
      { key: 'assigned_to', label: 'Assigned', width: 150, sortable: true, roles: 'admin,manager', departments: 'operations', filter_groups: 'active,all', notes: 'Assigned staff' }
    ]
  },

  // 8. Delinquencies (Delinquent Residents)
  {
    table_name: 'delinquencies',
    file_path: 'layers/ops/pages/office/delinquencies/index.vue',
    has_filter_groups: false,
    default_sort_field: 'balance_amount',
    default_sort_direction: 'desc',
    columns: [
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, notes: 'Unit number' },
      { key: 'resident_name', label: 'Resident', width: 180, sortable: true, notes: 'Resident name' },
      { key: 'balance_amount', label: 'Balance', width: 120, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance', notes: 'Outstanding balance' },
      { key: 'days_overdue', label: 'Days Overdue', width: 120, sortable: true, align: 'center', notes: 'Days past due' },
      { key: 'last_payment_date', label: 'Last Payment', width: 130, sortable: true, align: 'center', notes: 'Most recent payment' },
      { key: 'last_payment_amount', label: 'Last Amount', width: 120, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance', notes: 'Last payment amount' },
      { key: 'status', label: 'Status', width: 110, sortable: true, align: 'center', notes: 'Current status' }
    ]
  },

  // 9. Work Orders
  {
    table_name: 'work_orders',
    file_path: 'layers/ops/pages/maintenance/work-orders/index.vue',
    has_filter_groups: true,
    default_sort_field: 'created_at',
    default_sort_direction: 'desc',
    filter_groups: [
      { name: 'open', label: 'Open', description: 'Active work orders' },
      { name: 'in_progress', label: 'In Progress', description: 'Currently being worked on' },
      { name: 'completed', label: 'Completed', description: 'Finished work orders' },
      { name: 'all', label: 'All', description: 'All statuses' }
    ],
    columns: [
      { key: 'work_order_number', label: 'WO #', width: 100, sortable: true, filter_groups: 'all', notes: 'Work order number' },
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, filter_groups: 'all', notes: 'Unit location' },
      { key: 'category', label: 'Category', width: 130, sortable: true, filter_groups: 'all', notes: 'Work type' },
      { key: 'priority', label: 'Priority', width: 100, sortable: true, align: 'center', filter_groups: 'open,in_progress,all', notes: 'Low, Medium, High, Emergency' },
      { key: 'description', label: 'Description', width: 250, sortable: false, filter_groups: 'all', notes: 'Work details' },
      { key: 'assigned_to', label: 'Assigned', width: 150, sortable: true, departments: 'maintenance,operations', filter_groups: 'open,in_progress,all', notes: 'Assigned technician' },
      { key: 'created_at', label: 'Created', width: 130, sortable: true, align: 'center', filter_groups: 'all', notes: 'Creation date' },
      { key: 'completed_at', label: 'Completed', width: 130, sortable: true, align: 'center', filter_groups: 'completed,all', notes: 'Completion date' },
      { key: 'status', label: 'Status', width: 110, sortable: true, align: 'center', filter_groups: 'all', notes: 'Current status' }
    ]
  },

  // 10. Renewals (Renewal Worksheets)
  {
    table_name: 'renewals',
    file_path: 'layers/ops/pages/office/renewals/index.vue',
    has_filter_groups: true,
    default_sort_field: 'lease_end_date',
    filter_groups: [
      { name: 'upcoming', label: 'Upcoming', description: 'Leases expiring soon' },
      { name: 'offered', label: 'Offered', description: 'Renewal offers sent' },
      { name: 'accepted', label: 'Accepted', description: 'Renewals accepted' },
      { name: 'declined', label: 'Declined', description: 'Renewals declined' },
      { name: 'all', label: 'All', description: 'All statuses' }
    ],
    columns: [
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, filter_groups: 'all', notes: 'Unit number' },
      { key: 'resident_name', label: 'Resident', width: 180, sortable: true, filter_groups: 'all', notes: 'Resident name' },
      { key: 'lease_end_date', label: 'Lease End', width: 110, sortable: true, align: 'center', filter_groups: 'all', notes: 'Current lease end' },
      { key: 'days_until_expiration', label: 'Days Left', width: 100, sortable: true, align: 'center', filter_groups: 'upcoming,all', notes: 'Days until expiration' },
      { key: 'current_rent', label: 'Current Rent', width: 120, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', filter_groups: 'all', notes: 'Current rent amount' },
      { key: 'renewal_rent', label: 'Renewal Rent', width: 120, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', filter_groups: 'offered,accepted,all', notes: 'Proposed rent' },
      { key: 'increase_amount', label: 'Increase', width: 100, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance', filter_groups: 'offered,accepted,all', notes: 'Rent increase' },
      { key: 'increase_percent', label: '%', width: 70, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance', filter_groups: 'offered,accepted,all', notes: 'Increase %' },
      { key: 'status', label: 'Status', width: 110, sortable: true, align: 'center', filter_groups: 'all', notes: 'Renewal status' },
      { key: 'offer_date', label: 'Offer Date', width: 110, sortable: true, align: 'center', filter_groups: 'offered,accepted,declined,all', notes: 'Date offered' },
      { key: 'response_date', label: 'Response', width: 110, sortable: true, align: 'center', filter_groups: 'accepted,declined,all', notes: 'Resident response date' }
    ]
  },

  // 11. Renewals Items (Standard Leases)
  {
    table_name: 'renewal_items_standard',
    file_path: 'layers/ops/pages/office/renewals/items-standard.vue',
    has_filter_groups: false,
    default_sort_field: 'lease_end_date',
    columns: [
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, notes: 'Unit number' },
      { key: 'resident_name', label: 'Resident', width: 180, sortable: true, notes: 'Resident name' },
      { key: 'floor_plan', label: 'Floor Plan', width: 130, sortable: true, notes: 'Floor plan type' },
      { key: 'lease_end_date', label: 'Lease End', width: 110, sortable: true, align: 'center', notes: 'Expiration date' },
      { key: 'current_rent', label: 'Current', width: 110, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', notes: 'Current rent' },
      { key: 'market_rent', label: 'Market', width: 110, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', notes: 'Market rent' },
      { key: 'recommended_rent', label: 'Recommended', width: 130, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', notes: 'System recommendation' },
      { key: 'proposed_rent', label: 'Proposed', width: 110, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', notes: 'Manager proposal' },
      { key: 'term_months', label: 'Term', width: 80, sortable: true, align: 'center', notes: 'Renewal term' }
    ]
  },

  // 13. Ownership Entities
  {
    table_name: 'ownership_entities',
    file_path: 'layers/owners/pages/owners/entities.vue',
    has_filter_groups: false,
    default_sort_field: 'name',
    columns: [
      { key: 'name',            label: 'Entity Name',     width: 200, sortable: true,  notes: 'Legal or trade name of the ownership entity' },
      { key: 'entity_type',     label: 'Type',            width: 110, sortable: true,  align: 'center', notes: 'LLC, Corporation, Individual, Partnership, REIT' },
      { key: 'actions',         label: '',                width: 60,  sortable: false, align: 'center', notes: 'Edit action button' },
      { key: 'legal_title',     label: 'Legal Title',     width: 200, sortable: true,  notes: 'Full legal name if different from entity name' },
      { key: 'tax_id',          label: 'Tax ID',          width: 120, sortable: false, notes: 'EIN or SSN (XX-XXXXXXX format)' },
      { key: 'address',         label: 'Address',         width: 220, sortable: false, notes: 'Combined address (line1, line2, city, state, zip)' },
      { key: 'distribution_gl', label: 'Distribution GL', width: 120, sortable: false, align: 'center', roles: 'Asset', notes: 'Yardi GL code for distributions (e.g. 300-0000)' },
      { key: 'contribution_gl', label: 'Contribution GL', width: 120, sortable: false, align: 'center', roles: 'Asset', notes: 'Yardi GL code for contributions (e.g. 310-0000)' },
    ]
  },

  // 14. Property Ownership (Entity ↔ Property MTM)
  {
    table_name: 'property_ownership',
    file_path: 'layers/owners/pages/owners/property-ownership.vue',
    has_filter_groups: false,
    default_sort_field: 'property_code',
    columns: [
      { key: 'property_code', label: 'Property',         width: 180, sortable: true,  notes: 'Property code and name' },
      { key: 'entity_name',   label: 'Ownership Entity', width: 200, sortable: true,  notes: 'Name of the owning entity' },
      { key: 'equity_pct',    label: 'Equity %',         width: 90,  sortable: true,  align: 'right', notes: 'Entity ownership percentage (0–100)' },
      { key: 'actions',       label: '',                 width: 80,  sortable: false, align: 'center', notes: 'Edit/delete action buttons' },
      { key: 'notes',         label: 'Notes',            width: 220, sortable: false, notes: 'Optional notes about the ownership arrangement' },
    ]
  },

  // 12. Renewals Items (Month-to-Month)
  {
    table_name: 'renewal_items_mtm',
    file_path: 'layers/ops/pages/office/renewals/items-mtm.vue',
    has_filter_groups: false,
    default_sort_field: 'unit_name',
    columns: [
      { key: 'unit_name', label: 'Unit', width: 100, sortable: true, notes: 'Unit number' },
      { key: 'resident_name', label: 'Resident', width: 180, sortable: true, notes: 'Resident name' },
      { key: 'floor_plan', label: 'Floor Plan', width: 130, sortable: true, notes: 'Floor plan type' },
      { key: 'mtm_start_date', label: 'MTM Since', width: 110, sortable: true, align: 'center', notes: 'MTM start date' },
      { key: 'days_on_mtm', label: 'Days MTM', width: 100, sortable: true, align: 'center', notes: 'Duration on MTM' },
      { key: 'current_rent', label: 'Current', width: 110, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', notes: 'Current rent' },
      { key: 'market_rent', label: 'Market', width: 110, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', notes: 'Market rent' },
      { key: 'proposed_rent', label: 'Proposed', width: 110, sortable: true, align: 'right', roles: 'admin,finance', departments: 'finance,leasing', notes: 'New MTM rate' },
      { key: 'last_increase_date', label: 'Last Increase', width: 120, sortable: true, align: 'center', notes: 'Most recent rent increase' }
    ]
  }
]

// ============================================================
// Main Function
// ============================================================

async function main() {
  const outputDir = 'configs/table-configs'

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('🏗️  Generating table configurations...\n')

  let successCount = 0
  let totalColumns = 0

  tableDefinitions.forEach((tableDef) => {
    const outputPath = path.join(outputDir, `${tableDef.table_name}.xlsx`)

    try {
      const workbook = generateTableConfig(tableDef)
      XLSX.writeFile(workbook, outputPath)

      const priorities = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 }
      let cumWidth = 0
      tableDef.columns.forEach((col: any) => {
        cumWidth += col.width
        const p = calculatePriority(cumWidth)
        priorities[p]++
      })

      console.log(`✅ ${tableDef.table_name}.xlsx`)
      console.log(`   📋 ${tableDef.columns.length} columns`)
      console.log(`   📊 P1:${priorities.P1} P2:${priorities.P2} P3:${priorities.P3} P4:${priorities.P4} P5:${priorities.P5}`)
      console.log(`   📁 ${tableDef.file_path}`)
      console.log('')

      successCount++
      totalColumns += tableDef.columns.length
    } catch (error: any) {
      console.error(`❌ Failed to generate ${tableDef.table_name}.xlsx: ${error.message}`)
    }
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Generated ${successCount}/${tableDefinitions.length} table configurations`)
  console.log(`📋 Total columns: ${totalColumns}`)
  console.log(`📁 Output directory: ${outputDir}`)
  console.log('')
  console.log('Next steps:')
  console.log('1. Review each .xlsx file and adjust columns/widths as needed')
  console.log('2. Parse to generate TypeScript:')
  console.log('   npx tsx utils/table-config-parser.ts configs/table-configs/<table>.xlsx')
  console.log('3. Copy generated code to Vue components')
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { tableDefinitions, generateTableConfig }
