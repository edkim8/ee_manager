/**
 * Fix Roles and Departments in Generated Table Configs
 *
 * Updates all generated Excel files to use correct system values:
 * - Departments: Leasing, Maintenance, Management
 * - Roles: Owner, Staff, Manager, RPM, Asset
 *
 * Usage:
 *   npx tsx utils/fix-roles-departments.ts
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

// Mapping from placeholder values to actual system values
const ROLE_MAPPING: Record<string, string> = {
  'admin': 'Owner,Manager',      // Admin-level access
  'manager': 'Manager,RPM',       // Management roles
  'staff': 'Staff',               // Staff access
  'leasing': 'Staff,Manager',     // Leasing-related roles
  'finance': 'Owner,Manager,RPM', // Financial access
  'all': 'all'                    // Keep "all" as is
}

const DEPARTMENT_MAPPING: Record<string, string> = {
  'operations': 'Management',
  'finance': 'Management',        // Financial tasks under Management
  'leasing': 'Leasing',
  'maintenance': 'Maintenance',
  'all': 'all'                    // Keep "all" as is
}

function mapValue(value: string, mapping: Record<string, string>): string {
  // Handle comma-separated values
  const values = value.split(',').map(v => v.trim())

  // Map each value, collecting unique results
  const mappedSet = new Set<string>()

  values.forEach(v => {
    const mapped = mapping[v.toLowerCase()]
    if (mapped) {
      if (mapped === 'all') {
        mappedSet.add('all')
      } else {
        mapped.split(',').forEach(m => mappedSet.add(m.trim()))
      }
    } else {
      // Keep original if no mapping found
      mappedSet.add(v)
    }
  })

  // If "all" is present, return just "all"
  if (mappedSet.has('all')) {
    return 'all'
  }

  // Return sorted, unique values
  return Array.from(mappedSet).sort().join(',')
}

async function main() {
  const configDir = 'configs/table-configs'

  // Get all .xlsx files except template and availabilities
  const files = fs.readdirSync(configDir)
    .filter(f => f.endsWith('.xlsx'))
    .filter(f => f !== 'template.xlsx' && f !== 'availabilities.xlsx')

  console.log(`🔧 Fixing roles and departments in ${files.length} files...\n`)

  let successCount = 0
  let totalUpdates = 0

  for (const fileName of files) {
    const filePath = path.join(configDir, fileName)

    try {
      // Read workbook
      const workbook = XLSX.readFile(filePath)
      const sheet = workbook.Sheets['Column Definitions']

      if (!sheet) {
        console.log(`⚠️  Skipping ${fileName} - No "Column Definitions" sheet`)
        continue
      }

      // Get data as array
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

      // Find roles and departments column indices
      const headerRow = data[0]
      const rolesColIndex = headerRow.indexOf('roles')
      const deptsColIndex = headerRow.indexOf('departments')

      if (rolesColIndex === -1 || deptsColIndex === -1) {
        console.log(`⚠️  Skipping ${fileName} - Missing roles/departments columns`)
        continue
      }

      let fileUpdates = 0

      // Update each data row (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i]
        if (!row || row.length === 0) continue

        // Update roles
        if (row[rolesColIndex] && row[rolesColIndex] !== 'all') {
          const oldRoles = row[rolesColIndex]
          const newRoles = mapValue(oldRoles, ROLE_MAPPING)
          if (oldRoles !== newRoles) {
            row[rolesColIndex] = newRoles
            fileUpdates++
          }
        }

        // Update departments
        if (row[deptsColIndex] && row[deptsColIndex] !== 'all') {
          const oldDepts = row[deptsColIndex]
          const newDepts = mapValue(oldDepts, DEPARTMENT_MAPPING)
          if (oldDepts !== newDepts) {
            row[deptsColIndex] = newDepts
            fileUpdates++
          }
        }
      }

      if (fileUpdates > 0) {
        // Convert back to sheet
        const newSheet = XLSX.utils.aoa_to_sheet(data)

        // Preserve column widths
        newSheet['!cols'] = sheet['!cols']

        // Replace sheet
        workbook.Sheets['Column Definitions'] = newSheet

        // Write back
        XLSX.writeFile(workbook, filePath)

        console.log(`✅ ${fileName}`)
        console.log(`   🔄 ${fileUpdates} cells updated`)
        totalUpdates += fileUpdates
      } else {
        console.log(`✓  ${fileName} - No changes needed`)
      }

      successCount++
    } catch (error: any) {
      console.error(`❌ Failed: ${fileName} - ${error.message}`)
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Processed ${successCount}/${files.length} files`)
  console.log(`🔄 Total updates: ${totalUpdates} cells`)
  console.log('')
  console.log('System values applied:')
  console.log('  Departments: Leasing, Maintenance, Management')
  console.log('  Roles: Owner, Staff, Manager, RPM, Asset')
  console.log('')
  console.log('Note: Review each file to verify the mappings are correct')
  console.log('for your specific security requirements.')
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main as fixRolesDepartments }
