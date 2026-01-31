// File: app/composables/parsers/useParseNotices.ts
// Description: A thin wrapper that provides the specific configuration for
// parsing a Notices file to the generic parser engine.

import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { NoticeRaw } from '@/types/notices';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';
import { isValid } from 'date-fns';

// 1. Define the specific configuration for this file type.
const noticesConfig: ParserConfig = {
  expectedFilenamePrefix: '5p_notices',
  headerRowNumber: 1, // This file has headers on the first row
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
    move_out_date: {
      db_field: 'move_out_date',
      transform: (value: any) =>
        value instanceof Date && isValid(value) ? value : null,
    },
  },
  // For a notice, the unique entity is the notice for a specific unit.
  // A unit can only have one active notice at a time.
  getUniqueId: (row: any) => `${row.apt_code}_${row.unit_id}`,
};

/**
 * A composable to handle the parsing of a Yardi Notices Excel file.
 *
 * @param file - The File object from the input.
 * @param unitsLookup - The pre-fetched array of all units for fast lookups.
 * @returns A Promise that resolves with an array of structured Notice objects, or null.
 */
export function useParseNotices(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<NoticeRaw[] | null> {
  // 2. Call the generic parser with the specific configuration.
  return useGenericParser(file, noticesConfig, unitsLookup);
}
