/**
 * Availables Audit Parser
 *
 * For user-uploaded "Available Units" files downloaded directly from Yardi.
 * Key differences from useParseAvailables:
 *   - Accepts any filename (validated by column headers, not filename pattern)
 *   - No "Property" column - property_code is injected by the caller
 *   - All comparison fields required: rows with missing data are skipped
 *
 * Expected Yardi column headers:
 *   Unit | Unit Type | BR | Market Rent | Date Available | Days Vac. | Sqft | Occ. | Amenities | Brochure | Specials | Hold Until
 */

import { useGenericParser } from '../useGenericParser'
import type { ParserConfig, ParsedResult } from '../../types/index'

export interface AvailablesAuditRow {
  property_code: string | null    // Injected after parsing from activeProperty
  unit_name: string | null
  floor_plan: string | null
  bedroom_count: any | null
  offered_rent: number | null     // "Market Rent" column
  available_date: string | null   // "Date Available" column
  days_vacant: any | null
  sqft: any | null
  status: string | null           // Raw "Occ." value (e.g., "V", "O", "ON")
  amenities: string | null        // Raw amenities string from cell
  unit_id?: string | null
}

/**
 * Required headers that must be present to confirm this is an Availables file.
 * Used for user-facing validation before comparison begins.
 */
export const AVAILABLES_AUDIT_REQUIRED_HEADERS = [
  'Unit',
  'Market Rent',
  'Date Available',
  'Occ.',
  'Amenities'
]

const config: ParserConfig = {
  id: 'AvailablesAudit',
  namePattern: '.*',    // Accept any filename — validated by column headers below
  headerRow: 1,
  strategy: 'standard',
  mapping: {
    // NOTE: No 'Property' column — caller injects property_code after parsing
    // Comparison fields required — rows missing any of these are skipped (e.g. blank trailing rows)
    'Unit':           { targetField: 'unit_name',       required: true  },
    'Unit Type':      { targetField: 'floor_plan',      required: true  },
    'BR':             { targetField: 'bedroom_count',   required: false },
    'Market Rent':    { targetField: 'offered_rent',    transform: 'currency', required: true  },
    'Date Available': { targetField: 'available_date',  transform: 'date',     required: true  },
    'Days Vac.':      { targetField: 'days_vacant',     required: false },
    'Sqft':           { targetField: 'sqft',            required: false },
    'Occ.':           { targetField: 'status',          required: true  },
    'Amenities':      { targetField: 'amenities',       required: false },
    'Brochure':       { targetField: '_skipped',        transform: 'skip' },
    'Specials':       { targetField: '_skipped',        transform: 'skip' },
    'Hold Until':     { targetField: '_skipped',        transform: 'skip' }
  }
}

export async function useParseAvailablesAudit(
  file: File
): Promise<ParsedResult<AvailablesAuditRow>> {
  return useGenericParser<AvailablesAuditRow>(file, config)
}

export const AvailablesAuditConfig = config
