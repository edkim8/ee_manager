# Field Report — 2026-02-21

## Session: Lease Expiration Forecast Recovery & Debug Cleanup

---

## Part 1 — Lease Expiration Forecast (Production Bug Fix)

### Problem
The 24-month Lease Expiration Forecast chart was visible in development but completely absent in production. Three separate bugs were compounding the issue.

### Root Causes & Fixes

**Bug 1 — Chart.js `"line" is not a registered controller`**
- `LeaseExpirationDashboard.vue` registered `LineElement` and `PointElement` but not `LineController`.
- Chart.js v3+ separates controllers from elements. The mixed bar+line chart silently failed in production builds.
- Fix: Added `LineController` to the `ChartJS.register()` call.

**Bug 2 — Supabase 400 error on lease query + term breakdown**
- `useExpirationDashboard.ts` used a multi-line template literal for `.select()`.
- `renewals/index.vue` (term breakdown fetch) had the same pattern.
- Per KNOWLEDGE_BASE.md: multi-line template literals in Supabase `.select()` cause 400 Bad Request errors.
- Fix: Inlined both `.select()` strings to single-line format.

**Bug 3 — Hydration mismatch (SSR vs Client)**
- `<LeaseExpirationDashboard>` was not wrapped in `<ClientOnly>`.
- Chart.js requires `canvas` / `window` APIs unavailable during SSR.
- In dev (Vite SPA mode), this works fine. In production SSR, it fails silently.
- Fix: Wrapped component in `<ClientOnly>` — consistent with all other chart/complex components in the project.

### Files Modified
- `layers/ops/components/renewals/LeaseExpirationDashboard.vue` — Added `LineController`, fixed mixed-chart TypeScript type cast
- `layers/ops/composables/useExpirationDashboard.ts` — Inlined `.select()` string
- `layers/ops/pages/office/renewals/index.vue` — Inlined term breakdown `.select()`, added `<ClientOnly>` wrapper

---

## Part 2 — Debug Asset Deletion

### Files Deleted
- `debug_persistence.mjs` (root)
- `scripts/debug_staging_data.ts`
- `scripts/check_units.ts`
- `scripts/verify-storage.js`

---

## Part 3 — Console.log Sweep

Removed ~138 stray `console.log` / `console.debug` / `console.group` / `console.groupEnd` statements from production code across the `layers/` directory. All `console.error` calls were preserved.

### Files Cleaned

| File | Removals |
|------|----------|
| `layers/base/composables/useInventoryItems.ts` | 12 |
| `layers/base/composables/useInventoryInstallations.ts` | 10 |
| `layers/base/composables/useInventoryCategories.ts` | 9 |
| `layers/base/composables/useImageCompression.ts` | 7 (incl. multi-line objects) |
| `layers/base/composables/useInventoryHistory.ts` | 10 |
| `layers/base/composables/useInventoryItemDefinitions.ts` | 10 |
| `layers/base/composables/useLocationSelector.ts` | 3 |
| `layers/base/composables/useAttachments.ts` | 8 (incl. console.group/groupEnd) |
| `layers/base/components/modals/ConstantsModal.vue` | 5 |
| `layers/base/components/AppNavigation.vue` | 6 |
| `layers/base/server/api/me.get.ts` | 8 |
| `layers/ops/pages/assets/properties/index.vue` | ~10 (entire debug onMounted block) |
| `layers/ops/utils/pricing-engine.ts` | 9 (incl. multi-line solver log) |
| `layers/ops/components/renewals/UpdateStatusModal.vue` | 1 |
| `layers/ops/composables/useLocationNotes.ts` | ~27 (incl. console.group/groupEnd/warn) |
| `layers/parsing/composables/useDelinquenciesSync.ts` | 1 |
| `layers/admin/composables/useSolverTracking.ts` | 2 |

**Note:** `layers/admin/composables/useSolverEngine.ts` was intentionally skipped — its logs are operational traces for the admin sync engine, not stray debug output.

---

## Status

| Task | Status |
|------|--------|
| Lease Expiration Forecast — Production Fix | ✅ Complete |
| Debug Asset Deletion | ✅ Complete |
| Console.log Sweep (layers/) | ✅ Complete |
| 24-month chart visible + populated | ✅ Should now render in production |
