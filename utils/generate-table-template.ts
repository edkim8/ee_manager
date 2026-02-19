/**
 * Table Configuration Template Generator
 *
 * Creates a blank Excel template with all required sheets, formulas, and formatting.
 *
 * Usage:
 *   node --loader tsx utils/generate-table-template.ts [output-path]
 *
 * Example:
 *   node --loader tsx utils/generate-table-template.ts configs/table-configs/template.xlsx
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

/**
 * Generate blank Excel template
 */
function generateTemplate(): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  // ============================================================
  // Sheet 1: Column Definitions
  // ============================================================
  const columnsData = [
    ['key', 'label', 'width', 'sortable', 'align', 'priority', 'roles', 'departments', 'filter_groups', 'notes']
  ]

  const columnsSheet = XLSX.utils.aoa_to_sheet(columnsData)

  // Set column widths
  columnsSheet['!cols'] = [
    { wch: 20 },  // key
    { wch: 20 },  // label
    { wch: 10 },  // width
    { wch: 10 },  // sortable
    { wch: 10 },  // align
    { wch: 10 },  // priority
    { wch: 20 },  // roles
    { wch: 20 },  // departments
    { wch: 20 },  // filter_groups
    { wch: 30 }   // notes
  ]

  XLSX.utils.book_append_sheet(workbook, columnsSheet, 'Column Definitions')

  // ============================================================
  // Sheet 2: Table Configuration
  // ============================================================
  const configData = [
    ['Parameter', 'Value'],
    ['table_name', 'example'],
    ['file_path', 'layers/ops/pages/example/index.vue'],
    ['has_filter_groups', 'FALSE'],
    ['default_sort_field', 'id'],
    ['default_sort_direction', 'asc'],
    ['enable_pagination', 'TRUE'],
    ['page_size', 25],
    ['enable_export', 'TRUE'],
    ['clickable_rows', 'TRUE']
  ]

  const configSheet = XLSX.utils.aoa_to_sheet(configData)
  configSheet['!cols'] = [{ wch: 25 }, { wch: 40 }]

  XLSX.utils.book_append_sheet(workbook, configSheet, 'Table Configuration')

  // ============================================================
  // Sheet 3: Filter Groups
  // ============================================================
  const filterData = [
    ['group_name', 'label', 'description'],
    ['all', 'All Items', 'Show all records']
  ]

  const filterSheet = XLSX.utils.aoa_to_sheet(filterData)
  filterSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 40 }]

  XLSX.utils.book_append_sheet(workbook, filterSheet, 'Filter Groups')

  // ============================================================
  // Sheet 4: Priority Reference (Read-Only)
  // ============================================================
  const priorityData = [
    ['Priority', 'Max Cumulative Width', 'Breakpoint', 'Devices'],
    ['P1', '350px', 'base (no class)', 'Phone (portrait)'],
    ['P2', '780px', 'md: (768px+)', 'Tablet (portrait), Phone (landscape)'],
    ['P3', '1140px', 'lg: (1024px+)', 'Tablet (landscape), Desktop'],
    ['P4', '1880px', 'xl: (1280px+)', 'QHD, 4K (scaled) ⭐'],
    ['P5', '2520px', '2xl: (1536px+)', '4K (native), Ultra-wide']
  ]

  const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData)
  prioritySheet['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 35 }]

  XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Reference')

  // ============================================================
  // Sheet 5: Instructions
  // ============================================================
  const instructionsData = [
    ['Table Configuration Template - Instructions'],
    [''],
    ['QUICK START:'],
    ['1. Go to "Table Configuration" sheet and fill in table metadata (name, file path, etc.)'],
    ['2. Go to "Column Definitions" sheet and add one row per column'],
    ['3. Fill in: key, label, width, sortable, align'],
    ['4. Priority auto-calculates based on cumulative width'],
    ['5. Set roles/departments/filter_groups (or use "all")'],
    ['6. Run: node --loader tsx utils/table-config-parser.ts path/to/your-file.xlsx'],
    [''],
    ['COLUMN DEFINITIONS:'],
    ['- key: Column identifier for TypeScript (e.g., unit_name)'],
    ['- label: Display label in table header (e.g., "Unit")'],
    ['- width: Column width in pixels (e.g., 120)'],
    ['- sortable: TRUE or FALSE'],
    ['- align: left, center, right, or blank'],
    ['- priority: AUTO-CALCULATED - Do not edit manually!'],
    ['- roles: Comma-separated roles or "all" (e.g., admin,finance)'],
    ['- departments: Comma-separated departments or "all" (e.g., operations,leasing)'],
    ['- filter_groups: Comma-separated filter groups or "all" (e.g., available,all)'],
    ['- notes: Your comments/reasoning (e.g., "Contact PII")'],
    [''],
    ['PRIORITY AUTO-CALCULATION:'],
    ['The priority column uses this formula:'],
    ['=IF(SUM($C$2:C2)<=350,"P1",IF(SUM($C$2:C2)<=780,"P2",IF(SUM($C$2:C2)<=1140,"P3",IF(SUM($C$2:C2)<=1880,"P4","P5"))))'],
    [''],
    ['It calculates cumulative width from first column to current row:'],
    ['- P1: 0-350px (mobile - always visible)'],
    ['- P2: 351-780px (tablet+)'],
    ['- P3: 781-1140px (desktop basic)'],
    ['- P4: 1141-1880px (QHD baseline ⭐)'],
    ['- P5: 1881px+ (4K enhanced)'],
    [''],
    ['COLUMN WIDTH GUIDELINES:'],
    ['- Narrow: 60-90px (Status, Icon, Checkbox, ID)'],
    ['- Medium: 100-150px (Unit Name, Code, Short Text)'],
    ['- Wide: 150-250px (Names, Emails, Addresses)'],
    ['- Actions: 100-120px (Dropdown, Buttons)'],
    ['- Average: ~130px'],
    [''],
    ['PRIORITY DISTRIBUTION TARGETS:'],
    ['- P1: 2-3 columns (~250-350px) - Bare minimum for identification'],
    ['- P2: +3-4 columns (~650-780px) - Essential context'],
    ['- P3: +2-3 columns (~950-1140px) - Key operational data'],
    ['- P4: +4-5 columns (~1500-1880px) - Full dataset (QHD baseline)'],
    ['- P5: +4-5 columns (~2000-2520px) - Maximum detail (4K)'],
    [''],
    ['ROLE/DEPARTMENT RESTRICTIONS:'],
    ['When to restrict:'],
    ['- PII (emails, phones) → leasing, operations, admin only'],
    ['- Financial data (costs, concessions) → finance, admin only'],
    ['- Metadata (created_at, updated_at) → admin only'],
    ['- Assignments (leasing agent, tech) → relevant departments only'],
    [''],
    ['When NOT to restrict:'],
    ['- Core identification (unit, name, status)'],
    ['- Basic context (building, floor plan)'],
    ['- Operational dates (move-in, lease end)'],
    [''],
    ['FILTER GROUPS:'],
    ['Use filter groups when:'],
    ['- Table has distinct "modes" or "views" (Available/Applied/Leased)'],
    ['- Column relevance varies by context'],
    ['- You want to reduce visual clutter'],
    [''],
    ['If using filter groups:'],
    ['1. Set "has_filter_groups = TRUE" in Table Configuration sheet'],
    ['2. Go to "Filter Groups" sheet and define each group'],
    ['3. In Column Definitions, specify which groups each column belongs to'],
    [''],
    ['OUTPUT:'],
    ['The parser will generate a .generated.ts file with:'],
    ['- Formatted column definitions with priority sections'],
    ['- Filter group mappings (if applicable)'],
    ['- Role-based column visibility rules'],
    ['- Department-based column visibility rules'],
    [''],
    ['Copy the generated code into your Vue component and customize the cell templates.'],
    [''],
    ['For detailed documentation, see: /docs/tools/EXCEL_TABLE_CONFIG_TEMPLATE.md']
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

  const outputPath = args[0] || 'configs/table-configs/template.xlsx'

  // Ensure directory exists
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  console.log(`Generating template: ${outputPath}`)

  const workbook = generateTemplate()

  // Write file
  XLSX.writeFile(workbook, outputPath)

  console.log(`✅ Template created: ${outputPath}`)
  console.log(``)
  console.log(`📋 Sheets created:`)
  console.log(`   1. Column Definitions (with auto-calculation formula)`)
  console.log(`   2. Table Configuration (example values)`)
  console.log(`   3. Filter Groups (example group)`)
  console.log(`   4. Priority Reference (read-only reference)`)
  console.log(`   5. Instructions (how-to guide)`)
  console.log(``)
  console.log(`Next steps:`)
  console.log(`1. Open the template in Excel`)
  console.log(`2. Fill in your table columns in "Column Definitions" sheet`)
  console.log(`3. Update "Table Configuration" sheet with your table metadata`)
  console.log(`4. Run: node --loader tsx utils/table-config-parser.ts ${outputPath}`)
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { generateTemplate }
