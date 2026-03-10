# LATEST_UPDATE — Field Report
**Date:** 2026-03-10
**Session:** H-080
**Agent:** Tier 2 Builder (Goldfish)
**Branch:** feat/solver-delinquency-sanity-check → merged to main (PR #39)

---

## Overview

Four work tracks completed in this session: Solver hardening (delinquency sanity check + zero-alerts handling), audit system expansion (7-day lookback + persistent ANOMALY_LOG + DB retention), and three UI fixes across the leasing module.

---

## Track 1 — Solver: Delinquency Summary Format Detection

### Problem
When Yardi exports `5p_Delinquencies` in **Summary** view (property-level aggregates) instead of **Individual** view (per-resident rows), the Solver previously processed it silently — all `tenancy_id` and `resident` fields were null, causing the sync to deactivate every active delinquency record as if nobody owed money. A data-destroying silent failure with no warning.

### Fix
- **`layers/admin/utils/solverUtils.ts`** — Added `isDelinquencySummaryFormat(rows)`. Pure function: returns `true` if every row lacks a non-empty `tenancy_id` AND `resident`. Handles null, empty string, and missing keys correctly.
- **`layers/admin/utils/solverTrackingState.ts`** — Added `discrepancies: string[]` to `PropertySummary` and `trackDiscrepancy(propertyCode, { message, report_type })` tracker. Appends to per-property discrepancy list and pushes `event_type: 'discrepancy'` event.
- **`layers/admin/composables/useSolverTracking.ts`** — Exposes `trackDiscrepancy`.
- **`layers/admin/composables/useSolverEngine.ts`** — Phase 3C now calls `isDelinquencySummaryFormat()` before sync. If Summary format detected: logs `DATA COMPROMISED` warning, calls `trackDiscrepancy()`, and `continue`s — skipping this property's sync without crashing any other phase.

---

## Track 2 — Solver: Zero-Alerts Handling

### Problem
When Yardi has zero alerts for all properties, there is no clickable `<a>` tag in the dashboard stat row. `phase_a_dashboard.py` called `loc.wait_for(state="visible", timeout=10_000)` on that link, which threw `TimeoutError` — crashing Phase A and skipping Make_Ready (step 7) and WorkOrders (step 8) entirely.

On the Solver side: if no `5p_Alerts` file exists in the batch, stale alert records from prior days were left active in the DB indefinitely.

### Fix — Script (`scripts/yardi-automation/`)
- **`yardi_download.py`** + **`phases/phase_a_dashboard.py`** — `_click_stat_link()` now wraps `wait_for` + `click` in try/except, returning `bool`. If `False` and report is Alerts: logs `INFO: Alerts stat link not clickable (count = 0)` and returns gracefully. Phase A continues to Make_Ready and WorkOrders. All other stat links still log `WARNING` and return on failure.

### Fix — Solver (`layers/admin/composables/useSolverEngine.ts`)
- Phase 3A now uses **"absence within confirmed batch = zero alerts"** strategy. Compares `batchPropertyCodes` (from `residents_status` reports — always present) against `propertiesWithAlertsFile` (from `alerts` reports in staging). Any property in the batch but absent from alerts gets `clearAlerts()` called.
- **`layers/parsing/composables/useAlertsSync.ts`** — Added `clearAlerts(propertyCode)`: fetches all active alert IDs for the property, bulk-deactivates them, and updates `syncStats`.

---

## Track 3 — Audit System Expansion

### 7-Day Lookback (`docs/governance/DAILY_UPLOAD_REVIEW_PROMPT.md`)
- Historical baseline expanded from 3 → 7 audit files
- ANOMALY_LOG.md added to required context reads at session start
- Anomaly detection now cross-checks against Acknowledged Normals (suppress false positives) and Active Watch Items (trigger recurrence)
- Added discrepancy event detection step (`event_type: 'discrepancy'`)
- Added 7-Day Trend Check section: property silent-drop patterns, unit recurrence loops, non-CV price trends, delinquency escalation
- Phase 1 evaluation report now includes "7-Day Pattern Summary" and "Anomaly Log Delta" sections
- Phase 2 closing now maintains ANOMALY_LOG (add/update/escalate/prune RESOLVED > 45 days)

### ANOMALY_LOG.md (new — `docs/status/ANOMALY_LOG.md`)
Persistent institutional memory across sessions. Four sections:
- **Active Watch Items** — pre-populated: RS silent-drop loop watch (2026-02-23, monitored through 2026-03-10)
- **Acknowledged Normals** — pre-populated: CV AIRM $1–$2 micro-decrements; OB `parra, melissa` lowercase name
- **Recurring Patterns** — empty placeholder
- **Resolved** — pre-populated: snapshot 403 fix (2026-02-27); trailing-space false silent-drop bug (2026-03-06)

### DB Retention Migration (`supabase/migrations/20260310000001_solver_retention_policy.sql`)
**Deployed to production via `npx supabase db push`.**
- `CREATE EXTENSION IF NOT EXISTS pg_cron`
- `run_solver_retention()` SECURITY DEFINER function:
  - Deletes `solver_events` where `event_date < NOW() - INTERVAL '90 days'`
  - Deletes `solver_runs` where `completed_at < NOW() - INTERVAL '365 days'` AND status in ('completed', 'failed')
  - Returns `(events_deleted BIGINT, runs_deleted BIGINT)`
- **Job 1:** Daily at 03:00 UTC — events pruning
- **Job 2:** 1st of each month at 04:00 UTC — runs pruning
- `idx_solver_runs_completed_at` index added for fast delete path

---

## Track 4 — UI Fixes

### `office/renewals/[id]` — Floor Plan Column + SF in Filter
- Added `#cell-floor_plan` slot to both Standard and MTM tables. Was missing — `GenericDataTable` fell back to `row['floor_plan']` (undefined) instead of `row.units?.floor_plans?.marketing_name`.
- Added SF to Floor Plan filter buttons: `0 / 0 · 850 SF` inline with standard/MTM counts. Source: `fp.area_sqft` already present in `floorPlanAnalytics`.

### `office/availabilities` (index) — Selection + Bulk Upfront
- Added `selection` column to `availabilities-complete.generated.ts` (first column, no role restriction) and prepended `'selection'` to all four filterGroups.
- `useTableSelection` composable wired to `filteredData` with `unit_id` key.
- `canBulkUpfront` computed: super admin OR (dept = Management AND role = Asset or Manager).
- Checkboxes: `#header-selection` (select-all) and `#cell-selection` (per-row) — visible to all users.
- Bulk action toolbar appears only when `canBulkUpfront && selectedCount > 0`: shows selected count, Upfront $ input, Free Days input, Apply / Clear buttons.
- `applyBulkUpfront()` patches `availabilities.concession_upfront_amount` and `concession_free_rent_days` for all selected `unit_id`s, then clears selection and refreshes.
- Added `#cell-concession_upfront_amount` (currency) and `#cell-concession_free_rent_days` (`Nd` format) cell slots.

### `office/pricing/floor-plans` — Vacancy Color Coding + Status Badges
- Added `getVacancyColor(days)` with standard 5-tier thresholds: ≤0 red (#B91C1C), ≤25 pink (#F472B6), ≤50 yellow (#FBBF24), ≤75 green (#34D399), 75+ blue (#60A5FA).
- Added `statusColors` map (Available → primary, Applied → warning, Leased → success).
- Both Available Units and Applicant/Future tables: unit badge now uses dynamic vacancy color instead of static `bg-gray-900`.
- Available Units table: added missing `#cell-status` slot with `CellsBadgeCell`.

---

## Tests

| File | Status | Tests |
|---|---|---|
| `tests/unit/solver/delinquencySummaryDetection.test.ts` | New | 17 |
| `tests/unit/solver/solverTrackingState.test.ts` | Updated | +1 assertion |
| `tests/unit/server/api/solver/save-snapshot.post.test.ts` | New | 15 |
| `tests/unit/server/api/solver/update-tenancy-status.post.test.ts` | New | 15 |

**Total: 736 tests passing across 30 files. Zero regressions.**

---

## Deployment

- PR #39 merged to `main`
- Migration `20260310000001` pushed to hosted Supabase ✅
- pg_cron jobs active — first events pruning run tonight at 03:00 UTC
