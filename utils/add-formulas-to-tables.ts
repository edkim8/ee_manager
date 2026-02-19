/**
 * Add Auto-Calculation Formulas to Generated Table Configs
 *
 * Updates all generated table Excel files to include priority formulas
 * instead of pre-calculated values.
 *
 * Usage:
 *   npx tsx utils/add-formulas-to-tables.ts
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

async function main() {
  const configDir = 'configs/table-configs'

  // Get all .xlsx files except template and availabilities (example)
  const files = fs.readdirSync(configDir)
    .filter(f => f.endsWith('.xlsx'))
    .filter(f => f !== 'template.xlsx' && f !== 'availabilities.xlsx')

  console.log(`🔧 Adding formulas to ${files.length} table configurations...\n`)

  let successCount = 0

  for (const fileName of files) {
    const filePath = path.join(configDir, fileName)

    try {
      // Read existing workbook
      const workbook = XLSX.readFile(filePath)

      // Get Column Definitions sheet
      const sheet = workbook.Sheets['Column Definitions']
      if (!sheet) {
        console.log(`⚠️  Skipping ${fileName} - No "Column Definitions" sheet`)
        continue
      }

      // Convert to array of arrays to find data rows
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      // Find the priority column (should be column F, index 5)
      const headerRow = data[0] as string[]
      const priorityColIndex = headerRow.indexOf('priority')

      if (priorityColIndex === -1) {
        console.log(`⚠️  Skipping ${fileName} - No "priority" column found`)
        continue
      }

      // Column letter for priority (5 = F)
      const priorityCol = String.fromCharCode(65 + priorityColIndex) // 65 = 'A'

      // Add formula to each data row (starting from row 2, index 1)
      let rowsUpdated = 0
      for (let i = 1; i < data.length; i++) {
        const rowNum = i + 1 // Excel rows start at 1
        const cellAddress = `${priorityCol}${rowNum}`

        // Create formula cell
        sheet[cellAddress] = {
          t: 'str', // String type (formula results in string)
          f: `IF(SUM($C$2:C${rowNum})<=350,"P1",IF(SUM($C$2:C${rowNum})<=780,"P2",IF(SUM($C$2:C${rowNum})<=1140,"P3",IF(SUM($C$2:C${rowNum})<=1880,"P4","P5"))))`,
          v: sheet[cellAddress]?.v || '' // Preserve existing value as cached value
        }
        rowsUpdated++
      }

      // Write back to file
      XLSX.writeFile(workbook, filePath)

      console.log(`✅ ${fileName}`)
      console.log(`   📋 ${rowsUpdated} formulas added to column ${priorityCol}`)

      successCount++
    } catch (error: any) {
      console.error(`❌ Failed to process ${fileName}: ${error.message}`)
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Updated ${successCount}/${files.length} files with formulas`)
  console.log('')
  console.log('Now when you:')
  console.log('1. Change column widths in Excel')
  console.log('2. Reorder columns (drag rows)')
  console.log('3. Add/remove columns')
  console.log('')
  console.log('The priority column will auto-calculate! 🎉')
  console.log('')
  console.log('Note: You may need to open and save each file in Excel')
  console.log('to see the formulas evaluate.')
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main as addFormulasToTables }
