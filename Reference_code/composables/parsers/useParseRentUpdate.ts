// 1. Import our new, specialized parser
import {
  useSinglePropertyParser,
  type ParserConfig,
} from './useSinglePropertyParser';
import type { RentUpdateRaw } from '@/types/rent-update';
import type { UnitLookupItem } from '@/types/apartments';
import { parseCurrency } from '@/utils/formatters';

export function useParseRentUpdate(
  file: File,
  aptCode: string,
  unitsLookup: UnitLookupItem[]
): Promise<RentUpdateRaw[] | null> {
  const rentUpdateConfig: ParserConfig = {
    headerRowNumber: 1,
    // This mapping now correctly reflects the columns you shared in the debug log
    headerMappings: {
      unit: { db_field: 'unit_code' },
      market_rent: { db_field: 'yardi_rent', transform: parseCurrency },
    },
    getUniqueId: (row: any) => `${row.apt_code}_${row.unit_id}`,
    requiredFields: ['unit_code', 'yardi_rent'],
  };

  // 2. Call the new parser, passing the aptCode directly to it
  return useSinglePropertyParser(file, rentUpdateConfig, aptCode, unitsLookup);
}
