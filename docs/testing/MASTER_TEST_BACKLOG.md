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
