// File: app/composables/parsers/useParseResidentsStatus.ts
// Description: A dedicated parser for the "Residents Status" Excel data, which uses a "fill-down" data pattern.

import * as XLSX from 'xlsx';
import { useToastHelpers } from '@/composables/useToastHelpers';
import type { ResidentsStatusRaw } from '@/types/residents';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';
import { isValid, format, parseISO } from 'date-fns';
import {
  parseCurrency,
  formatDateForDB,
  normalizeNameFormat,
} from '@/utils/formatters';

const headerMappings = {
  property: {
    db_field: 'apt_code',
    transform: (value: any) => getApartmentCode(value),
  },
  unit: {
    db_field: 'unit_code',
    transform: (value: any) => String(value || '').trim(),
  },
  code: { db_field: 'resident_code' },
  tenant: { db_field: 'resident_name', transform: normalizeNameFormat },
  rent: { db_field: 'lease_rent', transform: parseCurrency },
  deposit: { db_field: 'deposit', transform: parseCurrency },
  status: { db_field: 'occupancy_status' },
  from: { db_field: 'lease_from_date', transform: formatDateForDB },
  to: { db_field: 'lease_to_date', transform: formatDateForDB },
  in: { db_field: 'move_in_date', transform: formatDateForDB },
  out: { db_field: 'move_out_date', transform: formatDateForDB },
  tel_m: { db_field: 'temp_mobile_phone' },
  tel_h: { db_field: 'temp_home_phone' },
  tel_o: { db_field: 'temp_office_phone' },
  email: { db_field: 'email' },
  unit_address: { db_field: 'unit_address' },
  unit_city_state_zip: { db_field: 'unit_city_state_zip' },
  tenant_address: { db_field: 'tenant_address' },
  tenant_city_state_zip: { db_field: 'tenant_city_state_zip' },
};

const EXPECTED_FILENAME_PREFIX = '5p_residents_status';
const HEADER_ROW_NUMBER = 6;

export function useParseResidentsStatus(
  file: File,
  unitsLookup: UnitLookupItem[]
): Promise<ResidentsStatusRaw[] | null> {
  const { toastError } = useToastHelpers();

  if (!file.name.toLowerCase().startsWith(EXPECTED_FILENAME_PREFIX)) {
    toastError({
      title: 'Invalid File Type',
      description: `This uploader only accepts files starting with "${EXPECTED_FILENAME_PREFIX}".`,
    });
    return Promise.resolve(null);
  }

  const unitMap = new Map(
    unitsLookup.map((u) => [`${u.apt_code}_${u.name}`.toLowerCase(), u.unit_id])
  );

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileBuffer = e.target?.result;
        if (!fileBuffer) throw new Error('Could not read file buffer.');

        const workbook = XLSX.read(fileBuffer, {
          type: 'buffer',
          cellDates: true,
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          range: HEADER_ROW_NUMBER - 1,
        });

        if (rawData.length < 2)
          throw new Error('File appears to be empty or has no data rows.');

        const headers: string[] = rawData[0].map((h: any) =>
          String(h || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
        );
        const dataRows = rawData.slice(1);

        let lastAptCode: string | null = null;

        const parsedData = dataRows
          .map((rowArray: any[]) => {
            const cleanRow: { [key: string]: any } = {};

            headers.forEach((header, index) => {
              const mapping =
                headerMappings[header as keyof typeof headerMappings];
              if (mapping) {
                const rawValue = rowArray[index];
                // Note: The original transform signature here was simpler. We keep it that way
                // and add the virtual field logic explicitly below for clarity.
                cleanRow[mapping.db_field] = mapping.transform
                  ? mapping.transform(rawValue)
                  : rawValue;
              }
            });

            // --- ADDED: Virtual 'phone' field logic ---
            // This creates the final 'phone' field by checking the temporary phone fields in order.
            cleanRow.phone =
              cleanRow.temp_mobile_phone ||
              cleanRow.temp_home_phone ||
              cleanRow.temp_office_phone ||
              null;

            // This is the "fill-down" logic for the property code
            if (cleanRow.apt_code) {
              lastAptCode = cleanRow.apt_code;
            } else {
              cleanRow.apt_code = lastAptCode;
            }

            if (!cleanRow.apt_code || !cleanRow.unit_code) return null;

            const lookupKey =
              `${cleanRow.apt_code}_${cleanRow.unit_code}`.toLowerCase();
            cleanRow.unit_id = unitMap.get(lookupKey) || null;
            cleanRow.unique_id = `${cleanRow.apt_code}_${cleanRow.resident_code}_${cleanRow.resident_name}`;

            return cleanRow;
          })
          .filter(Boolean);

        resolve(parsedData as ResidentsStatusRaw[]);
      } catch (error: any) {
        console.error('Error parsing Residents Status Excel file:', error);
        toastError({
          title: 'Parsing Error',
          description:
            error.message || 'Could not read the Residents Status file.',
        });
        resolve(null);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
