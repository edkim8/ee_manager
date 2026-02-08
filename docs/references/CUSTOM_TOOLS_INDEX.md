# Custom Tools Registry: "The Toolbox"

> **Purpose**: This document tracks all custom-built tools, components, and engines that are candidates for extraction into a future shared library.
> **Status**: Living Document. Append new tools as they are built.

## 1. The Core UI Kit (Replacement for Nuxt UI)
*Simple, dependency-free Vue components.*

| Component | Location | Description | Status |
|-----------|----------|-------------|--------|
| **SimpleModal** | `layers/base/components/SimpleModal.vue` | A reliable, prop-safe modal with v-model support. Replaces `UModal`. | ✅ Stable |
| **SimpleTabs** | `layers/base/components/SimpleTabs.vue` | Slot-based tabs without lifecycle bugs. Replaces `UTabs`. | ✅ Stable |
| **SimpleOverlay** | *(Planned)* | For slide-overs and notifications. | ⏳ Pending |

## 2. The Table Engine (Data Grid)
*A high-performance, customizable data table system.*

| Component | Location | Description | Status |
|-----------|----------|-------------|--------|
| **GenericDataTable** | `layers/table/components/GenericDataTable.vue` | The core engine. Supports sorting, filtering, pagination, and dynamic slots. | ✅ Stable |
| **TableCells** | `layers/table/components/cells/` | Library of specialized cell renderers (Badge, Money, Date, etc.). | ✅ Stable |
| **ExportUtils** | `layers/table/utils/export.ts` | CSV/JSON export logic decoupled from the UI. | ✅ Stable |

## 3. The Parsing Engine (Data Ingestion)
*A strategy-based system for importing dirty data.*

| Module | Location | Description | Status |
|--------|----------|-------------|--------|
| **useGenericParser** | `layers/parsing/composables/useGenericParser.ts` | The orchestrator. Handles file reading, validation, and strategy selection. | ✅ Stable |
| **Parser Strategies** | `layers/parsing/strategies/` | Pluggable logic for different file formats (Yardi, Excel, CSV). | ✅ Stable |
| **Parser Playground** | `layers/parsing/pages/playground/` | A UI for testing and generating parser configurations. | ✅ Stable |

## 4. The Solver Engine (Business Logic)
*Algorithms for reconciling complex real-estate data.*

| Module | Location | Description | Status |
|--------|----------|-------------|--------|
| **Recursive Price Solver** | `layers/ops/utils/pricing-engine.ts` | Solves for a target rent by finding the optimal combination of amenities. | ✅ Beta |
| **Smart Sync** | `layers/parsing/composables/useSolverEngine.ts` | Handles "Diff & Patch" logic for syncing external data sources without overwriting local overrides. | ✅ Stable |

## 5. Future Extraction Plan
*How to move these to a new app.*

1.  **Isolate**: Ensure the tool has no dependencies on the main app's global state (e.g., Pinia stores that aren't passed in).
2.  **Document**: Each tool must have a `README.md` or `AI_USAGE.md` in its directory.
3.  **Package**:
    - Move `layers/table` -> `my-new-app/layers/table` (Copy-Paste mostly works).
    - Move `layers/base/components/Simple*` -> `my-new-app/components/ui`.
