import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = process.argv[2];
if (!excelPath) {
  console.error('Usage: npx tsx dump-excel.ts <path-to-xlsx>');
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const result: Record<string, any> = {};

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  result[sheetName] = XLSX.utils.sheet_to_json(sheet);
});

console.log(JSON.stringify(result, null, 2));
