/**
 * Availabilities Table Configuration Example Generator
 *
 * Creates a complete working example of the Excel table configuration system
 * using the Availabilities table with filter groups.
 *
 * Usage:
 *   node --loader tsx utils/generate-availabilities-example.ts [output-path]
 *
 * Example:
 *   node --loader tsx utils/generate-availabilities-example.ts configs/table-configs/availabilities.xlsx
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

/**
 * Generate Availabilities example Excel configuration
 */
function generateAvailabilitiesExample(): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  // ============================================================
  // Sheet 1: Column Definitions
  // ============================================================

  // Calculate priority based on cumulative width
  const calculatePriority = (cumulativeWidth: number): string => {
    if (cumulativeWidth <= 350) return 'P1'
    if (cumulativeWidth <= 780) return 'P2'
    if (cumulativeWidth <= 1140) return 'P3'
    if (cumulativeWidth <= 1880) return 'P4'
    return 'P5'
  }

  // Column structure: [key, label, width, sortable, align, priority, roles, departments, filter_groups, notes]
  const columnsData: any[][] = [
    // Header row
    ['key', 'label', 'width', 'sortable', 'align', 'priority', 'roles', 'departments', 'filter_groups', 'notes']
  ]

  // Define columns with widths
  const columnDefs = [
    // P1 columns (Mobile essentials - 0-350px)
    ['unit_name', 'Unit', 90, 'TRUE', 'center', 'all', 'all', 'all', 'Always visible - primary identifier'],
    ['sync_alerts', 'Sync', 80, 'TRUE', 'center', 'all', 'all', 'all', 'Pricing validation alerts'],
    ['building_name', 'Building', 150, 'TRUE', '', 'all', 'all', 'all', 'Building location'],

    // P2 columns (Tablet+ - 351-780px total)
    ['floor_plan_name', 'Floor Plan', 130, 'TRUE', '', 'all', 'all', 'all', 'Unit type'],
    ['sf', 'SF', 80, 'TRUE', 'right', 'all', 'all', 'all', 'Square footage'],
    ['bedroom_count', 'Beds', 70, 'TRUE', 'center', 'all', 'all', 'all', 'Bedroom count'],
    ['status', 'Status', 110, 'TRUE', 'center', 'all', 'all', 'all', 'Leasing pipeline status'],

    // P3 columns (Desktop basic - 781-1140px total)
    ['rent_offered', 'Rent', 100, 'TRUE', 'right', 'all', 'finance,operations', 'available,all', 'Market rent'],
    ['available_date', 'Available', 110, 'TRUE', 'center', 'all', 'all', 'available,all', 'Unit ready date'],
    ['vacant_days', 'Vacant', 80, 'TRUE', 'center', 'all', 'operations', 'available,all', 'Vacancy duration'],

    // P4 columns (QHD baseline - 1141-1880px total)
    ['move_out_date', 'Move Out', 110, 'TRUE', 'center', 'all', 'operations', 'available,all', 'Previous move-out'],
    ['resident_name', 'Applicant', 160, 'TRUE', '', 'admin,leasing', 'leasing,operations', 'applied,leased,all', 'Applicant/resident name'],
    ['resident_email', 'Email', 200, 'TRUE', '', 'admin,leasing', 'leasing,operations', 'applied,leased,all', 'Contact PII - restricted'],
    ['application_date', 'Applied', 110, 'TRUE', 'center', 'all', 'leasing', 'applied,all', 'Application submission'],
    ['screening_result', 'Screening', 110, 'TRUE', 'center', 'admin,leasing', 'leasing', 'applied,all', 'Background check result'],

    // P5 columns (4K enhanced - 1881px+ total)
    ['move_in_date', 'Target Move-In', 130, 'TRUE', 'center', 'all', 'leasing', 'applied,all', 'Planned move-in'],
    ['concession_display', '% Concession', 110, 'TRUE', 'center', 'admin,finance', 'finance,leasing', 'applied,leased,all', 'Concession percentage'],
    ['leasing_agent', 'Agent', 120, 'TRUE', '', 'all', 'leasing,operations', 'applied,all', 'Assigned leasing agent'],
    ['lease_start_date', 'Lease Start', 110, 'TRUE', 'center', 'all', 'operations', 'leased,all', 'Lease effective date'],
    ['lease_end_date', 'Lease End', 110, 'TRUE', 'center', 'all', 'operations', 'leased,all', 'Lease expiration date'],
    ['lease_rent_amount', 'Lease Rent', 100, 'TRUE', 'right', 'all', 'finance,operations', 'leased,all', 'Executed lease rent']
  ]

  // Calculate priorities and add to columnsData
  let cumulativeWidth = 0
  columnDefs.forEach((col) => {
    cumulativeWidth += col[2] as number
    const priority = calculatePriority(cumulativeWidth)
    columnsData.push([
      col[0], // key
      col[1], // label
      col[2], // width
      col[3], // sortable
      col[4], // align
      priority, // calculated priority
      col[5], // roles
      col[6], // departments
      col[7], // filter_groups
      col[8]  // notes
    ])
  })

  const columnsSheet = XLSX.utils.aoa_to_sheet(columnsData)

  // Set column widths
  columnsSheet['!cols'] = [
    { wch: 25 },  // key
    { wch: 20 },  // label
    { wch: 10 },  // width
    { wch: 10 },  // sortable
    { wch: 10 },  // align
    { wch: 12 },  // priority (formula)
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
    ['table_name', 'availabilities'],
    ['file_path', 'layers/ops/pages/office/availabilities/index.vue'],
    ['has_filter_groups', 'TRUE'],
    ['default_sort_field', 'available_date'],
    ['default_sort_direction', 'asc'],
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
  const filterData = [
    ['group_name', 'label', 'description'],
    ['available', 'Available', 'Units ready for leasing'],
    ['applied', 'Applied', 'Units with applications pending'],
    ['leased', 'Leased', 'Units with executed leases'],
    ['all', 'All Statuses', 'Mixed view across all pipeline stages']
  ]

  const filterSheet = XLSX.utils.aoa_to_sheet(filterData)
  filterSheet['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 45 }]

  XLSX.utils.book_append_sheet(workbook, filterSheet, 'Filter Groups')

  // ============================================================
  // Sheet 4: Priority Reference (Read-Only)
  // ============================================================
  const priorityData = [
    ['Priority', 'Max Cumulative Width', 'Breakpoint', 'Devices', 'Target Columns'],
    ['P1', '350px', 'base (no class)', 'Phone (portrait)', '2-3 columns'],
    ['P2', '780px', 'md: (768px+)', 'Tablet (portrait), Phone (landscape)', '+3-4 columns'],
    ['P3', '1140px', 'lg: (1024px+)', 'Tablet (landscape), Desktop', '+2-3 columns'],
    ['P4', '1880px', 'xl: (1280px+)', 'QHD, 4K (scaled) ⭐', '+4-5 columns'],
    ['P5', '2520px', '2xl: (1536px+)', '4K (native), Ultra-wide', '+4-5 columns'],
    ['', '', '', '', ''],
    ['Availabilities Example Distribution:', '', '', '', ''],
    ['P1: 3 columns (320px)', 'unit_name, sync_alerts, building_name', '', '', ''],
    ['P2: 4 columns (+410px → 730px)', 'floor_plan_name, sf, bedroom_count, status', '', '', ''],
    ['P3: 3 columns (+300px → 1030px)', 'rent_offered, available_date, vacant_days', '', '', ''],
    ['P4: 4 columns (+580px → 1610px)', 'move_out_date, resident_name, resident_email, application_date', '', '', ''],
    ['P5: 7 columns (+890px → 2500px)', 'screening_result, move_in_date, concession_display, leasing_agent, lease_start_date, lease_end_date, lease_rent_amount', '', '', '']
  ]

  const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData)
  prioritySheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 20 }]

  XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Reference')

  // ============================================================
  // Sheet 5: Instructions
  // ============================================================
  const instructionsData = [
    ['Availabilities Table - Example Configuration'],
    [''],
    ['This is a COMPLETE working example showing:'],
    ['✅ All 5 priority levels (P1-P5) with auto-calculated formulas'],
    ['✅ Filter groups (Available, Applied, Leased, All)'],
    ['✅ Role-based restrictions (admin, leasing see extra columns)'],
    ['✅ Department-based restrictions (finance sees concessions, leasing sees agents)'],
    ['✅ 21 total columns with proper width distribution'],
    [''],
    ['HOW TO USE THIS EXAMPLE:'],
    [''],
    ['1. PARSE THIS FILE:'],
    ['   node --loader tsx utils/table-config-parser.ts configs/table-configs/availabilities.xlsx'],
    [''],
    ['2. REVIEW GENERATED OUTPUT:'],
    ['   Open: configs/table-configs/availabilities.generated.ts'],
    ['   You will see:'],
    ['     - Column definitions grouped by priority (P1-P5)'],
    ['     - Filter group mappings'],
    ['     - Role-based column visibility rules'],
    ['     - Department-based column visibility rules'],
    [''],
    ['3. COPY CODE TO YOUR COMPONENT:'],
    ['   Copy the generated code into your Vue component'],
    ['   Customize cell templates as needed'],
    [''],
    ['KEY FEATURES DEMONSTRATED:'],
    [''],
    ['📱 MOBILE-FIRST DESIGN (P1)'],
    ['   - unit_name (90px) - Primary identifier'],
    ['   - sync_alerts (80px) - Validation status'],
    ['   - building_name (150px) - Location context'],
    ['   Total: 320px (fits comfortably in 350px mobile viewport)'],
    [''],
    ['📊 TABLET ENHANCEMENT (P2)'],
    ['   - floor_plan_name (130px) - Unit type'],
    ['   - sf (80px) - Square footage'],
    ['   - bedroom_count (70px) - Beds'],
    ['   - status (110px) - Pipeline stage'],
    ['   Cumulative: 730px (fits tablet portrait 768px+)'],
    [''],
    ['💻 DESKTOP BASIC (P3)'],
    ['   - rent_offered (100px) - Pricing'],
    ['   - available_date (110px) - Ready date'],
    ['   - vacant_days (80px) - Urgency metric'],
    ['   Cumulative: 1030px (fits desktop 1024px+)'],
    [''],
    ['🖥️ QHD BASELINE (P4) ⭐'],
    ['   - move_out_date (110px)'],
    ['   - resident_name (160px) - Applicant/resident'],
    ['   - resident_email (200px) - Contact (PII restricted)'],
    ['   - application_date (110px)'],
    ['   Cumulative: 1610px (fits QHD 1280px+)'],
    [''],
    ['🖼️ 4K ENHANCED (P5)'],
    ['   - screening_result (110px)'],
    ['   - move_in_date (130px)'],
    ['   - concession_display (110px) - Finance restricted'],
    ['   - leasing_agent (120px)'],
    ['   - lease_start_date (110px)'],
    ['   - lease_end_date (110px)'],
    ['   - lease_rent_amount (100px)'],
    ['   Cumulative: 2500px (full detail on 4K displays)'],
    [''],
    ['FILTER GROUPS:'],
    [''],
    ['📋 AVAILABLE GROUP'],
    ['   Shows vacancy metrics: rent_offered, available_date, vacant_days, move_out_date'],
    ['   Hidden: applicant fields, lease fields'],
    [''],
    ['📝 APPLIED GROUP'],
    ['   Shows application workflow: resident_name, resident_email, application_date,'],
    ['   screening_result, move_in_date, concession_display, leasing_agent'],
    ['   Hidden: vacant_days, move_out_date, lease fields'],
    [''],
    ['✅ LEASED GROUP'],
    ['   Shows executed lease: resident_name, resident_email, lease_start_date,'],
    ['   lease_end_date, lease_rent_amount, concession_display'],
    ['   Hidden: vacancy metrics, application fields'],
    [''],
    ['🔄 ALL GROUP'],
    ['   Mixed view showing all columns across all statuses'],
    [''],
    ['ROLE RESTRICTIONS:'],
    [''],
    ['🔐 ADMIN ONLY:'],
    ['   - resident_email (Contact PII)'],
    ['   - screening_result (Background checks)'],
    ['   - concession_display (Financial incentives)'],
    [''],
    ['💼 LEASING DEPARTMENT:'],
    ['   - Can see resident_email, screening_result'],
    ['   - Can see leasing_agent assignments'],
    [''],
    ['💰 FINANCE DEPARTMENT:'],
    ['   - Can see rent_offered, lease_rent_amount'],
    ['   - Can see concession_display'],
    [''],
    ['DEPARTMENT RESTRICTIONS:'],
    [''],
    ['🏢 OPERATIONS:'],
    ['   - vacant_days (Turnover metrics)'],
    ['   - move_out_date, lease_start_date, lease_end_date'],
    [''],
    ['🔑 LEASING:'],
    ['   - application_date, screening_result, move_in_date'],
    ['   - leasing_agent, concession_display'],
    [''],
    ['💵 FINANCE:'],
    ['   - rent_offered, lease_rent_amount, concession_display'],
    [''],
    ['NEXT STEPS:'],
    [''],
    ['1. Parse this file and review generated code'],
    ['2. Use this as a template for your own tables'],
    ['3. Adjust column widths based on your content'],
    ['4. Modify priority thresholds if needed'],
    ['5. Add/remove filter groups as required'],
    [''],
    ['For detailed documentation: /docs/tools/EXCEL_TABLE_CONFIG_TEMPLATE.md']
  ]

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
  instructionsSheet['!cols'] = [{ wch: 100 }]

  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

  return workbook
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2)

  const outputPath = args[0] || 'configs/table-configs/availabilities.xlsx'

  // Ensure directory exists
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  console.log(`Generating Availabilities example: ${outputPath}`)

  const workbook = generateAvailabilitiesExample()

  // Write file
  XLSX.writeFile(workbook, outputPath)

  console.log(`✅ Example created: ${outputPath}`)
  console.log(``)
  console.log(`📋 Configuration Summary:`)
  console.log(`   Table: availabilities`)
  console.log(`   Columns: 21 total`)
  console.log(`   Priority Distribution:`)
  console.log(`     P1: 3 columns (320px) - Mobile essentials`)
  console.log(`     P2: 4 columns (+410px → 730px) - Tablet+`)
  console.log(`     P3: 3 columns (+300px → 1030px) - Desktop basic`)
  console.log(`     P4: 4 columns (+580px → 1610px) - QHD baseline ⭐`)
  console.log(`     P5: 7 columns (+890px → 2500px) - 4K enhanced`)
  console.log(``)
  console.log(`🔀 Filter Groups: 4`)
  console.log(`   - available: Vacancy metrics`)
  console.log(`   - applied: Application workflow`)
  console.log(`   - leased: Executed leases`)
  console.log(`   - all: Mixed view`)
  console.log(``)
  console.log(`🔐 Role Restrictions:`)
  console.log(`   - admin: Can see PII, screening, concessions`)
  console.log(`   - leasing: Can see applicant details, agents`)
  console.log(`   - finance: Can see rent amounts, concessions`)
  console.log(``)
  console.log(`🏢 Department Restrictions:`)
  console.log(`   - operations: Turnover metrics, lease dates`)
  console.log(`   - leasing: Application workflow, agents`)
  console.log(`   - finance: Pricing and concessions`)
  console.log(``)
  console.log(`Next steps:`)
  console.log(`1. Run: node --loader tsx utils/table-config-parser.ts ${outputPath}`)
  console.log(`2. Review: configs/table-configs/availabilities.generated.ts`)
  console.log(`3. Copy generated code to Vue component`)
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { generateAvailabilitiesExample }
