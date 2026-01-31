// File: app/composables/parsers/useGenericParser.ts
// Description: The definitive, generic, reusable engine for parsing all Yardi Excel files.
// This version uses a robust two-pass system to handle complex reports with property subheadings.

import * as XLSX from 'xlsx';
import { useToastHelpers } from '@/composables/useToastHelpers';
import type { UnitLookupItem } from '@/types/apartments';
import { getApartmentCode } from '@/utils/apartment-helpers';

export interface ParserConfig {
  expectedFilenamePrefix: string;
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

export function useGenericParser(
  file: File,
  config: ParserConfig,
  unitsLookup: UnitLookupItem[]
): Promise<any[] | null> {
  const { toastError } = useToastHelpers();

  if (
    config.expectedFilenamePrefix &&
    !file.name
      .toLowerCase()
      .startsWith(config.expectedFilenamePrefix.toLowerCase())
  ) {
    toastError({
      title: 'Invalid File Type',
      description: `This uploader only accepts files starting with "${config.expectedFilenamePrefix}".`,
    });
    return Promise.resolve(null);
  }

  const unitMap = new Map(
    unitsLookup.map((u) => [`${u.apt_code}_${u.name}`.toLowerCase(), u.unit_id])
  );

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // --- THIS IS THE FIX ---
        // We now import the XLSX library dynamically, only when it's needed.
        // This solves the server-side rendering crash.
        const XLSX = await import('xlsx');
        // --- END FIX ---

        const fileBuffer = e.target?.result;
        if (!fileBuffer) throw new Error('Could not read file buffer.');

        const workbook = XLSX.read(fileBuffer, {
          type: 'buffer',
          cellDates: true,
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });

        if (allRows.length < config.headerRowNumber) {
          throw new Error('File appears to be empty or missing a header row.');
        }

        // --- THIS IS THE FIX: Part 1 - The "First Pass" ---
        // We build a map to know which apt_code applies to which row range.
        const propertyRowMap = new Map<number, string>();
        let lastAptCode: string | null = null;
        allRows.forEach((rowArray, rowIndex) => {
          const firstCell = String(rowArray[0] || '');
          const match = firstCell.match(/\((.*?)\)/);
          if (match && match[1]) {
            lastAptCode = getApartmentCode(match[1]);
          }
          if (lastAptCode) {
            propertyRowMap.set(rowIndex, lastAptCode);
          }
        });

        const headers: string[] = (
          allRows[config.headerRowNumber - 1] || []
        ).map((h: any) =>
          String(h || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
        );

        const requiredHeaders = Object.keys(config.headerMappings);
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h) && !config.headerMappings[h].transform
        );
        if (missingHeaders.length > 0) {
          throw new Error(
            `The file is missing required columns: ${missingHeaders.join(', ')}`
          );
        }

        const dataRows = allRows.slice(config.headerRowNumber);

        // --- THIS IS THE FIX: Part 2 - The "Second Pass" ---
        const parsedData = dataRows
          .map((rowArray: any[], rowIndex) => {
            // The actual row index in the original sheet is headerRowNumber + current index.
            const originalRowIndex = config.headerRowNumber + rowIndex;
            const aptCode = propertyRowMap.get(originalRowIndex);

            // Start building the clean row, injecting the apt_code first.
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

            if (!cleanRow.apt_code) return null; // Skip rows that don't fall under a property

            // Backfill "virtual" fields that depend on the whole row
            Object.entries(config.headerMappings).forEach(([key, mapping]) => {
              if (!headers.includes(key) && mapping.transform) {
                const value = mapping.transform(null, cleanRow);
                if (value !== undefined && value !== null) {
                  cleanRow[mapping.db_field] = value;
                }
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
                  return null; // Mark row for removal
                }
              }
            }
            return cleanRow;
          })
          .filter(Boolean); // Filter out any null rows

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
