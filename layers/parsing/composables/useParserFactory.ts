import type { ParserConfig, FieldMapping } from '../types'
import { getApartmentCode } from '../utils/helpers'
import { parseCurrency, formatDateForDB, normalizeNameFormat } from '../utils/formatters'

/**
 * Helper to define a Parser Config with full type support.
 */
export function defineParserConfig(config: ParserConfig): ParserConfig {
  return config
}

/**
 * Shorthand for creating field mappings.
 *
 * @example
 * createMapping({
 *   'Unit': 'unit_code',
 *   'Rent': { target: 'lease_rent', transform: 'currency' },
 *   'Move In': { target: 'move_in_date', transform: 'date', required: true }
 * })
 */
export function createMapping(
  mappings: Record<string, string | {
    target: string
    transform?: FieldMapping['transform']
    required?: boolean
  }>
): Record<string, FieldMapping> {
  const result: Record<string, FieldMapping> = {}
  for (const [key, val] of Object.entries(mappings)) {
    if (typeof val === 'string') {
      result[key] = { targetField: val }
    } else {
      result[key] = {
        targetField: val.target,
        transform: val.transform,
        required: val.required
      }
    }
  }
  return result
}

/**
 * Common transform functions for reuse in configs.
 */
export const transforms = {
  currency: parseCurrency,
  date: formatDateForDB,
  trim: (val: any) => String(val || '').trim(),
  aptCode: getApartmentCode,
  name: normalizeNameFormat,
  phone: (val: any) => {
    if (!val) return null
    const digits = String(val).replace(/\D/g, '')
    return digits.length >= 7 ? digits : null
  },
  boolean: (val: any) => {
    if (val === true || val === 1 || String(val).toLowerCase() === 'yes') return true
    if (val === false || val === 0 || String(val).toLowerCase() === 'no') return false
    return null
  },
  integer: (val: any) => {
    const num = parseInt(String(val), 10)
    return isNaN(num) ? null : num
  }
}

/**
 * Pre-built config templates for common file types.
 */
export const presets = {
  /**
   * Standard config for Yardi-style reports with property subheadings.
   */
  yardiReport: (options: {
    id: string
    namePattern: string
    headerRow: number
    mapping: Record<string, FieldMapping>
    computedFields?: ParserConfig['computedFields']
    getUniqueId?: ParserConfig['getUniqueId']
  }): ParserConfig => ({
    id: options.id,
    namePattern: options.namePattern,
    headerRow: options.headerRow,
    strategy: 'yardi_report',
    mapping: options.mapping,
    computedFields: options.computedFields,
    getUniqueId: options.getUniqueId
  }),

  /**
   * Config for files that use fill-down pattern (like Residents Status).
   */
  fillDown: (options: {
    id: string
    namePattern: string
    headerRow: number
    fillDownFields: string[]
    mapping: Record<string, FieldMapping>
    computedFields?: ParserConfig['computedFields']
    getUniqueId?: ParserConfig['getUniqueId']
  }): ParserConfig => ({
    id: options.id,
    namePattern: options.namePattern,
    headerRow: options.headerRow,
    strategy: 'fill_down',
    fillDownFields: options.fillDownFields,
    mapping: options.mapping,
    computedFields: options.computedFields,
    getUniqueId: options.getUniqueId
  }),

  /**
   * Simple standard config for straightforward header->row files.
   */
  standard: (options: {
    id: string
    namePattern: string
    headerRow?: number
    mapping: Record<string, FieldMapping>
    computedFields?: ParserConfig['computedFields']
    getUniqueId?: ParserConfig['getUniqueId']
  }): ParserConfig => ({
    id: options.id,
    namePattern: options.namePattern,
    headerRow: options.headerRow || 1,
    strategy: 'standard',
    mapping: options.mapping,
    computedFields: options.computedFields,
    getUniqueId: options.getUniqueId
  })
}

/**
 * Example: Residents Status parser config using presets.
 */
export const exampleResidentsStatusConfig = presets.fillDown({
  id: 'residents_status',
  namePattern: '^5p_residents_status',
  headerRow: 6,
  fillDownFields: ['apt_code'],
  mapping: createMapping({
    'property': { target: 'apt_code', transform: getApartmentCode },
    'unit': { target: 'unit_code', transform: 'trim' },
    'code': 'resident_code',
    'tenant': { target: 'resident_name', transform: normalizeNameFormat },
    'rent': { target: 'lease_rent', transform: 'currency' },
    'deposit': { target: 'deposit', transform: 'currency' },
    'status': 'occupancy_status',
    'from': { target: 'lease_from_date', transform: 'date' },
    'to': { target: 'lease_to_date', transform: 'date' },
    'in': { target: 'move_in_date', transform: 'date' },
    'out': { target: 'move_out_date', transform: 'date' },
    'tel_m': 'temp_mobile_phone',
    'tel_h': 'temp_home_phone',
    'tel_o': 'temp_office_phone',
    'email': 'email'
  }),
  computedFields: {
    phone: (row) => row.temp_mobile_phone || row.temp_home_phone || row.temp_office_phone || null
  },
  getUniqueId: (row) => `${row.apt_code}_${row.resident_code}_${row.resident_name}`
})

/**
 * Example: Expiring Leases parser config using yardi_report strategy.
 *
 * File Structure:
 * - Header Row: 4
 * - Property group rows: "City View(cacitvie) - Expiring Leases"
 * - Data rows for each property
 * - Total rows: "Total for cacitvie (126)..." (filtered out by required fields)
 *
 * Strategy: yardi_report
 * - Extracts property code from "(code)" pattern in Column A
 * - Converts Yardi ID to property code (cacitvie → CV)
 * - Injects property_code into all subsequent data rows
 */
export const exampleExpiringLeasesConfig = presets.yardiReport({
  id: 'expiring_leases',
  namePattern: '^5p_ExpiringLeases',
  headerRow: 4,
  mapping: {
    // Empty mapping - user will configure in playground after detecting headers
    // Expected headers: Unit, Unit Type, Resident Status, Market Rent, Unit SqFt,
    // Sec Dep On Hand, Resident Code, Resident Name, Actual Rent, Lease From,
    // Lease To, Move Out, Tel Num(Office), Tel Num(Home)
  },
  getUniqueId: (row) => `${row.property_code}_${row.resident_code}_${row.lease_to_date}`
})
