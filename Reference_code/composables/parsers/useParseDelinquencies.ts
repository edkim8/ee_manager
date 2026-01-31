import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { DelinquencyRaw } from '@/types/delinquencies';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';
// Ensure the centralized helper is imported
import { parseCurrency } from '@/utils/formatters';

const delinquenciesConfig: ParserConfig = {
  expectedFilenamePrefix: '5p_Delinquency',
  headerRowNumber: 3,
  headerMappings: {
    property: {
      db_field: 'apt_code',
      transform: (value: any) => getApartmentCode(value),
    },
    unit: { db_field: 'unit_code' },
    resident: { db_field: 'resident_code' },
    name: { db_field: 'resident_name' },

    // --- Ensure all of these use the parseCurrency helper ---
    total: { db_field: 'total_unpaid', transform: parseCurrency },
    '0_30': { db_field: 'days_0_30', transform: parseCurrency },
    '31_60': { db_field: 'days_31_60', transform: parseCurrency },
    '61_90': { db_field: 'days_61_90', transform: parseCurrency },
    over_90: { db_field: 'days_91_plus', transform: parseCurrency },
    prepays: { db_field: 'prepays', transform: parseCurrency },
    balance: { db_field: 'balance', transform: parseCurrency },
  },
  getUniqueId: (row: any) => `${row.apt_code}_${row.resident_code}`,
  requiredFields: ['apt_code', 'resident_code'],
};

export function useParseDelinquencies(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<DelinquencyRaw[] | null> {
  return useGenericParser(file, delinquenciesConfig, unitsLookup);
}
