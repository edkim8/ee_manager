// File: app/composables/parsers/useParseAvailables.ts
// Description: A thin wrapper that provides the specific configuration for
// parsing an Availables file to the generic parser engine.

import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { AvailableRaw } from '@/types/availables';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';
import { subDays, isValid, parseISO, format } from 'date-fns';
import { parseCurrency, formatDateForDB } from '@/utils/formatters';
/**
 * A composable to handle the parsing of a Yardi Availables Excel file.
 *
 * @param file - The File object from the input.
 * @param unitsLookup - The pre-fetched array of all units for fast lookups.
 * @returns A Promise that resolves with an array of structured Available objects, or null.
 */
export function useParseAvailables(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<AvailableRaw[] | null> {
  // --- THIS IS THE FIX ---
  // 1. First, we extract the date from the filename.
  const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) {
    // In a real app, a toastError would be better here, but for now, we'll log.
    console.error('Invalid filename format. Date missing.');
    return Promise.resolve(null);
  }
  const fileDate = parseISO(dateMatch[1]);
  if (!isValid(fileDate)) {
    console.error('Invalid date in filename.');
    return Promise.resolve(null);
  }

  // 2. Now that we have the fileDate, we can define the configuration object.
  // The transform function for 'days_vac' now has access to `fileDate` via closure.
  const availablesConfig: ParserConfig = {
    expectedFilenamePrefix: '5p_availables',
    headerRowNumber: 1,
    headerMappings: {
      property: {
        db_field: 'apt_code',
        transform: (value: any) => getApartmentCode(value),
      },
      unit: { db_field: 'unit_code', transform: (v) => String(v || '').trim() },
      market_rent: {
        db_field: 'yardi_rent',
        transform: parseCurrency,
      },
      date_available: {
        db_field: 'available_date',
        transform: formatDateForDB,
      },
      occ: { db_field: 'occupancy_status' },
      days_vac: {
        db_field: 'move_out_date',
        transform: (value: any) => {
          const days = Number(value);
          if (isNaN(days) || days === 0) return null;
          // It uses the `fileDate` from the outer scope.
          const date = subDays(fileDate, days);
          return formatDateForDB(date);
        },
      },
      amenities: { db_field: 'amenities' },
    },
    getUniqueId: (row: any) => `${row.apt_code}_${row.unit_id}`,
  };

  // 3. Call the generic parser with the specific configuration.
  return useGenericParser(file, availablesConfig, unitsLookup);
}
