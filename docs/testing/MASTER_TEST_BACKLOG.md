# Master Unit Testing Backlog

This document serves as the centralized testing operations backlog for Tier 1 (Gemini) and Tier 2 (Claude) agents.
Agents should check here for outstanding testing debt and check items off `[x]` when `.test.ts` files are written and passing. Do not add redundant tests. Maintain clean documentation.

## 1. Solver Architecture (Daily Audit Findings)
*Full Silver Prompt ready to dispatch: See `docs/testing/SOLVER_TEST_BACKLOG.md`*

- [ ] **T1-A:** Lease Insert vs Update Classification (`useSolverEngine.ts` Phase 1)
- [ ] **T1-B:** Phase 1+2 double-write scenario prevention (`useSolverEngine.ts` Phase 2)
- [ ] **T2-A:** Notices filter preventing `Future` tenant data corruption
- [ ] **T2-B:** MakeReady overdue cutoff logic accuracy
- [ ] **T3-A:** Year-typo detection (e.g., catching `2102` instead of `2026`)
- [ ] **T3-B:** Map dedup last-write-wins (Yardi co-signer edge case)
- [ ] **T3-C:** Chunk array loop preservation logic
- [ ] **T4-A:** Silent drop idempotency check
- [ ] **T4-B:** `parseCurrency` edge cases (`"$0"`, negative values, null)

## 2. Mobile Inventory & Scanner (H-071)
*Awaiting Tier 1 (Gemini Goldfish) Dispatch*

- [ ] `layers/base/components/BarcodeScanner.client.vue` (ZXing camera stream lifecycle)
- [ ] `layers/base/pages/mobile/scan.vue` (4-state scan flow - scanning > looking > found/error)
- [ ] `layers/base/pages/mobile/installations.vue` (3-step mobile wizard state and resets)
- [ ] `layers/ops/pages/office/inventory/installations.vue` (Responsive sidebar filters)
- [ ] `layers/base/composables/useInventoryInstallations.ts` (`findByAssetTag` DB lookup)
- [ ] `layers/base/layouts/mobile-app.vue` (Profile bottom sheet slide animations)
- [ ] `layers/ops/components/map/LocationMap.vue` (Close button injection inside InfoWindow)
- [ ] `layers/base/components/ContextHelper.client.vue` (Class positioning toggles)

## 3. Renewal Mail Merge & Letter Template System (H-072)
*Core utility already tested (70 tests passing). Server routes and composable not yet covered.*

**Already passing ✅**
- [x] `layers/ops/utils/renewalLetterHtml.ts` — 70 tests in `tests/unit/ops/renewalLetterHtml.test.ts`
  - `formatLetterDate`, `formatCurrency`, `applyTermOffset`
  - `buildLetterRow` (flat + nested Supabase join shape)
  - `buildLetterRows` (filter logic)
  - `generateSingleLetterHtml` (all letter sections, HTML escaping, early discount, letterhead)
  - `generateRenewalLettersHtml` (multi-page doc, @page CSS)
  - `LetterContext` — communityName, managerName, managerPhone rendering + fallbacks
  - `getPropertyLetterConfig` — all 5 properties, case-insensitive, fallback

**Outstanding debt**
- [ ] **H072-A:** `useRenewalsMailMerger.ts` — `buildLetterRows` call with real worksheet fixture; verify Excel column names match merge field schema exactly
- [ ] **H072-B:** `useRenewalsMailMerger.ts` — `exportMailMerger` filename format: `"{PropertyName} - {WorksheetName} - Mail Merge Data.xlsx"`
- [ ] **H072-C:** `useRenewalsMailMerger.ts` — `generatePdfLetters` error handling: server 503 (Chrome not found) surfaces correct toast
- [ ] **H072-D:** `GET /api/renewal-templates` — returns 401 for unauthenticated requests
- [ ] **H072-E:** `PATCH /api/renewal-templates/:code` — field whitelist: unknown fields are stripped, known fields are saved
- [ ] **H072-F:** `PATCH /api/renewal-templates/:code` — returns 400 when body contains no whitelisted fields
- [ ] **H072-G:** `POST /api/renewals/generate-letters` — returns 400 for empty rows array; 400 for > 200 rows; 503 when Chrome binary not found
