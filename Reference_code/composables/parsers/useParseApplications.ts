// File: app/composables/parsers/useParseApplications.ts
// Description: A thin wrapper that provides the specific configuration for
// parsing an Applications file to the generic parser engine.

import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { ApplicationRaw } from '@/types/applications';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';
import { isValid } from 'date-fns';

// The "Smart" Mapping Object for Applications files.
const applicationsConfig: ParserConfig = {
  expectedFilenamePrefix: '5p_applications',
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
    agent: { db_field: 'agent' },
    guest: { db_field: 'guest' },
    application_date: {
      db_field: 'application_date',
      transform: (value: any) =>
        value instanceof Date && isValid(value) ? value : null,
    },
    screening_result: { db_field: 'screening_result' },
    screening_last_updated: {
      db_field: 'screening_last_updated',
      transform: (value: any) =>
        value instanceof Date && isValid(value) ? value : null,
    },
  },
  // For an application, the unique entity is the application for a specific unit.
  // We'll use the guest name as part of the key to handle multiple applications for one unit.
  getUniqueId: (row: any) => `${row.apt_code}_${row.unit_id}_${row.guest}`,
};

/**
 * A composable to handle the parsing of a Yardi Applications Excel file.
 *
 * @param file - The File object from the input.
 * @param unitsLookup - The pre-fetched array of all units for fast lookups.
 * @returns A Promise that resolves with an array of structured Application objects, or null.
 */
export function useParseApplications(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<ApplicationRaw[] | null> {
  // Call the generic parser with the specific configuration.
  return useGenericParser(file, applicationsConfig, unitsLookup);
}
