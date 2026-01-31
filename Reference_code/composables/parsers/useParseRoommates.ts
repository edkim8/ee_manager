import { useParseResidentsStatus } from '@/composables/parsers/useParseResidentsStatus';
import type { ResidentsStatusRaw } from '@/types/residents';
import type { UnitLookupItem } from '@/types/apartments';

const ROOMMATE_STATUSES = ['Roommate', 'Occupant'];

/**
 * A "wrapper" parser that uses the main resident status parser and then
 * filters the results to return only roommate records.
 */
export async function useParseRoommates(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<ResidentsStatusRaw[] | null> {
  // 1. Call the main, powerful parser that reads the whole file.
  const allParsedData = await useParseResidentsStatus(file, unitsLookup);

  if (!allParsedData) {
    return null;
  }

  // 2. Filter the results to return only the rows that are roommates or occupants.
  const roommatesOnly = allParsedData.filter((row) =>
    ROOMMATE_STATUSES.includes(row.occupancy_status)
  );

  return roommatesOnly;
}
