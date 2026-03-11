# Field Report — Delinquencies Dashboard V2 (Final)
**Date:** 2026-03-10
**Branch:** feat/delinquencies-dashboard
**Session:** H-082 — UI Overhaul, Dual Trend Charts, Resident History Columns, Bug Fixes

---

## Summary

Full rebuild of the `office/delinquencies` dashboard: 7-section layout reorder, combined
aging+cases card, 90-day dual trend chart with 2–20% zoom, resident history columns (vs Last Mo. /
As Of / Months / Peak), tombstone sync engine for accurate historical snapshots, two new DB
migrations, four targeted bug fixes, 29 new unit tests, and updated Context Helper.
Both migrations deployed to production. 765/765 tests passing.

---

## Layout Changes

**New section order:**
1. Summary Cards (reordered metrics)
2. Combined Aging Buckets + Active Cases
3. Daily Trend — 90-day, two-column (Full Range | Zoomed)
4. Delinquent Residents Table (with 12-month history columns)
5. Monthly Benchmarks + Historical Snapshots
6. View Snapshot by Date (moved to bottom)
7. Context Helper

---

## Summary Card Reorder

Old: Total Unpaid | Total Balance | Aging 61+ | Prepays

New: **Total Unpaid | Aging 31+ Days | Prepays | Total Balance**

"Aging 31+" covers `days_31_60 + days_61_90 + days_90_plus` — total at-risk balance with % of total alongside it.

---

## Combined Aging Buckets + Cases Card

Merged the two separate "Aging Buckets Breakdown" and "Active Delinquency Counts" cards
into one. Card header shows `N Active Cases` badge. Each bucket column shows:
- Color dot legend indicator
- Dollar amount (primary)
- Case count in bucket-colored text (secondary)

---

## Daily Trend — 90-day Dual Chart

**DB:** `view_delinquencies_daily_trend` extended from 30 → 90 day window (migration `20260310000002`).
Added `AND total_unpaid > 0` to exclude tombstone records from the trend.

**UI:** Two-column SVG chart layout:
- **Left (Full Range):** Complete 90-day picture, Y-axis auto-scaled to peak
- **Right (Zoomed):** Last 30 data points, Y-axis capped at `zoomPercent`% of the 90-day peak.
  Zoom selector buttons: **2% | 4% | 6% | 8% | 10% | 12% | 14% | 16% | 18% | 20%** (default: 10%)
  Amber dashed ceiling line. Points above ceiling shown as amber triangles (visually distinct, line not corrupted).

---

## Resident History Columns (12-month)

**New DB function:** `get_delinquency_resident_history(p_property_code, p_months_count=12)`
Returns per-tenancy: `months_on_list`, `peak_unpaid`, `prev_month_unpaid`.

**New composable exports:** `residentHistory`, `fetchResidentHistory`

**New table columns:**

| Column | Description |
|---|---|
| vs Last Mo. | Delta vs the most recent upload from the **previous calendar month** (not same date). ▲ = worsened, ▼ = improved, "New" = first appearance |
| As Of | Date the balance last changed. Unchanged balances don't create new records — "As Of 3/2" on 3/10 means no change since 3/2 |
| Months | Calendar months (out of last 12) on the delinquency list with positive balance. Grows as data accumulates |
| Peak (12mo) | Max `total_unpaid` in the last 12 months |

**Row click:** Clicking any resident row navigates to the snapshot detail page for that resident's last recorded date.
(Unit column changed from `CellsLinkCell` to plain text to allow `@click.stop` propagation.)

---

## Bug Fixes

### 1. Chart & Page Header Dates Off by One Day
**Problem:** `formatDate(dateStr)` called `new Date(dateStr)` on bare `YYYY-MM-DD` strings.
These parse as UTC midnight → in US timezones (UTC-5 to UTC-8) the date shifts to the previous day.
Example: 2026-03-10 displayed as March 9; 2026-03-01 displayed as February 28.

**Fix:** Both `index.vue` and `[date].vue` now use `new Date(\`${dateStr}T12:00:00\`)` (noon local time).

### 2. Historical Snapshots Inflated Values (~$473k vs actual ~$170k)
**Problem:** No tombstone records existed for resolved tenancies. The monthly 26th-snapshot RPC
finds the latest record per tenancy on or before the target date — so resolved tenancies'
last positive-balance records were included indefinitely, inflating historical totals.

**Fix (two-part):**
- **Sync engine** (`useDelinquenciesSync.ts` Step 5): when a tenancy is missing from the current
  report but was previously active, insert a $0 tombstone record (all monetary columns = 0, `is_active = true`).
- **DB RPCs** (`20260310000003`): added `AND total_unpaid > 0` filter to both
  `get_delinquencies_monthly_26th_snapshots` and `view_delinquencies_current_summary`.

Note: Historical data uploaded before this fix (pre-2026-03-10) remains inflated. Only new syncs going forward will be accurate.

### 3. Historical Snapshot Date Showing Feb 24 Instead of Feb 26
**Problem:** SQL arithmetic in `get_delinquencies_monthly_26th_snapshots` used
`date_trunc('month', CURRENT_DATE) - interval '5 days'` which yields the **24th**, not the 26th.

**Fix:** Corrected to `date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '25 days'`
(26th of the previous month when today is before the 26th). Applied in migration `20260310000003`.

### 4. Resident History RPC Missing from Schema Cache
**Problem:** `get_delinquency_resident_history` pushed via migration `20260310000002` but
PostgREST hadn't reloaded its schema cache — calls returned "function not found" error.

**Fix:** Added `NOTIFY pgrst, 'reload schema'` to migration `20260310000003`.

### 5. Monthly Benchmark Tooltip Not Showing
**Problem:** SVG `<circle>` elements had no `<title>` child — native browser tooltips never appeared.

**Fix:** Each benchmark dot now wraps a `<title>` with month name + balance value.

---

## DB Migrations Deployed

### `20260310000002_delinquencies_dashboard_v2.sql`
- Extended `view_delinquencies_daily_trend` to 90-day window + `total_unpaid > 0` filter
- New `get_delinquency_resident_history(p_property_code, p_months_count=12)` RPC

### `20260310000003_fix_delinquency_snapshots.sql`
- Fixed 26th-of-month date arithmetic in `get_delinquencies_monthly_26th_snapshots`
- Added `AND total_unpaid > 0` to monthly snapshot RPC + current summary view
- `NOTIFY pgrst, 'reload schema'` to force PostgREST cache reload

Both pushed via `npx supabase db push` ✅

---

## Files Changed

| File | Change |
|---|---|
| `layers/ops/utils/delinquencyUtils.ts` | **NEW** — 5 pure utility functions (getSafeWidth, formatCurrencyShort, computeDatesByMonth, computeAgingResidentCounts, computeSnapshotSummary) |
| `layers/ops/composables/useDelinquenciesAnalysis.ts` | Counter-based loading, trend ordering, resident history RPC + composable |
| `layers/ops/pages/office/delinquencies/index.vue` | Full UI overhaul — layout reorder, dual chart, history columns, date fix, tooltip fix, context helper |
| `layers/ops/pages/office/delinquencies/[date].vue` | Property scope, shared utils, date fix, timezone fix |
| `layers/parsing/composables/useDelinquenciesSync.ts` | Tombstone insertion for resolved tenancies |
| `supabase/migrations/20260310000002_delinquencies_dashboard_v2.sql` | **NEW** — 90-day trend view + resident history RPC |
| `supabase/migrations/20260310000003_fix_delinquency_snapshots.sql` | **NEW** — date bug fix, tombstone filtering, schema cache reload |
| `tests/unit/ops/delinquencyUtils.test.ts` | **NEW** — 29 unit tests for all 5 utility functions |

---

## Test Results

765 / 765 passing (31 files). Zero regressions.

---

<!-- H-081 archive below -->
# Field Report — Delinquencies Dashboard Hardening
**Session:** H-081

## Summary

Reviewed the full delinquencies dashboard stack (`index.vue`, `[date].vue`,
`useDelinquenciesAnalysis.ts`). Found and resolved 5 distinct bugs, extracted
all pure logic into a testable utility module, and added 29 new unit tests.
765 tests passing across 31 files.

---

## Bug 1 — Loading Race Condition (`useDelinquenciesAnalysis.ts`)
**Problem:** All three fetch functions (`fetchSummary`, `fetchSnapshots`,
`fetchDailyTrend`) shared a single boolean `loading` ref. When called in
parallel via `Promise.all`, whichever resolved first set `loading = false`
while the others were still in-flight — causing the Refresh button to
deactivate prematurely.

**Fix:** Replaced the boolean `loading` ref with a counter-based pattern
(`_loadingCount`). `loading` is now `computed(() => _loadingCount.value > 0)`,
which stays `true` until all parallel requests have settled.

---

## Bug 2 — Missing Property Scope (`[date].vue`)
**Problem:** Both the snapshot fetch and the nav-dates fetch had no
`.eq('property_code', ...)` filter. A user viewing property RS and navigating
to a snapshot date would see delinquencies from all 5 properties.

**Fix:** Added `usePropertyState()` to the detail page. Both queries now scope
to `activeProperty.value` when set.

---

## Bug 3 — Timezone Month Grouping (`index.vue` + extracted util)
**Problem:** `new Date('YYYY-MM-DD')` parses as UTC midnight. In US time
zones (UTC-5 to UTC-8), the first of any month (e.g. `2026-03-01`) shifts to
the prior day in local time — causing that date to appear in the wrong month
tab.

**Fix:** All date-string → Date conversions now use `new Date('YYYY-MM-DDT12:00:00')`
(noon local time) to avoid the UTC boundary shift. Applied in both the
date label formatter and `computeDatesByMonth`.

---

## Bug 4 — Unordered Daily Trend (`useDelinquenciesAnalysis.ts`)
**Problem:** `fetchDailyTrend` had no `.order()` clause. Row order from the
view was non-deterministic — the SVG line chart could connect dots out of
chronological sequence.

**Fix:** Added `.order('snapshot_date', { ascending: true })`.

---

## Bug 5 — Debug Console Logs in Production (`index.vue`, `[date].vue`)
**Problem:** Both pages had numerous `console.log` statements left from
development (date fetching, navigation, query results, date parsing).

**Fix:** All debug logs removed.

---

## Refactor: Pure Utility Extraction

Created `layers/ops/utils/delinquencyUtils.ts` with 5 exported pure functions:

| Function | Extracted From |
|---|---|
| `getSafeWidth(part, total)` | `index.vue` + `[date].vue` (was duplicated) |
| `formatCurrencyShort(val)` | `index.vue` |
| `computeDatesByMonth(dates)` | `index.vue` inline computed |
| `computeAgingResidentCounts(residents)` | `index.vue` inline computed |
| `computeSnapshotSummary(delinquencies)` | `[date].vue` inline reduce block |

---

## Tests Added

**File:** `tests/unit/ops/delinquencyUtils.test.ts` — 29 new tests

Edge cases covered:
- Division-by-zero / negative guard (`getSafeWidth`)
- Thousand-boundary formatting (`formatCurrencyShort`)
- Timezone first-of-month grouping via T12:00:00 anchor (`computeDatesByMonth`)
- Null/undefined bucket field handling (`computeAgingResidentCounts`)
- String-typed numeric columns from Supabase (`computeSnapshotSummary`)

**Suite result:** 765 / 765 passing (31 files). Zero regressions.

---

## Files Changed

| File | Change |
|---|---|
| `layers/ops/utils/delinquencyUtils.ts` | **NEW** — 5 pure utility functions |
| `layers/ops/composables/useDelinquenciesAnalysis.ts` | Counter-based loading, trend ordering |
| `layers/ops/pages/office/delinquencies/index.vue` | Import shared utils, remove logs, fix timezone |
| `layers/ops/pages/office/delinquencies/[date].vue` | Property scope, shared utils, remove logs, fix timezone |
| `tests/unit/ops/delinquencyUtils.test.ts` | **NEW** — 29 unit tests |

---

## Status: Ready for next changes

<!-- Previous session (H-080) content archived below -->
---

## H-080 Archive

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
