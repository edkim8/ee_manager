import * as XLSX from 'xlsx';
import { useToastHelpers } from '@/composables/useToastHelpers';
import type { UnitLookupItem } from '@/types/apartments';

// This ParserConfig is the same as your other one
export interface ParserConfig {
  headerRowNumber: number;
  headerMappings: {
    [key: string]: {
      db_field: string;
      transform?: (value: any, row?: any) => any;
    };
  };
  getUniqueId: (row: any) => string;
  requiredFields?: string[];
}

/**
 * A generic parser for Excel files that contain data for only a SINGLE property.
 * It does not look for property subheadings.
 */
export function useSinglePropertyParser(
  file: File,
  config: ParserConfig,
  aptCode: string, // It accepts the property code directly
  unitsLookup: UnitLookupItem[]
): Promise<any[] | null> {
  const { toastError } = useToastHelpers();
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
          range: config.headerRowNumber - 1,
        });

        if (rawData.length < 2) throw new Error('File has no data rows.');

        const headers: string[] = rawData[0].map((h: any) =>
          String(h || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
        );
        const dataRows = rawData.slice(1);

        const parsedData = dataRows
          .map((rowArray: any[]) => {
            // Start with a clean row that already includes the property code
            const cleanRow: { [key: string]: any } = { apt_code: aptCode };

            headers.forEach((header, index) => {
              const mapping = config.headerMappings[header];
              if (mapping) {
                const rawValue = rowArray[index];
                cleanRow[mapping.db_field] = mapping.transform
                  ? mapping.transform(rawValue, cleanRow)
                  : rawValue;
              }
            });

            // Unit ID Lookup
            if (cleanRow.unit_code && !cleanRow.unit_id) {
              const lookupKey =
                `${cleanRow.apt_code}_${cleanRow.unit_code}`.toLowerCase();
              cleanRow.unit_id = unitMap.get(lookupKey) || null;
            }

            // Generate Unique ID
            cleanRow.unique_id = config.getUniqueId(cleanRow);

            // Required Fields Check
            if (config.requiredFields) {
              for (const field of config.requiredFields) {
                if (
                  cleanRow[field] === null ||
                  cleanRow[field] === undefined ||
                  String(cleanRow[field]).trim() === ''
                ) {
                  return null;
                }
              }
            }
            return cleanRow;
          })
          .filter(Boolean);

        resolve(parsedData);
      } catch (error: any) {
        console.error(`Error parsing ${file.name}:`, error);
        toastError({
          title: 'Parsing Error',
          description: error.message || 'Could not read the file.',
        });
        resolve(null);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
