/**
 * Table Configuration Parser
 *
 * Reads Excel table configuration files and generates TypeScript column definitions.
 *
 * Usage:
 *   node --loader tsx utils/table-config-parser.ts path/to/config.xlsx
 *
 * Or programmatically:
 *   import { parseTableConfig, generateCode } from './table-config-parser'
 *   const config = parseTableConfig('availabilities.xlsx')
 *   const code = generateCode(config)
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

// ============================================================
// Types
// ============================================================

interface ColumnDefinition {
  key: string
  label: string
  width: number
  sortable: boolean
  align?: 'left' | 'center' | 'right'
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
  roles: string[]
  departments: string[]
  filterGroups: string[]
  notes?: string
}

interface TableConfig {
  tableName: string
  filePath: string
  hasFilterGroups: boolean
  defaultSortField: string
  defaultSortDirection: 'asc' | 'desc'
  enablePagination: boolean
  pageSize: number
  enableExport: boolean
  clickableRows: boolean
}

interface FilterGroup {
  name: string
  label: string
  description?: string
}

interface ParsedTableConfig {
  config: TableConfig
  columns: ColumnDefinition[]
  filterGroups?: FilterGroup[]
  roleColumns: Record<string, string[]>
  departmentColumns: Record<string, string[]>
}

// ============================================================
// Parser Functions
// ============================================================

/**
 * Parse Excel file into structured configuration
 */
export function parseTableConfig(excelPath: string): ParsedTableConfig {
  const workbook = XLSX.readFile(excelPath)

  // Parse Sheet 1: Column Definitions
  const columnsSheet = workbook.Sheets['Column Definitions']
  if (!columnsSheet) {
    throw new Error('Missing "Column Definitions" sheet in Excel file')
  }
  const columnsData = XLSX.utils.sheet_to_json<any>(columnsSheet)
  const columns = parseColumns(columnsData)

  // Parse Sheet 2: Table Configuration
  const configSheet = workbook.Sheets['Table Configuration']
  if (!configSheet) {
    throw new Error('Missing "Table Configuration" sheet in Excel file')
  }
  const configData = XLSX.utils.sheet_to_json<any>(configSheet, { header: ['Parameter', 'Value'] })
  const config = parseConfig(configData)

  // Parse Sheet 3: Filter Groups (optional)
  let filterGroups: FilterGroup[] | undefined
  if (config.hasFilterGroups) {
    const filterSheet = workbook.Sheets['Filter Groups']
    if (filterSheet) {
      const filterData = XLSX.utils.sheet_to_json<any>(filterSheet)
      filterGroups = parseFilterGroups(filterData)
    }
  }

  // Extract role/department rules from columns
  const { roleColumns, departmentColumns } = extractRoleRules(columns)

  return {
    config,
    columns,
    filterGroups,
    roleColumns,
    departmentColumns
  }
}

/**
 * Parse column definitions from Excel rows
 */
function parseColumns(data: any[]): ColumnDefinition[] {
  return data.map(row => ({
    key: row.key || '',
    label: row.label || '',
    width: parseInt(row.width) || 100,
    sortable: row.sortable === true || row.sortable === 'TRUE',
    align: row.align || undefined,
    priority: row.priority || 'P1',
    roles: parseList(row.roles),
    departments: parseList(row.departments),
    filterGroups: parseList(row.filter_groups),
    notes: row.notes || undefined
  }))
}

/**
 * Parse table configuration from key-value pairs
 */
function parseConfig(data: any[]): TableConfig {
  const config: any = {}
  data.forEach(row => {
    if (row.Parameter && row.Value !== undefined) {
      const key = row.Parameter
      let value = row.Value

      // Type conversions
      if (value === 'TRUE') value = true
      if (value === 'FALSE') value = false
      if (!isNaN(Number(value)) && value !== '') value = Number(value)

      config[key] = value
    }
  })

  return {
    tableName: config.table_name || 'unknown',
    filePath: config.file_path || '',
    hasFilterGroups: config.has_filter_groups || false,
    defaultSortField: config.default_sort_field || 'id',
    defaultSortDirection: config.default_sort_direction || 'asc',
    enablePagination: config.enable_pagination !== false,
    pageSize: config.page_size || 25,
    enableExport: config.enable_export !== false,
    clickableRows: config.clickable_rows !== false
  }
}

/**
 * Parse filter groups
 */
function parseFilterGroups(data: any[]): FilterGroup[] {
  return data.map(row => ({
    name: row.group_name || '',
    label: row.label || '',
    description: row.description || undefined
  }))
}

/**
 * Extract role and department column rules from column definitions
 */
function extractRoleRules(columns: ColumnDefinition[]) {
  const roleColumns: Record<string, string[]> = {}
  const departmentColumns: Record<string, string[]> = {}

  columns.forEach(col => {
    // Skip columns visible to all
    if (col.roles.includes('all')) return

    // Add column to each role
    col.roles.forEach(role => {
      if (!roleColumns[role]) roleColumns[role] = []
      roleColumns[role].push(col.key)
    })

    // Add column to each department
    if (!col.departments.includes('all')) {
      col.departments.forEach(dept => {
        if (!departmentColumns[dept]) departmentColumns[dept] = []
        departmentColumns[dept].push(col.key)
      })
    }
  })

  return { roleColumns, departmentColumns }
}

/**
 * Parse comma-separated list from Excel cell
 */
function parseList(value: any): string[] {
  if (!value) return ['all']
  if (typeof value !== 'string') return ['all']

  const items = value.split(',').map(s => s.trim()).filter(Boolean)
  return items.length > 0 ? items : ['all']
}

// ============================================================
// Code Generation
// ============================================================

/**
 * Generate TypeScript code from parsed configuration
 */
export function generateCode(parsed: ParsedTableConfig): string {
  const { config, columns, filterGroups, roleColumns, departmentColumns } = parsed

  // Group columns by priority
  const p1 = columns.filter(c => c.priority === 'P1')
  const p2 = columns.filter(c => c.priority === 'P2')
  const p3 = columns.filter(c => c.priority === 'P3')
  const p4 = columns.filter(c => c.priority === 'P4')
  const p5 = columns.filter(c => c.priority === 'P5')

  const parts: string[] = []

  // Header
  parts.push(`// ============================================================`)
  parts.push(`// AUTO-GENERATED from ${config.tableName}.xlsx`)
  parts.push(`// Generated: ${new Date().toISOString().split('T')[0]}`)
  parts.push(`// DO NOT EDIT MANUALLY - Edit Excel and regenerate`)
  parts.push(`// ============================================================`)
  parts.push('')

  // Column definitions
  parts.push(`const allColumns: TableColumn[] = [`)

  // Priority 1
  if (p1.length > 0) {
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    parts.push(`  // PRIORITY 1: Mobile Essentials (${p1.length} columns, ${sumWidth(p1)}px total)`)
    parts.push(`  // BREAKPOINT: base (no class)`)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    p1.forEach(col => parts.push(generateColumn(col, false)))
  }

  // Priority 2
  if (p2.length > 0) {
    parts.push(``)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    parts.push(`  // PRIORITY 2: Tablet+ (${p2.length} columns, +${sumWidth(p2)}px → ${sumWidth(p1) + sumWidth(p2)}px total)`)
    parts.push(`  // BREAKPOINT: hidden md:table-cell (768px+)`)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    p2.forEach(col => parts.push(generateColumn(col, true, 'md')))
  }

  // Priority 3
  if (p3.length > 0) {
    parts.push(``)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    parts.push(`  // PRIORITY 3: Desktop Basic (${p3.length} columns, +${sumWidth(p3)}px → ${sumWidth(p1) + sumWidth(p2) + sumWidth(p3)}px total)`)
    parts.push(`  // BREAKPOINT: hidden lg:table-cell (1024px+)`)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    p3.forEach(col => parts.push(generateColumn(col, true, 'lg')))
  }

  // Priority 4
  if (p4.length > 0) {
    parts.push(``)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    parts.push(`  // PRIORITY 4: Desktop Wide - QHD BASELINE (${p4.length} columns, +${sumWidth(p4)}px → ${sumWidth(p1) + sumWidth(p2) + sumWidth(p3) + sumWidth(p4)}px total)`)
    parts.push(`  // BREAKPOINT: hidden xl:table-cell (1280px+)`)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    p4.forEach(col => parts.push(generateColumn(col, true, 'xl')))
  }

  // Priority 5
  if (p5.length > 0) {
    parts.push(``)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    parts.push(`  // PRIORITY 5: Desktop Ultra - 4K ENHANCED (${p5.length} columns, +${sumWidth(p5)}px → ${sumWidth(columns)}px total)`)
    parts.push(`  // BREAKPOINT: hidden 2xl:table-cell (1536px+)`)
    parts.push(`  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    p5.forEach(col => parts.push(generateColumn(col, true, '2xl')))
  }

  parts.push(`]`)
  parts.push(``)

  // Filter groups
  if (filterGroups && filterGroups.length > 0) {
    parts.push(`// Filter Groups`)
    parts.push(`const filterGroups = {`)
    filterGroups.forEach((group, idx) => {
      const groupColumns = columns
        .filter(c => c.filterGroups.includes(group.name) || c.filterGroups.includes('all'))
        .map(c => c.key)

      const comma = idx < filterGroups.length - 1 ? ',' : ''
      parts.push(`  ${group.name}: [${groupColumns.map(k => `'${k}'`).join(', ')}]${comma}`)
    })
    parts.push(`}`)
    parts.push(``)
  }

  // Role columns
  if (Object.keys(roleColumns).length > 0) {
    parts.push(`// Role-based column visibility`)
    parts.push(`const roleColumns = {`)
    const roleKeys = Object.keys(roleColumns)
    roleKeys.forEach((role, idx) => {
      const comma = idx < roleKeys.length - 1 ? ',' : ''
      parts.push(`  ${role}: [${roleColumns[role].map(k => `'${k}'`).join(', ')}]${comma}`)
    })
    parts.push(`}`)
    parts.push(``)
  }

  // Department columns
  if (Object.keys(departmentColumns).length > 0) {
    parts.push(`// Department-based column visibility`)
    parts.push(`const departmentColumns = {`)
    const deptKeys = Object.keys(departmentColumns)
    deptKeys.forEach((dept, idx) => {
      const comma = idx < deptKeys.length - 1 ? ',' : ''
      parts.push(`  ${dept}: [${departmentColumns[dept].map(k => `'${k}'`).join(', ')}]${comma}`)
    })
    parts.push(`}`)
  }

  // Build export statement
  parts.push(``)
  const exports: string[] = ['allColumns']
  if (filterGroups && filterGroups.length > 0) exports.push('filterGroups')
  if (Object.keys(roleColumns).length > 0) exports.push('roleColumns')
  if (Object.keys(departmentColumns).length > 0) exports.push('departmentColumns')
  parts.push(`export { ${exports.join(', ')} }`)

  return parts.join('\n')
}

/**
 * Generate code for a single column
 */
function generateColumn(col: ColumnDefinition, responsive: boolean, breakpoint?: string): string {
  const lines: string[] = []

  lines.push(`  {`)
  lines.push(`    key: '${col.key}',`)
  lines.push(`    label: '${col.label}',`)
  lines.push(`    sortable: ${col.sortable},`)

  const hasAlign = col.align !== undefined
  const hasResponsive = responsive && breakpoint

  // Width line - add comma if there's more content
  lines.push(`    width: '${col.width}px'${(hasAlign || hasResponsive) ? ',' : ''}`)

  // Align line - add comma if there's responsive classes
  if (hasAlign) {
    lines.push(`    align: '${col.align}'${hasResponsive ? ',' : ''}`)
  }

  // Roles and Departments
  if (col.roles && col.roles.length > 0 && !col.roles.includes('all')) {
    lines.push(`    roles: [${col.roles.map(r => `'${r}'`).join(', ')}],`)
  }
  if (col.departments && col.departments.length > 0 && !col.departments.includes('all')) {
    lines.push(`    departments: [${col.departments.map(d => `'${d}'`).join(', ')}],`)
  }

  lines.push(`  },`)

  return lines.join('\n')
}

/**
 * Calculate total width of columns
 */
function sumWidth(columns: ColumnDefinition[]): number {
  return columns.reduce((sum, col) => sum + col.width, 0)
}

// ============================================================
// CLI
// ============================================================

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node table-config-parser.ts <excel-file>')
    console.error('Example: node table-config-parser.ts configs/availabilities.xlsx')
    process.exit(1)
  }

  const excelPath = args[0]

  if (!fs.existsSync(excelPath)) {
    console.error(`Error: File not found: ${excelPath}`)
    process.exit(1)
  }

  console.log(`Parsing: ${excelPath}`)

  try {
    const parsed = parseTableConfig(excelPath)
    const code = generateCode(parsed)

    // Determine output path
    const baseName = path.basename(excelPath, '.xlsx')
    const outputPath = path.join(path.dirname(excelPath), `${baseName}.generated.ts`)

    // Write output
    fs.writeFileSync(outputPath, code, 'utf-8')

    console.log(`✅ Generated: ${outputPath}`)
    console.log(`📊 Table: ${parsed.config.tableName}`)
    console.log(`📋 Columns: ${parsed.columns.length}`)
    console.log(`   P1: ${parsed.columns.filter(c => c.priority === 'P1').length}`)
    console.log(`   P2: ${parsed.columns.filter(c => c.priority === 'P2').length}`)
    console.log(`   P3: ${parsed.columns.filter(c => c.priority === 'P3').length}`)
    console.log(`   P4: ${parsed.columns.filter(c => c.priority === 'P4').length}`)
    console.log(`   P5: ${parsed.columns.filter(c => c.priority === 'P5').length}`)

    if (parsed.filterGroups) {
      console.log(`🔀 Filter Groups: ${parsed.filterGroups.length}`)
    }

    console.log(`🔐 Role Rules: ${Object.keys(parsed.roleColumns).length} roles`)
    console.log(`🏢 Department Rules: ${Object.keys(parsed.departmentColumns).length} departments`)

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
