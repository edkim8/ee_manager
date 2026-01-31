// File: app/composables/parsers/useParseAlerts.ts
// Description: A thin wrapper that provides the specific configuration for
// parsing a Yardi Alerts file to the generic parser engine.

import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { AlertRaw } from '@/types/alerts';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';

// 1. Define the specific configuration for this file type.
const alertsConfig: ParserConfig = {
  expectedFilenamePrefix: '5p_alerts',
  headerRowNumber: 1, // Assuming headers are on the first row
  headerMappings: {
    // The keys are the sanitized, snake_case versions of the Excel headers.
    property: {
      db_field: 'apt_code',
      transform: (value: any) => getApartmentCode(value),
    },
    unit: {
      db_field: 'unit_code',
      transform: (v: any) => String(v || '').trim(),
    },
    description: { db_field: 'description' },
    resident: { db_field: 'resident_name' },
  },
  // As you designed, the unique ID is a composite of all key fields
  // to ensure any change is treated as a new alert.
  getUniqueId: (row: any) =>
    `${row.apt_code}_${row.unit_id}_${row.resident_name}_${row.description}`,
};

/**
 * A composable to handle the parsing of a Yardi Alerts Excel file.
 *
 * @param file - The File object from the input.
 * @param unitsLookup - The pre-fetched array of all units for fast lookups.
 * @returns A Promise that resolves with an array of structured Alert objects, or null.
 */
export function useParseAlerts(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<AlertRaw[] | null> {
  // 2. Call the generic parser with the specific configuration.
  return useGenericParser(file, alertsConfig, unitsLookup);
}
