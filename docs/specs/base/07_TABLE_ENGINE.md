# Spec: The Table Engine (F-010)

## Goal
Establish a dedicated, reusable Table Library (`layers/table`) that provides a powerful, unopinionated Data Table component. It must support high-density data, sorting, filtering, selection, and pagination without the limitations of pre-packaged UI library tables.

## Vision: "The Standalone Engine"
This is not just a component; it's a **System**.
- **Layer**: `layers/table` (Auto-registered)
- **Primary Export**: `<GenericDataTable>` (or `<TableEngine>`)
- **Philosophy**: "HTML First". We build the `<table>` structure manually to allow granular control over `<thead>`, `<tr>`, and `<td>` behavior (e.g., sticky headers, complex colspans, custom cell renderers).

## V1 References (`Reference_code/table/`)
*To be analyzed from listing... likely includes:*
- `TableHeader.vue`
- `TableBody.vue`
- `Pagination.vue`
- `TableFilter.vue`

## Architecture

### 1. The Container (`GenericDataTable.vue`)
- **Props**:
  - `data`: Array<any>
  - `columns`: Array<ColumnDef>
  - `loading`: Boolean
  - `sortState`: Object (field, direction)
  - `pagination`: Object (page, limit, total)
- **Slots (Crucial for Custom Cells)**:
  - `#toolbar`: For search/filters.
  - `#header-{key}`: Custom header rendering (e.g., adding icons/tooltips).
  - `#cell-{key}`: Custom cell rendering. **Scope**: `{ row, col, value }`.
    - *Example usage*: `<template #cell-status="{ value }"><UBadge>{{ value }}</UBadge></template>`
  - `#footer`: Pagination area.

### 2. The Logic (Composables)
- `useTableSort(data)`
- `useTablePagination(data)`
- `useSelection(data)`

### 3. Documentation & Verification
- **AI Guide**: `layers/table/AI_USAGE_GUIDE.md`
  - A concise, technical manifesto explaining how to consume this table in future features.
  - Must document Props, Slots, and Event signatures in machine-readable format.
- **Playground**: `layers/table/pages/playground/table.vue`
  - A comprehensive "Kitchen Sink" layout.
  - Must demonstrate: Sorting, Pagination, Custom Status Cells, Row Selection.

## Data Types (`layers/table/types/index.ts`)
```typescript
export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  class?: string // Custom cell classes
  width?: string
  slotName?: string // Explicit slot name override
}
```

## Implementation Plan

### Phase 1: Scaffold
1.  **Scaffold Layer**: `layers/table` structure.
2.  **Define Types**: `layers/table/types/index.ts`.

### Phase 2: Core Engine
1.  **GenericDataTable.vue**: The tailored `<table>` implementation.
    - Support for `<colgroup>` for sizing.
    - Dynamic header rendering with sort indicators.
    - Dynamic body rendering with slot fallback.
    - **Comments**: Code must be heavily commented to explain the "Why" behind the slot logic.

### Phase 2b: Cell Library (`layers/table/components/cells/`)
Port the following V1 cells to Nuxt 4 (Functional Components preferred):
- `LinkCell` (RouterLink wrapper)
- `CurrencyCell` (Intl.NumberFormat)
- `DateCell` (Intl.DateTimeFormat)
- `BadgeCell` (UBadge wrapper)
- `OptionsCell` (Action dropdowns)
- `AlertCell`, `CheckboxCell`, `PercentCell`, `TruncatedTextCell`

### Phase 3: Integration & Docs
1.  **AI Guide**: Write `AI_USAGE_GUIDE.md`.
2.  **Playground**: Create `pages/playground/table.vue`.

## QA Protocol
- **Unit Test**: `tests/unit/table/GenericDataTable.test.ts` (Mount and check rendering).
- **Manual**: Verify `http://localhost:3001/playground/table`.
