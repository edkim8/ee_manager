import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { LeasedUnitRaw } from '@/types/leased-units';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';

const leasedUnitsConfig: ParserConfig = {
  expectedFilenamePrefix: '5p_Leased_Units',
  headerRowNumber: 1, // Please verify this is the correct header row
  headerMappings: {
    property: { db_field: 'apt_code', transform: (value: any) => getApartmentCode(value) },
    unit: { db_field: 'unit_code', transform: (v: any) => String(v || '').trim() },
    unit_status: { db_field: 'unit_status' },
    resident: { db_field: 'resident_name' },
  },
  
  // The unique ID is based on the physical unit for robust comparison
  getUniqueId: (row: any) => `${row.apt_code}_${row.unit_id}`,
  requiredFields: ['unit_code', 'resident_name'],
};

/**
 * A composable to handle the parsing of a Yardi "Leased Units" Excel file.
 */
export function useParseLeasedUnits(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<LeasedUnitRaw[] | null> {
  return useGenericParser(file, leasedUnitsConfig, unitsLookup);
}