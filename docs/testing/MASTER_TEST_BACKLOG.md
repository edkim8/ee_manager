# Master Unit Testing Backlog

This document serves as the centralized testing operations backlog for Tier 1 (Gemini) and Tier 2 (Claude) agents. 
Agents should check here for outstanding testing debt and check items off `[x]` when `.test.ts` files are written and passing.

---

## 🏗 CATEGORY B: High Friction (TIER 2 - Claude)
*DEFERRED: Requires Claude Tokens / Environment Mocking.*

### 1. Table Engine & Owners API
- [ ] **B-002:** `GenericDataTable.vue` component testing.
- [ ] **B-030:** `GET /api/owners/entities` API testing.

---

## 🧠 CATEGORY A: Pure Logic (TIER 1 - Goldfish)
*Math, Date handling, and Data Transformation. NO framework dependencies.*

### 1. Solver Tracking & Availability
- [x] **A-020:** `layers/admin/utils/availabilityUtils.ts` — Test `buildTenancyPriorityMap` (Priority order) and `classifyStaleAvailabilities` (State machine).
- [x] **A-021:** `layers/admin/utils/solverTrackingState.ts` — Test `createSolverTrackingState` (Factory pattern) and all tracker increment functions.

### 2. Barcode & Asset Logic (EXTRACTION REQUIRED)
- [x] **A-030:** **Extract & Test**: Locate barcode/asset validation regex in `scan.vue` or `BarcodeScanner.client.vue`. Move to new `layers/base/utils/validation.ts` and write comprehensive tests.
- [x] **A-031:** **Extract & Test**: Locate Asset Tag generation/formatting logic. Move to `layers/base/utils/inventory.ts` and write tests.

### 3. Legacy Solver Utilities (COMPLETED)
- [x] **A-001:** `isRenewal()` logic
- [x] **A-002:** `isMakeReadyOverdue()` logic
- [x] **A-011:** Excel filename format logic

