// Built-in transform types
export type BuiltInTransform = 'currency' | 'date' | 'phone' | 'trim' | 'yardi_code' | 'skip';

export interface FieldMapping {
  targetField: string;
  transform?: BuiltInTransform | ((val: any, row?: any) => any);
  required?: boolean;
  fillDown?: boolean; // Per-field fill-down option
  mergeGroup?: string; // Group name for priority merge (e.g., "phone" for tel_o, tel_h, tel_m)
  mergePriority?: number; // Lower = higher priority within merge group
}

export interface ParserConfig {
  id: string;
  namePattern: string; // Regex string to match filename
  headerRow?: number; // 1-based index (default: auto-detect)

  // Strategy to assist "Smart Parsing"
  // standard: Simple Header -> Row mapping
  // yardi_report: Scans for (PropCode) subheadings in Column A
  // fill_down: Fills empty cells with value from previous row (for specified cols)
  strategy: 'standard' | 'yardi_report' | 'fill_down';

  // For 'fill_down' strategy, which fields to copy? (legacy - prefer per-field fillDown)
  fillDownFields?: string[];

  mapping: Record<string, FieldMapping>;

  // Virtual fields computed from the row
  computedFields?: Record<string, (row: any) => any>;

  // Function to generate unique ID for the row
  getUniqueId?: (row: any) => string;
}

export interface ParsedResult<T = any> {
  data: T[];
  errors: string[];
  meta: {
    filename: string;
    totalRows: number;
    parsedRows: number;
    groupBy?: Record<string, Record<string, number>>; // { "apt_code": { "ABC": 10, "DEF": 5 } }
  };
}

// Config export format with sample data
export interface ParserConfigExport {
  _description: string;
  config: Omit<ParserConfig, 'getUniqueId' | 'computedFields'>;
  sample_data: Record<string, any> | null;
}
