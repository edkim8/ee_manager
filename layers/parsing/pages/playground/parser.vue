<script setup lang="ts">
/**
 * Parser Engine Playground (Advanced)
 * ====================================
 * Upload File -> Configure Parser -> Map Headers -> Parse -> View Results
 *
 * Features:
 * - Transform options: None, N/A (skip), Currency, Date, Phone, Trim, Yardi Code
 * - Per-column Fill Down (inherit from row above if empty)
 * - Merge Groups with Priority
 * - LIVE PREVIEW: sample_rows show transformed values in real-time
 * - Summary Stats with Group By
 */
import type { ParserConfig, ParsedResult, FieldMapping, BuiltInTransform } from '../../types'
import { useGenericParser } from '../../composables/useGenericParser'
import { presets, exampleResidentsStatusConfig, exampleExpiringLeasesConfig } from '../../composables/useParserFactory'
import {
  parseCurrency,
  formatDateForDB,
  yardiToPropertyCode
} from '../../utils/formatters'
import { getApartmentCode } from '../../utils/helpers'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
interface HeaderMapping {
  sourceHeader: string
  targetField: string
  transform: BuiltInTransform | 'none'
  required: boolean
  fillDown: boolean
  mergeGroup: string
  mergePriority: number
}

interface ConfigExportWithSamples {
  _description: string
  config: Omit<ParserConfig, 'getUniqueId' | 'computedFields'>
  sample_rows: Array<Record<string, any>>
}

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const parseResult = ref<ParsedResult | null>(null)
const detectedHeaders = ref<string[]>([])
const rawPreview = ref<any[][]>([])
const sampleDataRows = ref<any[][]>([]) // First 3 data rows for sample

// Config Builder State
const configId = ref('my_parser')
const configDescription = ref('')
const configStrategy = ref<'standard' | 'yardi_report' | 'fill_down'>('standard')
const configHeaderRow = ref(1)
const configNamePattern = ref('.*')

// Header Mapping State
const headerMappings = ref<HeaderMapping[]>([])

// Summary Stats State
const groupByField = ref<string>('none')
const availableGroupByItems = computed(() => {
  const fields = headerMappings.value
    .filter(m => m.targetField && m.transform !== 'skip' && m.transform !== 'none')
    .map(m => ({ label: m.targetField, id: m.targetField }))
  return [{ label: '(none)', id: 'none' }, ...fields]
})

// UI State
const activeTab = ref<'config' | 'output' | 'export'>('config')

// Transform items for dropdown (USelectMenu uses 'items' prop with 'id' for value-key)
// NOTE: Cannot use empty string '' as id - Reka UI Combobox reserves empty string for "no selection"
const transformItems = [
  { label: '(none) - Use raw value', id: 'none' },
  { label: 'N/A - Ignore this column', id: 'skip' },
  { label: 'Currency ($1,234.56 → 1234.56)', id: 'currency' },
  { label: 'Date (→ yyyy-mm-dd strict)', id: 'date' },
  { label: 'Phone (→ digits only)', id: 'phone' },
  { label: 'Trim (whitespace)', id: 'trim' },
  { label: 'Yardi Code (azres422 → RS)', id: 'yardi_code' }
]

// Example configs for quick testing
const exampleConfigs: Record<string, ParserConfig> = {
  basic: presets.standard({
    id: 'basic_parser',
    namePattern: '.*',
    headerRow: 1,
    mapping: {}
  }),
  residents_status: exampleResidentsStatusConfig,
  expiring_leases: exampleExpiringLeasesConfig
}
const selectedExample = ref<string>('')

// ---------------------------------------------------------------------------
// FILE HANDLING
// ---------------------------------------------------------------------------
async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  selectedFile.value = input.files[0]
  parseResult.value = null

  // Auto-set ID from filename
  const baseName = input.files[0].name.replace(/\.[^/.]+$/, '')
  configId.value = toSnakeCase(baseName)

  // Preview file headers
  await previewFile(input.files[0])
}

async function previewFile(file: File) {
  try {
    const XLSX = await import('xlsx')
    const reader = new FileReader()

    reader.onload = (e) => {
      const buffer = e.target?.result
      if (!buffer) return

      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) return
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) return
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // Store first 10 rows for preview
      rawPreview.value = rows.slice(0, 10)

      // Extract headers from configured row
      const headerRowIdx = configHeaderRow.value - 1
      if (rows[headerRowIdx]) {
        const headers = rows[headerRowIdx]
          .map((h: any) => String(h || '').trim())
          .filter(Boolean)

        detectedHeaders.value = headers

        // Store first 3 data rows for sample (for fill-down verification)
        sampleDataRows.value = rows.slice(headerRowIdx + 1, headerRowIdx + 4)

        // Initialize header mappings with auto-generated target fields
        headerMappings.value = headers.map((header, idx) => ({
          sourceHeader: header,
          targetField: toSnakeCase(header),
          transform: 'none' as BuiltInTransform | 'none',
          required: false,
          fillDown: false,
          mergeGroup: '',
          mergePriority: idx + 1
        }))
      }
    }
    reader.readAsArrayBuffer(file)
  } catch (err) {
    console.error('Preview error:', err)
  }
}

// Re-detect headers when header row changes
watch(configHeaderRow, () => {
  if (selectedFile.value) {
    previewFile(selectedFile.value)
  }
})

// Auto-select Group By field when mappings change (prefer property_code, then status)
watch(headerMappings, (mappings) => {
  // Only auto-select if currently 'none' or empty
  if ((!groupByField.value || groupByField.value === 'none') && mappings.length > 0) {
    // Look for property_code first
    const propertyCodeMapping = mappings.find(m =>
      m.targetField === 'property_code' && m.transform !== 'skip' && m.transform !== 'none'
    )
    if (propertyCodeMapping) {
      groupByField.value = 'property_code'
      return
    }
    // Then look for status
    const statusMapping = mappings.find(m =>
      m.targetField.toLowerCase().includes('status') && m.transform !== 'skip' && m.transform !== 'none'
    )
    if (statusMapping) {
      groupByField.value = statusMapping.targetField
    }
  }
}, { deep: true })

// ---------------------------------------------------------------------------
// TRANSFORM FUNCTIONS (for live preview)
// ---------------------------------------------------------------------------
function applyTransform(value: any, transform: BuiltInTransform | 'none'): any {
  if (!transform || transform === 'none' || transform === 'skip') return value

  switch (transform) {
    case 'currency':
      return parseCurrency(value)
    case 'date':
      return formatDateForDB(value)
    case 'phone':
      if (!value) return null
      const digits = String(value).replace(/\D/g, '')
      return digits.length >= 7 ? digits : null
    case 'trim':
      return String(value || '').trim()
    case 'yardi_code':
      return yardiToPropertyCode(value)
    default:
      return value
  }
}

// ---------------------------------------------------------------------------
// HEADER MAPPING HELPERS
// ---------------------------------------------------------------------------
function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function autoFillTargetField(mapping: HeaderMapping) {
  mapping.targetField = toSnakeCase(mapping.sourceHeader)
  mapping.transform = 'none'
}

function clearMapping(mapping: HeaderMapping) {
  mapping.targetField = ''
  mapping.transform = 'none'
  mapping.required = false
  mapping.fillDown = false
  mapping.mergeGroup = ''
}

function skipColumn(mapping: HeaderMapping) {
  mapping.transform = 'skip'
  mapping.targetField = ''
  mapping.required = false
  mapping.fillDown = false
  mapping.mergeGroup = ''
}

// Get sample value for a header (from first data row)
function getSampleValue(header: string): any {
  const idx = detectedHeaders.value.indexOf(header)
  if (idx >= 0 && sampleDataRows.value[0] && sampleDataRows.value[0][idx] !== undefined) {
    return sampleDataRows.value[0][idx]
  }
  return null
}

// Format raw value for display (handles Date objects nicely)
function formatRawValueForDisplay(value: any): string {
  if (value === null || value === undefined) return '(empty)'
  // Check if it's a Date-like object
  if (typeof value === 'object' && typeof value.getFullYear === 'function') {
    // Show both the raw type and a hint of the value
    const d = value as Date
    return `[Date: ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}]`
  }
  if (value instanceof Date) {
    return `[Date: ${value.getMonth() + 1}/${value.getDate()}/${value.getFullYear()}]`
  }
  return String(value).slice(0, 30)
}

// Get transformed sample value for a header (LIVE PREVIEW)
function getTransformedSampleValue(mapping: HeaderMapping): any {
  const idx = detectedHeaders.value.indexOf(mapping.sourceHeader)
  if (idx < 0) return null

  const rawValue = sampleDataRows.value[0]?.[idx]
  if (mapping.transform === 'skip') return '(skipped)'

  return applyTransform(rawValue, mapping.transform)
}

// Get unique merge groups
const mergeGroups = computed(() => {
  const groups = new Set<string>()
  headerMappings.value.forEach(m => {
    if (m.mergeGroup) groups.add(m.mergeGroup)
  })
  return Array.from(groups)
})

// ---------------------------------------------------------------------------
// FILL-DOWN PREVIEW TRACKING
// ---------------------------------------------------------------------------
// Track which cells would be filled down in the preview
const fillDownCells = computed(() => {
  const cells: Set<string> = new Set() // "rowIdx-colIdx" format

  headerMappings.value.forEach((mapping, colIdx) => {
    if (!mapping.fillDown) return

    let lastValue: any = null
    sampleDataRows.value.forEach((row, rowIdx) => {
      const rawVal = row[colIdx]
      const isEmpty = rawVal === undefined || rawVal === null || String(rawVal).trim() === ''

      if (isEmpty && lastValue !== null) {
        cells.add(`${rowIdx}-${colIdx}`)
      } else if (!isEmpty) {
        lastValue = rawVal
      }
    })
  })

  return cells
})

function isFillDownCell(rowIdx: number, colIdx: number): boolean {
  return fillDownCells.value.has(`${rowIdx}-${colIdx}`)
}

// Get the fill-down value for a cell
function getFillDownValue(rowIdx: number, colIdx: number): any {
  const mapping = headerMappings.value[colIdx]
  if (!mapping?.fillDown) return null

  // Look backwards to find the last non-empty value
  for (let i = rowIdx - 1; i >= 0; i--) {
    const val = sampleDataRows.value[i]?.[colIdx]
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return val
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// CONFIG GENERATION
// ---------------------------------------------------------------------------
const generatedConfig = computed<ParserConfig>(() => {
  const mapping: Record<string, FieldMapping> = {}

  for (const m of headerMappings.value) {
    if (m.transform === 'skip') {
      mapping[m.sourceHeader] = {
        targetField: '_skipped',
        transform: 'skip'
      }
    } else if (m.targetField) {
      // 'none' means no transform - treat same as empty/undefined
      const hasTransform = m.transform && m.transform !== 'none'
      mapping[m.sourceHeader] = {
        targetField: m.targetField,
        ...(hasTransform ? { transform: m.transform as BuiltInTransform } : {}),
        ...(m.required ? { required: true } : {}),
        ...(m.fillDown ? { fillDown: true } : {}),
        ...(m.mergeGroup ? { mergeGroup: m.mergeGroup, mergePriority: m.mergePriority } : {})
      }
    }
  }

  const fillDownFields = headerMappings.value
    .filter(m => m.fillDown && m.targetField)
    .map(m => m.targetField)

  return {
    id: configId.value || 'parser',
    namePattern: configNamePattern.value,
    headerRow: configHeaderRow.value,
    strategy: configStrategy.value,
    ...(fillDownFields.length ? { fillDownFields } : {}),
    mapping,
    getUniqueId: (row: any) => JSON.stringify(row).slice(0, 50)
  }
})

// ---------------------------------------------------------------------------
// LIVE TRANSFORMED SAMPLE ROWS (with required field validation)
// ---------------------------------------------------------------------------
interface TransformedRow {
  data: Record<string, any>
  isValid: boolean
  invalidFields: string[]
}

// Build property map for yardi_report strategy (scan raw preview rows for subheadings)
// Returns property_code values like 'CV', 'RS', 'SB' (NOT Yardi IDs)
const yardiPropertyMap = computed(() => {
  const map = new Map<number, string>() // rowIdx -> property_code (e.g., 'CV')
  const skipRowsPreview = new Set<number>() // Rows to skip in preview

  if (configStrategy.value !== 'yardi_report') return map

  let lastPropertyCode: string | null = null
  const headerIdx = configHeaderRow.value - 1

  rawPreview.value.forEach((row, idx) => {
    const firstCell = String(row[0] || '').trim()

    // Check for property group header: "City View(cacitvie) - Expiring Leases"
    const yardiIdMatch = firstCell.match(/\(([a-zA-Z0-9]+)\)/)
    if (yardiIdMatch && yardiIdMatch[1]) {
      const yardiId = yardiIdMatch[1].toLowerCase()
      const propertyCode = yardiToPropertyCode(yardiId)
      if (propertyCode) {
        lastPropertyCode = propertyCode
        skipRowsPreview.add(idx)
      }
    }

    // Check for total row
    if (firstCell.toLowerCase().startsWith('total for') || firstCell.toLowerCase().startsWith('total:')) {
      skipRowsPreview.add(idx)
    }

    // Map data rows (after header) to their property_code
    if (idx > headerIdx && lastPropertyCode && !skipRowsPreview.has(idx)) {
      map.set(idx - headerIdx - 1, lastPropertyCode) // 0-indexed data row
    }
  })

  return map
})

const transformedSampleRowsWithValidation = computed((): TransformedRow[] => {
  if (!sampleDataRows.value.length) return []

  const lastFillValues: Record<number, any> = {} // colIdx -> lastValue

  return sampleDataRows.value.map((rowData, rowIdx) => {
    const sample: Record<string, any> = {}
    const mergeCollector: Record<string, Array<{ value: any; priority: number; targetField: string }>> = {}

    // For yardi_report strategy, inject property_code from property map
    if (configStrategy.value === 'yardi_report') {
      const propertyCode = yardiPropertyMap.value.get(rowIdx)
      if (propertyCode) {
        sample.property_code = propertyCode
      }
    }

    headerMappings.value.forEach((mapping, colIdx) => {
      if (mapping.transform === 'skip' || !mapping.targetField) return

      let rawVal = rowData?.[colIdx]

      // Apply Fill-Down logic
      if (mapping.fillDown) {
        const isEmpty = rawVal === undefined || rawVal === null || String(rawVal).trim() === ''
        if (isEmpty && lastFillValues[colIdx] !== undefined) {
          rawVal = lastFillValues[colIdx]
        } else if (!isEmpty) {
          lastFillValues[colIdx] = rawVal
        }
      }

      // Apply Transform
      const transformedVal = applyTransform(rawVal, mapping.transform)

      // Handle Merge Groups
      if (mapping.mergeGroup) {
        if (!mergeCollector[mapping.mergeGroup]) {
          mergeCollector[mapping.mergeGroup] = []
        }
        mergeCollector[mapping.mergeGroup].push({
          value: transformedVal,
          priority: mapping.mergePriority,
          targetField: mapping.targetField
        })
      } else {
        // Don't overwrite property_code from yardi_report strategy
        if (configStrategy.value === 'yardi_report' && mapping.targetField === 'property_code' && sample.property_code) {
          // Keep the property_code from property map
        } else {
          sample[mapping.targetField] = transformedVal
        }
      }
    })

    // Resolve merge groups (first non-empty by priority)
    for (const [groupName, entries] of Object.entries(mergeCollector)) {
      entries.sort((a, b) => a.priority - b.priority)
      const winner = entries.find(e =>
        e.value !== null && e.value !== undefined && String(e.value).trim() !== ''
      )
      // Use the first entry's targetField as the output field
      const targetField = entries[0]?.targetField || groupName
      sample[targetField] = winner?.value ?? null
    }

    // Check required field validation
    const invalidFields: string[] = []
    headerMappings.value.forEach((mapping) => {
      if (mapping.required && mapping.targetField && mapping.transform !== 'skip') {
        const val = sample[mapping.targetField]
        if (val === undefined || val === null || String(val).trim() === '') {
          invalidFields.push(mapping.targetField)
        }
      }
    })

    return {
      data: sample,
      isValid: invalidFields.length === 0,
      invalidFields
    }
  })
})

// Filtered valid sample rows (for output)
const transformedSampleRows = computed(() => {
  return transformedSampleRowsWithValidation.value
    .filter(row => row.isValid)
    .map(row => row.data)
})

// All sample rows (valid + invalid) for display
const allSampleRowsWithStatus = computed(() => {
  return transformedSampleRowsWithValidation.value
})

// Count of invalid sample rows
const invalidSampleRowsCount = computed(() => {
  return transformedSampleRowsWithValidation.value.filter(r => !r.isValid).length
})

// Full config export with transformed sample rows
const configExport = computed<ConfigExportWithSamples>(() => {
  const config = { ...generatedConfig.value }
  delete (config as any).getUniqueId

  return {
    _description: configDescription.value || 'Parser configuration',
    config: config as any,
    sample_rows: transformedSampleRows.value
  }
})

const generatedConfigJson = computed(() => {
  return JSON.stringify(configExport.value, null, 2)
})

// ---------------------------------------------------------------------------
// PARSING
// ---------------------------------------------------------------------------
async function parseFile() {
  if (!selectedFile.value) return

  isLoading.value = true
  parseResult.value = null

  try {
    const result = await useGenericParser(selectedFile.value, generatedConfig.value, {
      groupByFields: groupByField.value && groupByField.value !== 'none' ? [groupByField.value] : []
    })
    parseResult.value = result
    activeTab.value = 'output'
  } catch (err: any) {
    parseResult.value = {
      data: [],
      errors: [err.message || 'Parse error'],
      meta: { filename: selectedFile.value.name, totalRows: 0, parsedRows: 0 }
    }
  } finally {
    isLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// EXAMPLE CONFIG LOADER
// ---------------------------------------------------------------------------
function loadExampleConfig() {
  if (!selectedExample.value) return
  const config = exampleConfigs[selectedExample.value]
  if (config) {
    configId.value = config.id
    configStrategy.value = config.strategy
    configHeaderRow.value = config.headerRow || 1
    configNamePattern.value = config.namePattern

    // Set description based on preset
    const descriptions: Record<string, string> = {
      basic: 'Basic parser with auto-detect headers',
      residents_status: 'Residents Status report with fill-down for property grouping',
      expiring_leases: 'Expiring Leases report (yardi_report strategy). Property groups extracted from "(code)" pattern. Rows without valid unit_code are filtered.'
    }
    configDescription.value = descriptions[selectedExample.value] || ''
  }
}

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------
function clearAll() {
  selectedFile.value = null
  parseResult.value = null
  detectedHeaders.value = []
  rawPreview.value = []
  sampleDataRows.value = []
  headerMappings.value = []
  configId.value = 'my_parser'
  configDescription.value = ''
  groupByField.value = 'none'
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

const jsonOutput = computed(() => {
  if (!parseResult.value) return ''
  return JSON.stringify(parseResult.value, null, 2)
})

const mappedFieldsCount = computed(() =>
  headerMappings.value.filter(m => m.targetField && m.transform !== 'skip').length
)

const skippedFieldsCount = computed(() =>
  headerMappings.value.filter(m => m.transform === 'skip').length
)

const groupByStats = computed(() => {
  if (!parseResult.value?.meta.groupBy || !groupByField.value || groupByField.value === 'none') return null
  return parseResult.value.meta.groupBy[groupByField.value]
})

// Check if a value was transformed (for visual indicator)
function wasTransformed(mapping: HeaderMapping): boolean {
  if (!mapping.transform || mapping.transform === 'none' || mapping.transform === 'skip') return false
  const raw = getSampleValue(mapping.sourceHeader)
  const transformed = getTransformedSampleValue(mapping)
  return String(raw) !== String(transformed)
}

// Get field stats from sample rows (for mini-summary)
function getFieldSampleStats(targetField: string): { uniqueCount: number; values: string[] } {
  const values = transformedSampleRows.value
    .map(row => row[targetField])
    .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    .map(v => String(v))

  const uniqueValues = [...new Set(values)]
  return {
    uniqueCount: uniqueValues.length,
    values: uniqueValues.slice(0, 5) // Limit to 5 for display
  }
}

// ---------------------------------------------------------------------------
// EXPORT AS PARSER - Generate dedicated useParser{ID}.ts file
// ---------------------------------------------------------------------------

// Convert config ID to PascalCase for function name
function toPascalCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

// Generate the parser TypeScript code
const generatedParserCode = computed(() => {
  const id = configId.value || 'my_parser'
  const pascalName = toPascalCase(id)
  const functionName = `useParse${pascalName}`
  const typeName = `${pascalName}Row`

  // Build mapping object string
  const mappingLines: string[] = []
  for (const m of headerMappings.value) {
    if (m.transform === 'skip') {
      mappingLines.push(`    '${m.sourceHeader}': { targetField: '_skipped', transform: 'skip' }`)
    } else if (m.targetField) {
      const parts: string[] = [`targetField: '${m.targetField}'`]
      if (m.transform && m.transform !== 'none') {
        parts.push(`transform: '${m.transform}'`)
      }
      if (m.required) {
        parts.push(`required: true`)
      }
      if (m.fillDown) {
        parts.push(`fillDown: true`)
      }
      if (m.mergeGroup) {
        parts.push(`mergeGroup: '${m.mergeGroup}'`, `mergePriority: ${m.mergePriority}`)
      }
      mappingLines.push(`    '${m.sourceHeader}': { ${parts.join(', ')} }`)
    }
  }

  // Build required fields list for unique ID
  const requiredFields = headerMappings.value
    .filter(m => m.required && m.targetField && m.transform !== 'skip')
    .map(m => m.targetField)

  // Generate unique ID function based on required fields or property_code + first field
  let uniqueIdFields = requiredFields.length > 0
    ? requiredFields
    : headerMappings.value
        .filter(m => m.targetField && m.transform !== 'skip')
        .slice(0, 2)
        .map(m => m.targetField)

  if (configStrategy.value === 'yardi_report' && !uniqueIdFields.includes('property_code')) {
    uniqueIdFields = ['property_code', ...uniqueIdFields]
  }

  const uniqueIdExpr = uniqueIdFields.map(f => `\${row.${f} || ''}`).join('_')

  // Build fill down fields array
  const fillDownFields = headerMappings.value
    .filter(m => m.fillDown && m.targetField)
    .map(m => `'${m.targetField}'`)

  // Generate the code
  return `/**
 * Auto-generated by Parser Engine Playground
 * Parser: ${id}
 * Description: ${configDescription.value || 'Generated parser configuration'}
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * Usage:
 *   import { ${functionName} } from './useParse${pascalName}'
 *   const result = await ${functionName}(file, { unitsLookup })
 */

import { useGenericParser } from '../useGenericParser'
import type { ParserConfig, ParsedResult } from '../../types'

/**
 * Type definition for parsed rows from this parser.
 * Customize this interface based on your data structure.
 */
export interface ${typeName} {
${headerMappings.value
  .filter(m => m.targetField && m.transform !== 'skip')
  .map(m => {
    const tsType = m.transform === 'currency' ? 'number | null'
      : m.transform === 'date' ? 'string | null'
      : 'string | null'
    return `  ${m.targetField}: ${tsType}`
  })
  .join('\n')}${configStrategy.value === 'yardi_report' ? '\n  property_code: string | null' : ''}
  unit_id?: string | null
  unique_id?: string
}

/**
 * Parser configuration for ${id}
 */
const config: ParserConfig = {
  id: '${id}',
  namePattern: '${configNamePattern.value}',
  headerRow: ${configHeaderRow.value},
  strategy: '${configStrategy.value}',${fillDownFields.length > 0 ? `\n  fillDownFields: [${fillDownFields.join(', ')}],` : ''}
  mapping: {
${mappingLines.join(',\n')}
  },
  getUniqueId: (row) => \`${uniqueIdExpr}\`
}

/**
 * Parse a ${id.replace(/_/g, ' ')} file.
 *
 * @param file - The Excel/CSV file to parse
 * @param options - Optional: { unitsLookup } for unit ID resolution
 * @returns ParsedResult with data array and metadata
 */
export async function ${functionName}(
  file: File,
  options?: {
    unitsLookup?: Array<{ apt_code: string; name: string; unit_id: string }>
  }
): Promise<ParsedResult<${typeName}>> {
  return useGenericParser<${typeName}>(file, config, options)
}

/**
 * Export the config for external use or modification
 */
export const ${id}Config = config
`
})

// Copy parser code to clipboard
function copyParserCode() {
  navigator.clipboard.writeText(generatedParserCode.value)
}

// Download parser as .ts file
function downloadParserFile() {
  const id = configId.value || 'my_parser'
  const pascalName = toPascalCase(id)
  const filename = `useParse${pascalName}.ts`

  const blob = new Blob([generatedParserCode.value], { type: 'text/typescript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

</script>

<template>
  <div class="p-6 max-w-[1800px] mx-auto">
    <!-- HEADER -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Parser Engine Playground
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Upload File → Map Headers → Generate Config → Parse to JSON
      </p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- COLUMN 1: FILE & BASIC CONFIG -->
      <div class="space-y-6">
        <!-- FILE UPLOAD -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-arrow-up" class="w-5 h-5" />
              <span class="font-semibold">1. Upload File</span>
            </div>
          </template>

          <div class="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-300"
              @change="onFileChange"
            />

            <div v-if="selectedFile" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">{{ selectedFile.name }}</span>
                <UButton size="xs" variant="ghost" color="error" @click="clearAll">
                  Clear
                </UButton>
              </div>
              <span class="text-xs text-gray-500">
                {{ (selectedFile.size / 1024).toFixed(1) }} KB
              </span>
            </div>
          </div>
        </UCard>

        <!-- RAW PREVIEW WITH FILL-DOWN INDICATORS -->
        <UCard v-if="rawPreview.length">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-eye" class="w-5 h-5" />
              <span class="font-semibold">Raw Preview</span>
            </div>
          </template>

          <div class="overflow-auto max-h-48">
            <table class="text-xs w-full">
              <tbody>
                <tr
                  v-for="(row, rowIdx) in rawPreview"
                  :key="rowIdx"
                  :class="{
                    'bg-yellow-50 dark:bg-yellow-900/20 font-medium': rowIdx === configHeaderRow - 1,
                    'bg-blue-50 dark:bg-blue-900/10': rowIdx >= configHeaderRow && rowIdx < configHeaderRow + 3,
                    'border-b border-gray-100 dark:border-gray-800': true
                  }"
                >
                  <td class="px-1 py-0.5 text-gray-400 w-6">{{ rowIdx + 1 }}</td>
                  <td
                    v-for="(cell, colIdx) in row.slice(0, 5)"
                    :key="colIdx"
                    class="px-2 py-0.5 truncate max-w-[70px] relative"
                    :class="{
                      'bg-purple-100 dark:bg-purple-900/30': rowIdx >= configHeaderRow && isFillDownCell(rowIdx - configHeaderRow, colIdx)
                    }"
                    :title="String(cell)"
                  >
                    <!-- Show fill-down ghost value -->
                    <template v-if="rowIdx >= configHeaderRow && isFillDownCell(rowIdx - configHeaderRow, colIdx)">
                      <span class="text-purple-500 italic">
                        {{ getFillDownValue(rowIdx - configHeaderRow, colIdx) ?? '' }}
                      </span>
                      <span class="text-purple-400 text-[10px] ml-0.5">↓</span>
                    </template>
                    <template v-else>
                      {{ cell ?? '' }}
                    </template>
                  </td>
                  <td v-if="row.length > 5" class="text-gray-400 px-1">...</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="text-xs text-gray-500 mt-2 space-y-0.5">
            <p><span class="bg-yellow-100 dark:bg-yellow-900/30 px-1">Yellow</span> = Headers</p>
            <p><span class="bg-blue-100 dark:bg-blue-900/30 px-1">Blue</span> = Sample Rows (3)</p>
            <p v-if="fillDownCells.size > 0"><span class="bg-purple-100 dark:bg-purple-900/30 px-1 text-purple-600">Purple</span> = Fill↓ values</p>
          </div>
        </UCard>

        <!-- PARSER CONFIG -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5" />
                <span class="font-semibold">2. Parser Settings</span>
              </div>
              <USelectMenu
                v-model="selectedExample"
                placeholder="Load Example..."
                :items="[
                  { label: 'Basic (Auto)', id: 'basic' },
                  { label: 'Residents Status', id: 'residents_status' },
                  { label: 'Expiring Leases', id: 'expiring_leases' }
                ]"
                value-key="id"
                size="xs"
                class="w-40"
                @change="loadExampleConfig"
              />
            </div>
          </template>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium mb-1">Parser ID</label>
              <UInput v-model="configId" placeholder="my_parser" size="sm" />
            </div>

            <div>
              <label class="block text-xs font-medium mb-1">Description</label>
              <UTextarea
                v-model="configDescription"
                placeholder="Parser for XYZ reports..."
                :rows="2"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium mb-1">Strategy</label>
                <USelectMenu
                  v-model="configStrategy"
                  :items="[
                    { label: 'Standard', id: 'standard' },
                    { label: 'Yardi Report', id: 'yardi_report' },
                    { label: 'Fill Down', id: 'fill_down' }
                  ]"
                  value-key="id"
                  size="sm"
                />
              </div>

              <div>
                <label class="block text-xs font-medium mb-1">Header Row</label>
                <UInput v-model.number="configHeaderRow" type="number" min="1" size="sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium mb-1">Filename Pattern (Regex)</label>
              <UInput v-model="configNamePattern" placeholder=".*" size="sm" />
            </div>

            <div>
              <label class="block text-xs font-medium mb-1">Summary Group By</label>
              <USelectMenu
                v-model="groupByField"
                :items="availableGroupByItems"
                value-key="id"
                placeholder="Select field..."
                size="sm"
              />
            </div>
          </div>
        </UCard>

        <!-- MERGE GROUPS INFO -->
        <UCard v-if="mergeGroups.length">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-squares-plus" class="w-5 h-5" />
              <span class="font-semibold">Merge Groups</span>
            </div>
          </template>

          <div class="space-y-2">
            <div
              v-for="group in mergeGroups"
              :key="group"
              class="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
            >
              <span class="font-medium text-primary-600">{{ group }}</span>
              <span class="text-gray-500 ml-2">→</span>
              <span class="text-xs text-gray-500 ml-1">
                {{ headerMappings.filter(m => m.mergeGroup === group).map(m => m.sourceHeader).join(', ') }}
              </span>
            </div>
            <p class="text-xs text-gray-500">First non-empty value by priority wins</p>
          </div>
        </UCard>
      </div>

      <!-- COLUMN 2: HEADER MAPPING -->
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5" />
                <span class="font-semibold">3. Map Headers</span>
              </div>
              <div class="flex items-center gap-2">
                <UBadge v-if="mappedFieldsCount" variant="soft" color="primary" size="xs">
                  {{ mappedFieldsCount }} mapped
                </UBadge>
                <UBadge v-if="skippedFieldsCount" variant="soft" color="neutral" size="xs">
                  {{ skippedFieldsCount }} ignored
                </UBadge>
              </div>
            </div>
          </template>

          <div v-if="!headerMappings.length" class="py-8 text-center text-gray-400">
            <UIcon name="i-heroicons-table-cells" class="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Upload a file to detect headers</p>
          </div>

          <div v-else class="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            <div
              v-for="(mapping, idx) in headerMappings"
              :key="mapping.sourceHeader"
              class="p-3 border rounded-lg transition-colors"
              :class="{
                'border-gray-200 dark:border-gray-700': mapping.transform !== 'skip',
                'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30': mapping.transform === 'skip'
              }"
            >
              <!-- Source Header & Live Preview -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 w-4">{{ idx + 1 }}</span>
                    <span class="font-medium text-sm truncate" :class="{ 'line-through text-gray-400': mapping.transform === 'skip' }">
                      {{ mapping.sourceHeader }}
                    </span>
                  </div>
                  <!-- LIVE TRANSFORM PREVIEW -->
                  <div v-if="getSampleValue(mapping.sourceHeader) !== null" class="ml-6 text-xs space-y-0.5">
                    <div class="text-gray-400 truncate">
                      raw: "{{ formatRawValueForDisplay(getSampleValue(mapping.sourceHeader)) }}"
                    </div>
                    <div
                      v-if="mapping.transform && mapping.transform !== 'skip' && mapping.transform !== 'none'"
                      class="truncate"
                      :class="wasTransformed(mapping) ? 'text-green-600 font-medium' : 'text-gray-400'"
                    >
                      → {{ getTransformedSampleValue(mapping) ?? '(null)' }}
                      <span v-if="wasTransformed(mapping)" class="text-green-500">✓</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-arrow-path"
                    title="Auto-generate"
                    @click="autoFillTargetField(mapping)"
                  />
                  <UButton
                    size="xs"
                    variant="ghost"
                    :color="mapping.transform === 'skip' ? 'primary' : 'neutral'"
                    icon="i-heroicons-eye-slash"
                    title="Ignore column (N/A)"
                    @click="skipColumn(mapping)"
                  />
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-x-mark"
                    title="Clear"
                    @click="clearMapping(mapping)"
                  />
                </div>
              </div>

              <!-- Skipped indicator -->
              <div v-if="mapping.transform === 'skip'" class="text-center py-1">
                <span class="text-xs text-gray-400 italic">Column ignored (N/A)</span>
              </div>

              <!-- Mapping Controls (only if not skipped) -->
              <template v-else>
                <!-- Target Field Input -->
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <UInput
                    v-model="mapping.targetField"
                    placeholder="target_field_name"
                    size="xs"
                    class="flex-1 font-mono"
                  />
                </div>

                <!-- Transform -->
                <div class="mb-2">
                  <USelectMenu
                    v-model="mapping.transform"
                    :items="transformItems"
                    value-key="id"
                    placeholder="Select Transform..."
                    size="xs"
                  />
                </div>

                <!-- Options Row -->
                <div class="flex items-center gap-3 text-xs">
                  <label
                    class="flex items-center gap-1 cursor-pointer"
                    title="⚠️ REQUIRED: Row will be INVALID/SKIPPED if this field is empty or null. Use this to filter out incomplete rows."
                  >
                    <input
                      v-model="mapping.required"
                      type="checkbox"
                      class="rounded border-gray-300 w-3 h-3"
                    />
                    <span class="text-warning-600">Required*</span>
                  </label>

                  <label
                    class="flex items-center gap-1 cursor-pointer"
                    title="FILL DOWN: If this cell is empty, inherit the value from the row above. Useful for grouped data."
                  >
                    <input
                      v-model="mapping.fillDown"
                      type="checkbox"
                      class="rounded border-gray-300 w-3 h-3"
                    />
                    <span class="text-purple-600">Fill↓</span>
                  </label>

                  <div class="flex items-center gap-1 flex-1">
                    <span class="text-gray-400">Merge:</span>
                    <UInput
                      v-model="mapping.mergeGroup"
                      placeholder="group"
                      size="xs"
                      class="w-16 font-mono"
                    />
                    <UInput
                      v-if="mapping.mergeGroup"
                      v-model.number="mapping.mergePriority"
                      type="number"
                      min="1"
                      placeholder="#"
                      size="xs"
                      class="w-10"
                      title="Priority (lower = higher)"
                    />
                  </div>
                </div>
              </template>
            </div>
          </div>
        </UCard>

        <!-- LEGEND -->
        <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-1">
          <p><span class="font-medium text-gray-500">N/A (Transform)</span> = Skip column entirely, don't parse</p>
          <p><span class="text-warning-600 font-medium">Required*</span> = Row is INVALID/ERROR if this field is empty</p>
          <p><span class="text-purple-600 font-medium">Fill↓</span> = Inherit from row above if empty</p>
          <p><span class="text-green-600 font-medium">→ value ✓</span> = Live transform applied</p>
        </div>

        <!-- PARSE BUTTON -->
        <UButton
          block
          size="lg"
          :loading="isLoading"
          :disabled="!selectedFile || mappedFieldsCount === 0"
          @click="parseFile"
        >
          <UIcon name="i-heroicons-play" class="w-5 h-5 mr-2" />
          Parse File
        </UButton>
      </div>

      <!-- COLUMN 3: OUTPUT -->
      <div class="space-y-6">
        <!-- TAB SWITCHER -->
        <div class="flex gap-2 flex-wrap">
          <UButton
            :variant="activeTab === 'config' ? 'solid' : 'ghost'"
            size="sm"
            @click="activeTab = 'config'"
          >
            Generated Config
          </UButton>
          <UButton
            :variant="activeTab === 'output' ? 'solid' : 'ghost'"
            size="sm"
            :disabled="!parseResult"
            @click="activeTab = 'output'"
          >
            Parsed Data
            <UBadge v-if="parseResult" variant="soft" size="xs" class="ml-1">
              {{ parseResult.meta.parsedRows }}
            </UBadge>
          </UButton>
          <UButton
            :variant="activeTab === 'export' ? 'solid' : 'ghost'"
            size="sm"
            color="success"
            :disabled="mappedFieldsCount === 0"
            @click="activeTab = 'export'"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-1" />
            Export Parser
          </UButton>
        </div>

        <!-- GENERATED CONFIG (scrollable) -->
        <UCard v-if="activeTab === 'config'">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-document-text" class="w-5 h-5" />
                <span class="font-semibold">Generated Config</span>
                <UBadge variant="soft" size="xs" color="success">LIVE</UBadge>
              </div>
              <UButton
                size="xs"
                variant="ghost"
                icon="i-heroicons-clipboard-document"
                @click="copyToClipboard(generatedConfigJson)"
              >
                Copy
              </UButton>
            </div>
          </template>

          <div class="max-h-[600px] overflow-auto">
            <pre class="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">{{ generatedConfigJson }}</pre>
          </div>
        </UCard>

        <!-- LIVE SAMPLE ROWS PREVIEW (with validation) -->
        <UCard v-if="activeTab === 'config' && allSampleRowsWithStatus.length">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-beaker" class="w-5 h-5 text-green-500" />
                <span class="font-semibold">Live Sample Preview</span>
              </div>
              <div class="flex items-center gap-1">
                <UBadge variant="soft" color="success" size="xs">
                  {{ transformedSampleRows.length }} valid
                </UBadge>
                <UBadge v-if="invalidSampleRowsCount > 0" variant="soft" color="error" size="xs">
                  {{ invalidSampleRowsCount }} invalid
                </UBadge>
              </div>
            </div>
          </template>

          <div class="space-y-3 max-h-80 overflow-y-auto">
            <div
              v-for="(row, rowIdx) in allSampleRowsWithStatus"
              :key="rowIdx"
              class="p-2 rounded-lg"
              :class="row.isValid ? 'bg-gray-50 dark:bg-gray-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'"
            >
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-medium" :class="row.isValid ? 'text-gray-500' : 'text-red-600'">
                  Row {{ rowIdx + 1 }}
                  <span v-if="!row.isValid" class="ml-1">(INVALID)</span>
                </p>
                <UBadge v-if="!row.isValid" variant="soft" color="error" size="xs">
                  Missing: {{ row.invalidFields.join(', ') }}
                </UBadge>
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                <template v-for="(value, key) in row.data" :key="key">
                  <span
                    class="font-mono truncate"
                    :class="row.invalidFields.includes(String(key)) ? 'text-red-600 font-bold' : 'text-primary-600'"
                  >
                    {{ key }}:
                  </span>
                  <span
                    class="truncate"
                    :title="String(value)"
                    :class="row.invalidFields.includes(String(key)) ? 'text-red-500 italic' : ''"
                  >
                    {{ value ?? '(empty)' }}
                  </span>
                </template>
              </div>
            </div>
          </div>

          <!-- Sample Stats Mini-Summary -->
          <div v-if="transformedSampleRows.length" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p class="text-xs text-gray-500 mb-2">Quick Stats (from valid sample rows):</p>
            <div class="flex flex-wrap gap-2">
              <template v-for="mapping in headerMappings.filter(m => m.targetField && m.transform !== 'skip')" :key="mapping.targetField">
                <UBadge
                  v-if="getFieldSampleStats(mapping.targetField).uniqueCount > 0"
                  variant="outline"
                  size="xs"
                  :title="'Unique values: ' + getFieldSampleStats(mapping.targetField).values.join(', ')"
                >
                  {{ mapping.targetField }}: {{ getFieldSampleStats(mapping.targetField).uniqueCount }} unique
                </UBadge>
              </template>
            </div>
          </div>
        </UCard>

        <!-- PARSED OUTPUT -->
        <template v-if="activeTab === 'output'">
          <!-- SUMMARY STATS CARD -->
          <UCard v-if="parseResult" class="mb-4">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-primary-500" />
                <span class="font-semibold">Summary Statistics</span>
              </div>
            </template>

            <!-- Main Stats Grid -->
            <div class="grid grid-cols-4 gap-3 mb-4">
              <div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">{{ parseResult.meta.totalRows }}</div>
                <div class="text-xs text-blue-600/70">Total Rows</div>
              </div>
              <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{{ parseResult.meta.parsedRows }}</div>
                <div class="text-xs text-green-600/70">Valid Rows</div>
              </div>
              <div class="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div class="text-2xl font-bold text-red-600">{{ parseResult.meta.totalRows - parseResult.meta.parsedRows }}</div>
                <div class="text-xs text-red-600/70">Filtered Out</div>
              </div>
              <div class="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div class="text-2xl font-bold text-amber-600">{{ parseResult.errors.length }}</div>
                <div class="text-xs text-amber-600/70">Errors</div>
              </div>
            </div>

            <!-- Success Rate -->
            <div class="mb-4">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-gray-500">Parse Success Rate</span>
                <span class="font-medium">{{ parseResult.meta.totalRows > 0 ? Math.round((parseResult.meta.parsedRows / parseResult.meta.totalRows) * 100) : 0 }}%</span>
              </div>
              <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-green-500 transition-all"
                  :style="{ width: parseResult.meta.totalRows > 0 ? `${(parseResult.meta.parsedRows / parseResult.meta.totalRows) * 100}%` : '0%' }"
                />
              </div>
            </div>

            <!-- Group By Breakdown Table -->
            <div v-if="groupByStats && Object.keys(groupByStats).length" class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Breakdown by {{ groupByField }}:
              </p>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <th class="text-left py-2 px-3 text-gray-500 font-medium">{{ groupByField }}</th>
                      <th class="text-right py-2 px-3 text-gray-500 font-medium">Count</th>
                      <th class="text-right py-2 px-3 text-gray-500 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(count, key) in groupByStats"
                      :key="key"
                      class="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td class="py-2 px-3 font-medium">{{ key }}</td>
                      <td class="py-2 px-3 text-right">{{ count }}</td>
                      <td class="py-2 px-3 text-right text-gray-500">
                        {{ parseResult.meta.parsedRows > 0 ? Math.round((count / parseResult.meta.parsedRows) * 100) : 0 }}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- No Group By Selected -->
            <div v-else-if="!groupByField || groupByField === 'none'" class="text-center py-4 text-gray-400 text-sm">
              <UIcon name="i-heroicons-information-circle" class="w-5 h-5 mx-auto mb-1" />
              <p>Select a "Summary Group By" field in Parser Settings to see breakdown</p>
            </div>
          </UCard>

          <!-- ERRORS CARD -->
          <UCard v-if="parseResult?.errors.length" class="mb-4">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-warning-500" />
                <span class="font-semibold">Parse Errors</span>
                <UBadge variant="soft" color="warning" size="xs">{{ parseResult.errors.length }}</UBadge>
              </div>
            </template>

            <ul class="text-xs text-warning-700 dark:text-warning-300 list-disc list-inside space-y-1">
              <li v-for="(err, i) in parseResult.errors.slice(0, 10)" :key="i">{{ err }}</li>
              <li v-if="parseResult.errors.length > 10" class="text-gray-500">
                ...and {{ parseResult.errors.length - 10 }} more errors
              </li>
            </ul>
          </UCard>

          <UCard v-if="parseResult?.data.length">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-rectangle-stack" class="w-5 h-5" />
                <span class="font-semibold">Sample Row</span>
              </div>
            </template>

            <div class="overflow-auto max-h-44">
              <table class="w-full text-sm">
                <tbody>
                  <tr
                    v-for="(value, key) in parseResult.data[0]"
                    :key="key"
                    class="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td class="py-1 px-2 font-mono text-xs text-primary-600 w-1/3">{{ key }}</td>
                    <td class="py-1 px-2 text-xs truncate" :title="String(value)">
                      {{ value ?? '(null)' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>

          <UCard class="max-h-[300px]">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-code-bracket" class="w-5 h-5" />
                <span class="font-semibold">JSON Output</span>
              </div>
            </template>

            <div class="max-h-60 overflow-auto">
              <pre
                v-if="parseResult"
                class="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg"
              >{{ jsonOutput }}</pre>
              <div v-else class="h-full flex items-center justify-center text-gray-400">
                <p>Parse a file to see results</p>
              </div>
            </div>
          </UCard>
        </template>

        <!-- EXPORT PARSER TAB -->
        <template v-if="activeTab === 'export'">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 text-success-500" />
                  <span class="font-semibold">Export as Dedicated Parser</span>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-clipboard-document"
                    @click="copyParserCode"
                  >
                    Copy
                  </UButton>
                  <UButton
                    size="xs"
                    variant="solid"
                    color="success"
                    icon="i-heroicons-arrow-down-tray"
                    @click="downloadParserFile"
                  >
                    Download .ts
                  </UButton>
                </div>
              </div>
            </template>

            <!-- Export Info -->
            <div class="mb-4 p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <div class="flex items-start gap-3">
                <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-success-600 mt-0.5" />
                <div class="text-sm text-success-700 dark:text-success-300">
                  <p class="font-medium mb-1">Generated Parser: useParse{{ toPascalCase(configId) }}.ts</p>
                  <ul class="text-xs space-y-0.5 list-disc list-inside">
                    <li>Save to <code class="bg-success-100 dark:bg-success-800 px-1 rounded">layers/parsing/composables/parsers/</code></li>
                    <li>Import and use: <code class="bg-success-100 dark:bg-success-800 px-1 rounded">const result = await useParse{{ toPascalCase(configId) }}(file)</code></li>
                    <li>Includes TypeScript types and JSDoc comments</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Generated Code Preview -->
            <div class="max-h-[500px] overflow-auto">
              <pre class="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto whitespace-pre">{{ generatedParserCode }}</pre>
            </div>
          </UCard>

          <!-- What's Included -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-clipboard-document-list" class="w-5 h-5" />
                <span class="font-semibold">What's Included</span>
              </div>
            </template>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="font-medium text-primary-600 mb-2">Parser Function</p>
                <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <code>useParse{{ toPascalCase(configId) }}()</code></li>
                  <li>• Typed return: <code>ParsedResult&lt;{{ toPascalCase(configId) }}Row&gt;</code></li>
                  <li>• Optional unitsLookup for unit_id resolution</li>
                </ul>
              </div>
              <div>
                <p class="font-medium text-primary-600 mb-2">Configuration</p>
                <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Strategy: <code>{{ configStrategy }}</code></li>
                  <li>• Header Row: {{ configHeaderRow }}</li>
                  <li>• {{ mappedFieldsCount }} mapped fields</li>
                  <li v-if="skippedFieldsCount">• {{ skippedFieldsCount }} skipped columns</li>
                </ul>
              </div>
            </div>
          </UCard>
        </template>
      </div>
    </div>

    <!-- USAGE NOTES -->
    <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
      <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">Live Preview Features</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-700 dark:text-blue-300">
        <div>
          <p class="font-medium mb-1">Transform Preview:</p>
          <ul class="list-disc list-inside text-xs space-y-0.5">
            <li><strong>Green ✓</strong> = Transform applied successfully</li>
            <li><strong>Yardi Code</strong> = <code>azres422</code> → <code>RS</code> (live)</li>
            <li><strong>Date</strong> = Any format → <code>yyyy-mm-dd</code></li>
          </ul>
        </div>
        <div>
          <p class="font-medium mb-1">Fill-Down Preview:</p>
          <ul class="list-disc list-inside text-xs space-y-0.5">
            <li><span class="text-purple-600">Purple cells</span> show inherited values</li>
            <li><strong>sample_rows</strong> reflect fill-down logic</li>
            <li>Check 3 rows to verify fill-down works</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
