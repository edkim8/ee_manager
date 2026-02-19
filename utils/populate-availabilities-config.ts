#!/usr/bin/env node
import XLSX from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// All fields from view_leasing_pipeline with configuration
const columns = [
  // ===== PRIORITY 1: Mobile Essentials (320px) =====
  { key: 'unit_name', label: 'Unit', width: 90, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Unit identifier with color-coded vacancy status' },
  { key: 'sync_alerts', label: 'Sync', width: 80, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Data sync verification alerts' },
  { key: 'building_name', label: 'Building', width: 150, sortable: true, align: 'left', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Building name (clickable link)' },

  // ===== PRIORITY 2: Tablet+ (420px, 740px total) =====
  { key: 'floor_plan_name', label: 'Floor Plan', width: 130, sortable: true, align: 'left', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Marketing name of floor plan' },
  { key: 'sf', label: 'SF', width: 80, sortable: true, align: 'right', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Square footage' },
  { key: 'b_b', label: 'Beds/Baths', width: 100, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Bedroom x Bathroom (e.g., 2x2, 1x1)' },
  { key: 'status', label: 'Status', width: 110, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Available, Applied, or Leased' },

  // ===== PRIORITY 3: Desktop (400px, 1140px total) =====
  { key: 'rent_offered', label: 'Rent', width: 100, sortable: true, align: 'right', roles: 'Owner,Manager,RPM', departments: 'Management', filter_groups: 'available,all', notes: 'Offered rent amount (Available + All filters)' },
  { key: 'available_date', label: 'Available', width: 110, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'available,all', notes: 'Date unit becomes available' },
  { key: 'vacant_days', label: 'Vacant', width: 80, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'available', notes: 'Days until available - color-coded' },
  { key: 'move_out_date', label: 'Move Out', width: 110, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'available', notes: 'Previous resident move-out date' },

  // ===== PRIORITY 4: QHD+ (740px, 1880px total) =====
  { key: 'turnover_days', label: 'Turnover', width: 90, sortable: true, align: 'center', roles: 'all', departments: 'Management', filter_groups: 'available', notes: 'Days between move-out and available (turnover efficiency)' },
  { key: 'temp_amenities_total', label: 'Temp Amenities', width: 120, sortable: true, align: 'right', roles: 'Owner,Manager,RPM', departments: 'Management', filter_groups: 'all', notes: 'Sum of temporary amenities (premiums + discounts)' },
  { key: 'resident_name', label: 'Resident', width: 160, sortable: true, align: 'left', roles: 'Manager,RPM', departments: 'Leasing,Management', filter_groups: 'all', notes: 'Primary resident/applicant name' },
  { key: 'resident_email', label: 'Email', width: 200, sortable: true, align: 'left', roles: 'Manager,RPM', departments: 'Leasing,Management', filter_groups: 'applied,leased', notes: 'Resident email address (PII)' },
  { key: 'application_date', label: 'Applied', width: 110, sortable: true, align: 'center', roles: 'all', departments: 'Leasing,Management', filter_groups: 'applied', notes: 'Application submission date' },
  { key: 'screening_result', label: 'Screening', width: 110, sortable: true, align: 'center', roles: 'Manager,RPM', departments: 'Leasing,Management', filter_groups: 'applied', notes: 'Application screening result' },
  { key: 'move_in_date', label: 'Move-In', width: 110, sortable: true, align: 'center', roles: 'all', departments: 'all', filter_groups: 'all', notes: 'Scheduled/actual move-in date' },

  // ===== PRIORITY 5: 4K+ (640px, 2520px total) =====
  { key: 'concession_total_pct', label: 'Total Concession %', width: 130, sortable: true, align: 'center', roles: 'Owner,Manager,RPM', departments: 'Management', filter_groups: 'applied,leased', notes: 'A% - Total concessions as % of market rent' },
  { key: 'concession_display_calc', label: 'C%/A%', width: 90, sortable: true, align: 'center', roles: 'Owner,Manager,RPM', departments: 'Management', filter_groups: 'applied,leased', notes: 'Concession display (e.g., 5.0%/8.5%)' },
  { key: 'concession_upfront_amount', label: 'Upfront $', width: 100, sortable: true, align: 'right', roles: 'Owner,Manager,RPM', departments: 'Management', filter_groups: 'applied,leased', notes: 'Upfront dollar concession (e.g., $500 move-in special)' },
  { key: 'leasing_agent', label: 'Agent', width: 120, sortable: true, align: 'left', roles: 'all', departments: 'Leasing,Management', filter_groups: 'applied', notes: 'Assigned leasing agent' },
  { key: 'lease_start_date', label: 'Lease Start', width: 110, sortable: true, align: 'center', roles: 'all', departments: 'Management', filter_groups: 'leased', notes: 'Lease start date' },
  { key: 'lease_end_date', label: 'Lease End', width: 110, sortable: true, align: 'center', roles: 'all', departments: 'Management', filter_groups: 'leased', notes: 'Lease end date' },
  { key: 'lease_rent_amount', label: 'Lease Rent', width: 100, sortable: true, align: 'right', roles: 'Owner,Manager,RPM', departments: 'Management', filter_groups: 'leased', notes: 'Executed lease rent amount' },
  { key: 'pricing_comment', label: 'Pricing Note', width: 150, sortable: false, align: 'left', roles: 'Manager,RPM', departments: 'Management', filter_groups: 'all', notes: 'Latest pricing override comment/note' },
]

// Table configuration
const tableConfig = {
  table_name: 'availabilities',
  file_path: 'layers/ops/pages/office/availabilities/index.vue',
  has_filter_groups: 'true',
  default_sort: 'available_date',
  default_sort_direction: 'asc',
  pagination: 'true',
  page_size: '25',
  export: 'true',
  clickable_rows: 'true',
  notes: 'Leasing pipeline with 4 filter groups: All, Available, Applied, Leased'
}

// Filter groups
const filterGroups = [
  { group_name: 'all', label: 'All', description: 'All units in leasing pipeline' },
  { group_name: 'available', label: 'Available', description: 'Vacant units ready for leasing' },
  { group_name: 'applied', label: 'Applied', description: 'Units with pending applications' },
  { group_name: 'leased', label: 'Leased', description: 'Units with executed future leases' }
]

// Path to the Excel file
const excelPath = path.join(__dirname, '../configs/table-configs/availabilities-complete.xlsx')

console.log('📝 Populating Availabilities configuration...')

// Read the template
const workbook = XLSX.readFile(excelPath)

// ===== Populate Column Definitions =====
const columnSheet = workbook.Sheets['Column Definitions']

// Clear existing data rows (keep headers in row 1)
const range = XLSX.utils.decode_range(columnSheet['!ref'] || 'A1')
for (let R = 2; R <= range.e.r; R++) {
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
    delete columnSheet[cellAddress]
  }
}

// Write column data
columns.forEach((col, idx) => {
  const rowNum = idx + 2 // Start at row 2 (row 1 is header)

  // Column A: key
  columnSheet[`A${rowNum}`] = { t: 's', v: col.key }

  // Column B: label
  columnSheet[`B${rowNum}`] = { t: 's', v: col.label }

  // Column C: width
  columnSheet[`C${rowNum}`] = { t: 'n', v: col.width }

  // Column D: sortable
  columnSheet[`D${rowNum}`] = { t: 's', v: col.sortable ? 'TRUE' : 'FALSE' }

  // Column E: align
  columnSheet[`E${rowNum}`] = { t: 's', v: col.align }

  // Column F: priority (calculated from cumulative width)
  const cumWidth = columns.slice(0, idx + 1).reduce((sum, c) => sum + c.width, 0)
  let priority = 'P5'
  if (cumWidth <= 350) priority = 'P1'
  else if (cumWidth <= 780) priority = 'P2'
  else if (cumWidth <= 1140) priority = 'P3'
  else if (cumWidth <= 1880) priority = 'P4'

  columnSheet[`F${rowNum}`] = {
    t: 's',
    f: `IF(SUM($C$2:C${rowNum})<=350,"P1",IF(SUM($C$2:C${rowNum})<=780,"P2",IF(SUM($C$2:C${rowNum})<=1140,"P3",IF(SUM($C$2:C${rowNum})<=1880,"P4","P5"))))`,
    v: priority // Calculated value
  }

  // Column G: roles
  columnSheet[`G${rowNum}`] = { t: 's', v: col.roles }

  // Column H: departments
  columnSheet[`H${rowNum}`] = { t: 's', v: col.departments }

  // Column I: filter_groups
  columnSheet[`I${rowNum}`] = { t: 's', v: col.filter_groups }

  // Column J: notes
  columnSheet[`J${rowNum}`] = { t: 's', v: col.notes }
})

// Update range
columnSheet['!ref'] = XLSX.utils.encode_range({
  s: { r: 0, c: 0 },
  e: { r: columns.length + 1, c: 9 }
})

// ===== Populate Table Configuration =====
const configSheet = workbook.Sheets['Table Configuration']

// Clear existing data
const configRange = XLSX.utils.decode_range(configSheet['!ref'] || 'A1')
for (let R = 2; R <= configRange.e.r; R++) {
  for (let C = 0; C <= configRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
    delete configSheet[cellAddress]
  }
}

// Write config
Object.entries(tableConfig).forEach(([key, value], idx) => {
  const rowNum = idx + 2
  configSheet[`A${rowNum}`] = { t: 's', v: key }
  configSheet[`B${rowNum}`] = { t: 's', v: value }
})

configSheet['!ref'] = XLSX.utils.encode_range({
  s: { r: 0, c: 0 },
  e: { r: Object.keys(tableConfig).length + 1, c: 1 }
})

// ===== Populate Filter Groups =====
const filterSheet = workbook.Sheets['Filter Groups']

// Clear existing data
const filterRange = XLSX.utils.decode_range(filterSheet['!ref'] || 'A1')
for (let R = 2; R <= filterRange.e.r; R++) {
  for (let C = 0; C <= filterRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
    delete filterSheet[cellAddress]
  }
}

// Write filter groups
filterGroups.forEach((group, idx) => {
  const rowNum = idx + 2
  filterSheet[`A${rowNum}`] = { t: 's', v: group.group_name }
  filterSheet[`B${rowNum}`] = { t: 's', v: group.label }
  filterSheet[`C${rowNum}`] = { t: 's', v: group.description }
})

filterSheet['!ref'] = XLSX.utils.encode_range({
  s: { r: 0, c: 0 },
  e: { r: filterGroups.length + 1, c: 2 }
})

// Save the workbook
XLSX.writeFile(workbook, excelPath, { cellFormula: true, bookSST: false })

console.log(`✅ Configuration populated: ${excelPath}`)
console.log(`\n📊 Summary:`)
console.log(`   - ${columns.length} columns configured`)
console.log(`   - ${filterGroups.length} filter groups defined`)
console.log(`   - Priority distribution:`)

// Count columns by priority
const priorityCounts = columns.reduce((acc, col, idx) => {
  const cumWidth = columns.slice(0, idx + 1).reduce((sum, c) => sum + c.width, 0)
  let priority = 'P5'
  if (cumWidth <= 350) priority = 'P1'
  else if (cumWidth <= 780) priority = 'P2'
  else if (cumWidth <= 1140) priority = 'P3'
  else if (cumWidth <= 1880) priority = 'P4'

  acc[priority] = (acc[priority] || 0) + 1
  return acc
}, {} as Record<string, number>)

Object.entries(priorityCounts).forEach(([priority, count]) => {
  console.log(`     ${priority}: ${count} columns`)
})

console.log(`\n🔑 Role-restricted columns: ${columns.filter(c => c.roles !== 'all').length}`)
console.log(`🏢 Department-restricted columns: ${columns.filter(c => c.departments !== 'all').length}`)
console.log(`\n📝 Next step: npx tsx utils/table-config-parser.ts configs/table-configs/availabilities-complete.xlsx`)
