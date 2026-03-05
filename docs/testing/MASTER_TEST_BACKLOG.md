# Master Unit Testing Backlog

This document serves as the centralized testing operations backlog for Tier 1 (Gemini) and Tier 2 (Claude) agents. 
Agents should check here for outstanding testing debt and check items off `[x]` when `.test.ts` files are written and passing.

---

## 🏗 CATEGORY B: High Friction (TIER 2 - Claude)
*Requires mocking framework dependencies (Nuxt #imports, Supabase, Browser APIs).*

### 1. Environmental Unblocking (URGENT)
- [ ] **B-001:** Resolve Vitest `#imports` / `useSupabaseClient` mocking failure. (Fix the "Cannot read properties of undefined (reading client)" error).

### 2. Mobile Inventory & Scanner (H-071)
- [ ] **B-011:** `layers/base/components/BarcodeScanner.client.vue` (ZXing lifecycle)
- [ ] **B-012:** `layers/base/pages/mobile/scan.vue` (4-state scan flow)
- [ ] **B-013:** `layers/base/pages/mobile/installations.vue` (3-step mobile wizard)
- [ ] **B-014:** `layers/ops/pages/office/inventory/installations.vue` (Responsive sidebar filters)
- [ ] **B-015:** `layers/base/composables/useInventoryInstallations.ts` (`findByAssetTag` DB lookup)
- [ ] **B-016:** `layers/base/layouts/mobile-app.vue` (Bottom sheet animations)
- [ ] **B-017:** `layers/ops/components/map/LocationMap.vue` (Close button injection)

### 3. Renewal System Server/Composable (H-072)
- [x] **B-021:** `useRenewalsMailMerger.ts` — `buildLetterRows` call with real worksheet fixture
- [x] **B-022:** `useRenewalsMailMerger.ts` — `generatePdfLetters` error handling (503 Chrome)
- [x] **B-023:** `GET /api/renewal-templates` — Auth guard (401 response)
- [x] **B-024:** `PATCH /api/renewal-templates/:code` — Field whitelist & validation
- [x] **B-025:** `POST /api/renewals/generate-letters` — Limit checks (200 rows) & 503 errors

---

## 🧠 CATEGORY A: Pure Logic (TIER 1 - Goldfish)
*Math, Date handling, and Data Transformation. Should have zero framework dependencies.*

### 1. Solver Utilities (Daily Audit Gaps)
- [ ] **A-001:** `isRenewal()` gap/threshold math
- [ ] **A-002:** `isMakeReadyOverdue()` yesterday-cutoff logic
- [ ] **A-003:** `isSuspiciousYear()` Yardi typo detection
- [ ] **A-004:** `chunkArray()` loop preservation logic
- [ ] **A-005:** `parseCurrency()` edge cases
- [ ] **A-006:** `mapTenancyStatus()` substring matching

### 2. Formatting & Filenames
- [ ] **A-011:** `useRenewalsMailMerger.ts` — Excel filename format logic: `"{PropertyName} - {WorksheetName} - Mail Merge Data.xlsx"`
- [ ] **A-012:** `solveRentCombination.ts` — Verify rounding behavior in edge cases.

