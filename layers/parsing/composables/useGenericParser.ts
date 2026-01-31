import type { ParserConfig, ParsedResult, FieldMapping } from '../types'
import { getApartmentCode, normalizeHeader } from '../utils/helpers'
import { parseCurrency, formatDateForDB, normalizeNameFormat, yardiToPropertyCode } from '../utils/formatters'
import { resolveUnitId } from '../../base/utils/lookup'

/**
 * Generic Parser Engine - The core parsing composable for all Excel/CSV files.
 * Supports three strategies: standard, yardi_report, and fill_down.
 *
 * Features:
 * - Per-field fill-down
 * - Merge groups with priority (first non-empty wins)
 * - Skip columns (transform: 'skip')
 * - Yardi property code extraction (transform: 'yardi_code')
 */
export async function useGenericParser<T = Record<string, any>>(
  file: File,
  config: ParserConfig,
  options?: {
    unitsLookup?: Array<{ apt_code: string; name: string; unit_id: string }>
    groupByFields?: string[] // Fields to compute group-by stats for
  }
): Promise<ParsedResult<T>> {
  const errors: string[] = []
  const unitsLookup = options?.unitsLookup
  const groupByFields = options?.groupByFields || []

  // 1. Validate Filename
  const regex = new RegExp(config.namePattern, 'i')
  if (!regex.test(file.name)) {
    return {
      data: [],
      errors: [`Invalid file type. Expected pattern: ${config.namePattern}`],
      meta: { filename: file.name, totalRows: 0, parsedRows: 0 }
    }
  }

  // 2. Dynamic Import XLSX (SSR-safe)
  let XLSX: typeof import('xlsx')
  try {
    XLSX = await import('xlsx')
  } catch (e) {
    return {
      data: [],
      errors: ['Failed to load parser engine (XLSX).'],
      meta: { filename: file.name, totalRows: 0, parsedRows: 0 }
    }
  }

  // 3. Build unit lookup map if provided
  const unitMap = unitsLookup
    ? new Map(unitsLookup.map(u => [`${u.apt_code}_${u.name}`.toLowerCase(), u.unit_id]))
    : null

  // 4. Build merge groups from config
  const mergeGroups = buildMergeGroups(config.mapping)

  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onerror = () => {
      resolve({
        data: [],
        errors: ['Failed to read file.'],
        meta: { filename: file.name, totalRows: 0, parsedRows: 0 }
      })
    }

    reader.onload = (e) => {
      try {
        const fileBuffer = e.target?.result
        if (!fileBuffer) throw new Error('File buffer is empty')

        const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) throw new Error('No sheets found in workbook')
        const worksheet = workbook.Sheets[firstSheetName]
        if (!worksheet) throw new Error('Could not read worksheet')

        // Convert to Array of Arrays (raw rows)
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (rawRows.length < 2) {
          throw new Error('File appears to be empty or missing data rows.')
        }

        // 5. Determine Header Row Index (1-based in config, 0-based internally)
        const headerRowIndex = (config.headerRow || 1) - 1

        if (rawRows.length <= headerRowIndex) {
          throw new Error(`Header row ${config.headerRow || 1} not found in file.`)
        }

        // 6. Extract and normalize headers
        const rawHeaders = rawRows[headerRowIndex] || []
        const headers: string[] = rawHeaders.map((h: any) => normalizeHeader(String(h || '')))

        // Build mapping: normalized header -> config key
        const headerToConfigKey = new Map<string, string>()
        for (const configKey of Object.keys(config.mapping)) {
          const normalizedConfigKey = normalizeHeader(configKey)
          const matchingHeaderIdx = headers.findIndex(h => h === normalizedConfigKey)
          if (matchingHeaderIdx !== -1) {
            const matchedHeader = headers[matchingHeaderIdx]
            if (matchedHeader) {
              headerToConfigKey.set(matchedHeader, configKey)
            }
          }
        }

        // 6b. Validation: Check for required headers
        // If config requires specific columns, ensure they exist in the file
        const missingHeaders: string[] = []
        for (const [key, fieldConfig] of Object.entries(config.mapping)) {
          if (fieldConfig.required) {
            const normalizedKey = normalizeHeader(key)
            // Check if we found a matching header in the file
            const found = Array.from(headerToConfigKey.keys()).includes(normalizedKey)
            if (!found) {
              missingHeaders.push(key)
            }
          }
        }

        if (missingHeaders.length > 0) {
          throw new Error(`Invalid format. Missing required columns: ${missingHeaders.join(', ')}`)
        }

        // 7. First Pass: Build property map for yardi_report strategy
        // Also track which rows are property headers or totals (to skip them)
        const propertyRowMap = new Map<number, string>() // rowIdx -> property_code (e.g., 'CV')
        const skipRows = new Set<number>() // Rows to skip (property headers, totals)

        if (config.strategy === 'yardi_report') {
          let lastPropertyCode: string | null = null

          rawRows.forEach((row, idx) => {
            const firstCell = String(row[0] || '').trim()

            // Check for property group header: "City View(cacitvie) - Expiring Leases"
            // Pattern: Contains "(yardicode)" in parentheses
            const yardiIdMatch = firstCell.match(/\(([a-zA-Z0-9]+)\)/)
            if (yardiIdMatch && yardiIdMatch[1]) {
              const yardiId = yardiIdMatch[1].toLowerCase()
              const propertyCode = yardiToPropertyCode(yardiId)
              if (propertyCode) {
                lastPropertyCode = propertyCode
                // Mark this row as a property header row - skip it
                skipRows.add(idx)
              }
            }

            // Check for total row: "Total for cacitvie (126)..."
            if (firstCell.toLowerCase().startsWith('total for') || firstCell.toLowerCase().startsWith('total:')) {
              skipRows.add(idx)
            }

            // Assign property_code to data rows
            if (lastPropertyCode && !skipRows.has(idx)) {
              propertyRowMap.set(idx, lastPropertyCode)
            }
          })
        }

        // 8. Parse Data Rows
        const dataRows = rawRows.slice(headerRowIndex + 1)
        const parsedData: T[] = []
        const lastFillValues: Record<string, any> = {} // For fill_down
        const groupByStats: Record<string, Record<string, number>> = {}

        // Initialize group-by stats
        for (const field of groupByFields) {
          groupByStats[field] = {}
        }

        for (let idx = 0; idx < dataRows.length; idx++) {
          const rowArray = dataRows[idx]
          const originalRowIndex = headerRowIndex + 1 + idx

          // Skip property header rows and total rows for yardi_report
          if (config.strategy === 'yardi_report' && skipRows.has(originalRowIndex)) {
            continue
          }

          const cleanRow: Record<string, any> = {}
          const mergeCollector: Record<string, Array<{ value: any; priority: number }>> = {}

          // Inject property_code from property map for yardi_report
          if (config.strategy === 'yardi_report') {
            const propertyCode = propertyRowMap.get(originalRowIndex)
            if (propertyCode) cleanRow.property_code = propertyCode
          }

          // Process each header/column
          headers.forEach((normalizedHeader, colIdx) => {
            const configKey = headerToConfigKey.get(normalizedHeader)
            if (!configKey) return

            const fieldConfig = config.mapping[configKey]
            if (!fieldConfig) return

            // Skip columns marked with 'skip' transform
            if (fieldConfig.transform === 'skip') return

            const currentRow = rowArray || []
            let rawVal = currentRow[colIdx]

            // Per-field Fill Down: inherit from previous row if empty
            const shouldFillDown = fieldConfig.fillDown ||
              (config.strategy === 'fill_down' && config.fillDownFields?.includes(fieldConfig.targetField))

            if (shouldFillDown) {
              if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
                rawVal = lastFillValues[fieldConfig.targetField]
              } else {
                lastFillValues[fieldConfig.targetField] = rawVal
              }
            }

            // Apply transformation
            const transformedVal = applyTransform(rawVal, fieldConfig, cleanRow)

            // Handle merge groups
            if (fieldConfig.mergeGroup) {
              const groupKey = fieldConfig.mergeGroup
              if (!mergeCollector[groupKey]) {
                mergeCollector[groupKey] = []
              }
              const groupEntries = mergeCollector[groupKey]
              if (groupEntries) {
                groupEntries.push({
                  value: transformedVal,
                  priority: fieldConfig.mergePriority ?? 999
                })
              }
            } else {
              cleanRow[fieldConfig.targetField] = transformedVal
            }
          })

          // Resolve merge groups (first non-empty by priority)
          for (const [groupName, entries] of Object.entries(mergeCollector)) {
            const targetField = mergeGroups.get(groupName)
            if (!targetField) continue

            // Sort by priority (lower = higher priority)
            entries.sort((a, b) => a.priority - b.priority)

            // Take first non-empty value
            const winner = entries.find(e =>
              e.value !== null && e.value !== undefined && String(e.value).trim() !== ''
            )
            cleanRow[targetField] = winner?.value ?? null
          }

          // Fill Down for property_code specifically (common pattern)
          // Note: Also check for legacy 'apt_code' field name for backward compatibility
          if (config.strategy === 'fill_down') {
            if (config.fillDownFields?.includes('property_code')) {
              if (!cleanRow.property_code && lastFillValues.property_code) {
                cleanRow.property_code = lastFillValues.property_code
              } else if (cleanRow.property_code) {
                lastFillValues.property_code = cleanRow.property_code
              }
            }
            // Legacy apt_code support
            if (config.fillDownFields?.includes('apt_code')) {
              if (!cleanRow.apt_code && lastFillValues.apt_code) {
                cleanRow.apt_code = lastFillValues.apt_code
              } else if (cleanRow.apt_code) {
                lastFillValues.apt_code = cleanRow.apt_code
              }
            }
          }

          // Computed Fields
          if (config.computedFields) {
            for (const [key, fn] of Object.entries(config.computedFields)) {
              try {
                cleanRow[key] = fn(cleanRow)
              } catch (err) {
                errors.push(`Row ${idx + 1}: Error computing field "${key}"`)
              }
            }
          }

          // Unit ID Lookup (supports both property_code and legacy apt_code)
          const propCode = cleanRow.property_code || cleanRow.apt_code
          
          if (propCode) {
            // 1. Try provided unitMap (runtime override)
            if (unitMap && cleanRow.unit_code && !cleanRow.unit_id) {
               const lookupKey = `${propCode}_${cleanRow.unit_code}`.toLowerCase()
               cleanRow.unit_id = unitMap.get(lookupKey) || null
            }

            // 2. Try Client-Side Lookup (Global) if still missing
            // Note: Parser often maps 'Unit' -> 'unit_name' or 'unit_code'. We check both.
            const unitRef = cleanRow.unit_name || cleanRow.unit_code
            if (!cleanRow.unit_id && unitRef) {
               const resolved = resolveUnitId(propCode, unitRef)
               if (resolved) {
                 cleanRow.unit_id = resolved
               }
            }
          }

          // Generate Unique ID
          if (config.getUniqueId) {
            cleanRow.unique_id = config.getUniqueId(cleanRow)
          }

          // Validate row: check required fields and strategy requirements
          if (!isRowValid(cleanRow, config)) {
            continue
          }

          // Update group-by stats
          for (const field of groupByFields) {
            const fieldValue = String(cleanRow[field] ?? '(empty)')
            const fieldStats = groupByStats[field]
            if (fieldStats) {
              fieldStats[fieldValue] = (fieldStats[fieldValue] || 0) + 1
            }
          }

          parsedData.push(cleanRow as T)
        }

        resolve({
          data: parsedData,
          errors,
          meta: {
            filename: file.name,
            totalRows: dataRows.length,
            parsedRows: parsedData.length,
            ...(groupByFields.length ? { groupBy: groupByStats } : {})
          }
        })
      } catch (err: any) {
        resolve({
          data: [],
          errors: [err.message || 'Error parsing file'],
          meta: { filename: file.name, totalRows: 0, parsedRows: 0 }
        })
      }
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Build a map of merge group name -> target field name
 */
function buildMergeGroups(mapping: Record<string, FieldMapping>): Map<string, string> {
  const groups = new Map<string, string>()

  for (const fieldConfig of Object.values(mapping)) {
    if (fieldConfig.mergeGroup && !groups.has(fieldConfig.mergeGroup)) {
      // Use the target field from the first entry as the group's target
      groups.set(fieldConfig.mergeGroup, fieldConfig.targetField)
    }
  }

  return groups
}

/**
 * Apply built-in or custom transform to a raw value.
 */
function applyTransform(rawVal: any, fieldConfig: FieldMapping, row: Record<string, any>): any {
  if (!fieldConfig.transform) {
    return rawVal
  }

  if (typeof fieldConfig.transform === 'function') {
    return fieldConfig.transform(rawVal, row)
  }

  switch (fieldConfig.transform) {
    case 'currency':
      return parseCurrency(rawVal)
    case 'date':
      return formatDateForDB(rawVal)
    case 'trim':
      return String(rawVal || '').trim()
    case 'phone':
      return normalizePhone(rawVal)
    case 'yardi_code':
      // Simple Yardi ID lookup: azres422 → RS, azstoran → SB, etc.
      // Returns null if not in dictionary (user should verify the Yardi ID is mapped)
      return yardiToPropertyCode(rawVal)
    case 'skip':
      return undefined // Should not reach here, but just in case
    default:
      return rawVal
  }
}

/**
 * Normalize phone numbers to digits only.
 */
function normalizePhone(value: any): string | null {
  if (!value) return null
  const digits = String(value).replace(/\D/g, '')
  return digits.length >= 7 ? digits : null
}

/**
 * Check if a row passes validation based on config requirements.
 */
function isRowValid(
  row: Record<string, any>,
  config: ParserConfig
): boolean {
  // yardi_report requires property_code (or legacy apt_code)
  if (config.strategy === 'yardi_report' && !row.property_code && !row.apt_code) {
    return false
  }

  // Check required fields from mapping
  for (const fieldConfig of Object.values(config.mapping)) {
    if (fieldConfig.required && fieldConfig.transform !== 'skip') {
      const val = row[fieldConfig.targetField]
      if (val === undefined || val === null || String(val).trim() === '') {
        return false
      }
    }
  }

  return true
}
