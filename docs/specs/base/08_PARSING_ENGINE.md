# Specification: Parsing Engine (F-011)

> **Status**: ✅ IMPLEMENTED
> **Playground**: `/playground/parser`
> **AI Reference**: See `layers/parsing/docs/PARSER_PLAYGROUND.md`

## 1. Overview
The **Parsing Engine** is a specialized layer (`layers/parsing`) responsible for ingesting "messy" external files (CSV, Excel) and converting them into structured, type-safe JSON data for Supabase ingestion. It solves the problem of inconsistent headers and data formatting by using specific **Parser Configurations** created by a **General Parser Generator**.

### Key Features (Implemented)
- **Parser Playground**: Interactive UI for configuring and testing parsers
- **Export as Parser**: Generate dedicated `useParser{ID}.ts` files from playground
- **Live Preview**: Real-time transform preview with sample data
- **Merge Groups**: Combine multiple columns (first non-null wins)
- **Fill-Down**: Inherit values from previous rows for grouped data

## 2. Terminology
*   **Raw Data**: The original CSV/Excel file with inconsistent headers (e.g., "Prop #", "Property-Code").
*   **Target Schema**: The consistent JSON structure required for the application (e.g., `property_code`, `unit_id`).
*   **Parser Config**: A definition object that maps Raw Headers to Target Fields and defines parsing rules (skip rows, fill-down).
*   **Specific Parser**: A functional parser instance (or class) dedicated to a specific file type (e.g., `parser_rent_roll.ts`), derived from the Base Parser.

## 3. Architecture

### 3.1 Layer Structure
```
layers/parsing/
├── components/          # UI for uploading/testing files
├── composables/         # main logic
│   ├── useGenericParser.ts  # The Refactored Core Engine
│   └── useParserFactory.ts  # Helper to build configs
├── utils/
│   ├── sheet-reader.ts      # Low-level XSLX wrapper (client-side)
│   └── header-normalizer.ts # "Prop. Code" -> "prop_code"
└── types/               # Type definitions
```

### 3.2 Core Logic: The "Generic Parser"
We will port and enhance `Reference_code/composables/parsers/useGenericParser.ts`.

#### Improved Parser Configuration
```typescript
interface ParserConfig {
  id: string;
  namePattern: string;    // Regex string for filename matching
  headerRow?: number;     // 1-based index (default: auto-detect)
  
  // Strategy to assist "Smart Parsing"
  strategy: 'standard' | 'yardi_report' | 'fill_down'; 

  mapping: {
    [rawHeader: string]: {
      targetField: string;
      transform?: 'currency' | 'date' | 'phone' | 'trim';
      required?: boolean;
    }
  };
  
  // Virtual fields computed from the row
  computedFields?: {
    [targetField: string]: (row: any) => any; 
  };
}
```

#### Parsing Strategies
1.  **`standard`**: Simple Header -> Row mapping.
2.  **`yardi_report`**: (Existing V1 Logic) Scans Column A for `(PropertyCode)` to inject `apt_code` into subsequent rows.
3.  **`fill_down`**: (From ResidentsStatus) If a defined column is empty, use the value from the previous row.

## 4. Workflows

### 4.1 "Generator" Workflow (Dev Time)
1.  Developer uploads sample file to `/playground/parser`.
2.  System detects headers and suggests a `ParserConfig`.
3.  Developer tweaks config (adjusts header map, selects strategy).
4.  Playground outputs the JSON Config or TypeScript Code.

### 4.2 Runtime Parsing
1.  Apps use `useGenericParser(file, config)`.
2.  Parser handles:
    *   File Validation (Prefix check).
    *   Dynamic Import of `xlsx`.
    *   Header Extraction & Matrix alignment.
    *   Data Transformation.
    *   Unit ID Lookup (optional, via callback).

## 5. Implementation Plan

### Phase 1: Core Porting & Refactoring ✅
*   [x] Scaffold `layers/parsing`.
*   [x] Port `useGenericParser.ts` to `layers/parsing/composables`.
*   [x] Add `fill_down` logic to the core parser (merging logic from `useParseResidentsStatus`).
*   [x] Define strict Types.

### Phase 2: The Generator (Playground) ✅
*   [x] Build `/playground/parser`.
*   [x] Implement "Config Builder" UI with live preview.
*   [x] Add "Export as Parser" to generate `useParser{ID}.ts` files.
*   [x] Document in `layers/parsing/docs/PARSER_PLAYGROUND.md`.

### Phase 3: Migration
*   [ ] Migrate `useParseResidentsStatus` to use the new Generic Engine configuration.
*   [ ] Create "Parser Registry" to hold all active parser configs.

## 6. Testing Strategy
*   **Unit Tests**: Test `BaseParser` with mock buffers.
*   **Fixture Tests**: Store sample "Chaos" Excel files and assert JSON output matches expected snapshots.

## 7. Future Considerations
*   **Solver**: The next module will handle merging multiple parsed outputs. This module focuses strictly on **1 File -> 1 JSON Array**.
