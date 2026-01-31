// File: app/composables/parsers/useParseExpiringLeases.ts
// Description: A thin wrapper that provides the specific configuration for
// parsing an "Expiring Leases" file to the generic parser engine.

import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { ExpiringLeaseRaw } from '@/types/leases';
import type { UnitLookupItem } from '@/types/apartments';
import { parseCurrency, formatDateForDB } from '@/utils/formatters';

const expiringLeasesConfig: ParserConfig = {
  expectedFilenamePrefix: '5p_ExpiringLeases',
  headerRowNumber: 4,
  headerMappings: {
    unit: {
      db_field: 'unit_code',
      transform: (v: any) => String(v || '').trim(),
    },
    resident_name: { db_field: 'resident_name' },
    resident_code: { db_field: 'resident_code' },
    resident_status: { db_field: 'resident_status' },
    market_rent: { db_field: 'market_rent', transform: parseCurrency },
    actual_rent: { db_field: 'lease_rent', transform: parseCurrency },
    sec_dep_on_hand: { db_field: 'deposit', transform: parseCurrency },
    lease_from: { db_field: 'lease_from_date', transform: formatDateForDB },
    lease_to: { db_field: 'lease_to_date', transform: formatDateForDB },
    move_out: { db_field: 'move_out_date', transform: formatDateForDB },
  },

  getUniqueId: (row: any) =>
    `${row.apt_code}_${row.resident_code}_${row.lease_to_date}`,
  requiredFields: ['resident_code', 'lease_to_date'],
};

export function useParseExpiringLeases(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<ExpiringLeaseRaw[] | null> {
  return useGenericParser(file, expiringLeasesConfig, unitsLookup);
}
