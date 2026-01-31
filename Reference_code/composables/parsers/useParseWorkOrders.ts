// File: app/composables/parsers/useParseWorkOrders.ts
// Description: A thin wrapper that provides the specific configuration for
// parsing a Work Orders file to the generic parser engine.

import { useGenericParser, type ParserConfig } from './useGenericParser';
import type { WorkOrderRaw } from '@/types/work_orders';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';
import { isValid } from 'date-fns';
import { parseYardiDate } from '@/utils/date-helpers';

// 1. Define the specific configuration for this file type.
const workOrdersConfig: ParserConfig = {
  expectedFilenamePrefix: '5p_workorders',
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
    brief_description: { db_field: 'description' },
    wo: { db_field: 'yardi_work_order_id' }, // WO# becomes wo
    call_date: {
      db_field: 'call_date',
      transform: (value: any) => parseYardiDate(value),
    },
    // phone_: { db_field: 'phone' }, // Phone # becomes phone_ and optional
    category: { db_field: 'work_order_category' },
    status: { db_field: 'work_order_status' },
    resident: { db_field: 'resident_name' },
  },
  getUniqueId: (row: any) => `${row.apt_code}_${row.yardi_work_order_id}`,
};

/**
 * A composable to handle the parsing of a Yardi Work Orders Excel file.
 *
 * @param file - The File object from the input.
 * @param unitsLookup - The pre-fetched array of all units for fast lookups.
 * @returns A Promise that resolves with an array of structured Work Order objects, or null.
 */
export function useParseWorkOrders(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<WorkOrderRaw[] | null> {
  // 2. Call the generic parser with the specific configuration.
  // Note: The generic parser will still attempt a unit_id lookup if a unit_code is present,
  // but it will gracefully handle failures and it is not used in our getUniqueId function.
  return useGenericParser(file, workOrdersConfig, unitsLookup);
}
