# LATEST_UPDATE — Field Report
**Date:** 2026-03-10
**Agent:** Tier 2 Builder (Goldfish)
**Task:** Fix Silent Summary Delinquency Parsing Bug (Graceful Degradation)

---

## Problem Addressed

When the automated Yardi ingestion uploads a `5p_Delinquencies` report that was accidentally exported in **Summary** view (property-level aggregates) rather than **Individual** view (per-resident rows), the Solver previously processed it silently: no error thrown, but all `tenancy_id` and `resident` fields were null. This caused the sync to deactivate every active delinquency record (treating "nobody owes money" as ground truth) — a data-destroying silent failure.

---

## Root Cause

`useSolverEngine.ts` Phase 3C passed `raw_data` rows directly to `useDelinquenciesSync.syncDelinquencies()` with no format validation. A Summary export produces rows where `tenancy_id` and `resident` are null/empty. The sync logic then found zero tenancy matches and deactivated all existing active records.

---

## Changes Made

### 1. `layers/admin/utils/solverUtils.ts`
- **Added:** `isDelinquencySummaryFormat(rows)` — pure function. Inspects the parsed rows from `import_staging.raw_data`. Returns `true` if **every** row lacks a non-empty `tenancy_id` AND a non-empty `resident` field (the two required identifiers for individual-format data). Handles `null`, empty string, and missing keys.

### 2. `layers/admin/utils/solverTrackingState.ts`
- **Added:** `discrepancies: string[]` field to `PropertySummary` interface (initialized to `[]`).
- **Added:** `trackDiscrepancy(propertyCode, { message, report_type })` tracker function. Appends the message to `propertySummaries[pCode].discrepancies` and pushes an event with `event_type: 'discrepancy'`. This surfaces in the Daily Solver Review email via the existing event/summary pipeline.

### 3. `layers/admin/composables/useSolverTracking.ts`
- Destructures and re-exports `trackDiscrepancy` from tracking state.

### 4. `layers/admin/composables/useSolverEngine.ts`
- Imports `isDelinquencySummaryFormat`.
- **Added sanity check** in Phase 3C (delinquencies loop): before calling `syncDelinquencies()`, runs `isDelinquencySummaryFormat(rows)`. If Summary format detected:
  - Logs `console.warn` with property code and `"Skipping sync."`
  - Calls `tracker.trackDiscrepancy(pCode, { message: 'DATA COMPROMISED: Received Summary format for Delinquencies instead of Individual format.', report_type: 'delinquencies' })`
  - `continue` — skips this property's delinquency sync entirely. All other reports and all other phases proceed normally.

---

## Behavior After Fix

| Scenario | Before | After |
|---|---|---|
| Individual-format export (normal) | ✓ Syncs correctly | ✓ Syncs correctly (unchanged) |
| Summary-format export | ✗ Silently wipes delinquency records | ⚠ Skips sync, logs `DATA COMPROMISED` discrepancy event |
| Other 11 reports in the same batch | ✓ Run normally | ✓ Run normally (no regression) |
| Solver hard-crash | Possible (data corruption) | Never — graceful skip only |

---

## Tests Added

**New file:** `tests/unit/solver/delinquencySummaryDetection.test.ts`

Covers:
- `isDelinquencySummaryFormat` — 8 cases: individual rows (false), summary null rows (true), summary empty-string rows (true), mixed batch (false), empty array (false), partial fields (true x 2), single valid row (false).
- `trackDiscrepancy` — 7 cases: event shape, summary array append, multi-discrepancy accumulation, property auto-init, no numeric counter side-effects, per-property isolation, reset clears.
- Integration scenario x 2: summary payload triggers discrepancy; individual payload does not.

**Updated:** `tests/unit/solver/solverTrackingState.test.ts` — `initProperty` test now asserts `discrepancies: []`.

### Test Run Result
```
Test Files  31 passed (31)
     Tests  740 passed (740)
  Duration  9.43s
```
No regressions. Net new tests: +17.

---

## Files Changed

| File | Type |
|---|---|
| `layers/admin/utils/solverUtils.ts` | Modified — added `isDelinquencySummaryFormat` |
| `layers/admin/utils/solverTrackingState.ts` | Modified — added `discrepancies` field + `trackDiscrepancy` |
| `layers/admin/composables/useSolverTracking.ts` | Modified — exposes `trackDiscrepancy` |
| `layers/admin/composables/useSolverEngine.ts` | Modified — sanity check in Phase 3C |
| `tests/unit/solver/delinquencySummaryDetection.test.ts` | New — 17 tests |
| `tests/unit/solver/solverTrackingState.test.ts` | Modified — 1 assertion added |
