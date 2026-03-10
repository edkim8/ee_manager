# Foreman Handoff Report
**Date:** 2026-03-10
**Session:** H-080
**From:** Tier 2 Builder (Goldfish)
**To:** Foreman (next session)
**PR:** #39 — merged to `main`

---

## What Was Done

### 1. Solver — Delinquency Safety Net
The Solver was silently destroying delinquency records whenever Yardi exported the wrong format (Summary view instead of Individual view). This happened on 2026-03-09 — RS showed 318 delinquencies in the catch-up because the prior day's bad file wiped the records. It is now fixed.

**How it works:** Before calling `syncDelinquencies()`, the Solver inspects the rows with `isDelinquencySummaryFormat()`. If the file is Summary format, it skips the sync entirely and logs a `DATA COMPROMISED` discrepancy event that surfaces in the daily email. No other phase is affected.

**Files:** `solverUtils.ts`, `solverTrackingState.ts`, `useSolverTracking.ts`, `useSolverEngine.ts`

---

### 2. Solver — Zero-Alerts No Longer Crashes Phase A

When all 5 properties have zero alerts, Yardi's dashboard shows no clickable `<a>` link. The download script was crashing with `TimeoutError` trying to click it, which silently skipped Make_Ready and WorkOrders downloads for the whole run.

**Script fix:** `_click_stat_link()` now catches the exception and returns `False`. For Alerts specifically, it logs an INFO message and moves on. Phase A completes normally.

**Solver fix:** Phase 3A compares which properties are in the batch (via `residents_status`, always present) against which have an alerts file. Any property missing from the alerts file is inferred to have zero alerts that day — `clearAlerts()` is called to deactivate any stale alert records.

**Files:** `yardi_download.py`, `phases/phase_a_dashboard.py`, `useSolverEngine.ts`, `useAlertsSync.ts`

---

### 3. Audit System — Permanent Institutional Memory

The daily audit now has three memory tiers:

| Tier | What | Where |
|---|---|---|
| Short-term | Last 7 audit files | `docs/status/DAILY_AUDIT_*.md` |
| Medium-term | ANOMALY_LOG | `docs/status/ANOMALY_LOG.md` |
| Long-term | DB retention | pg_cron (90d events, 365d runs) |

**ANOMALY_LOG.md** is the key new file. The audit agent reads it at the start of every session and cross-checks all findings against it:
- **Acknowledged Normals** suppress false positives (e.g., CV AIRM micro-decrements)
- **Active Watch Items** track recurring issues across days (e.g., RS silent-drop loop)
- **Recurring** — never auto-pruned, requires human resolution
- **Resolved** — auto-pruned after 45 days

The daily audit prompt (`DAILY_UPLOAD_REVIEW_PROMPT.md`) has been updated to maintain this log at close of every session.

**DB Retention:** pg_cron migration deployed to production. `solver_events` pruned at 90 days, `solver_runs` at 365 days. First run tonight at 03:00 UTC (nothing to delete yet — jobs are just registering).

---

### 4. UI Fixes — Three Pages

**`office/renewals/[id]`**
- Floor Plan column was broken in both Standard and MTM tables — the slot was missing so the table rendered `undefined`. Now correctly reads `row.units?.floor_plans?.marketing_name`.
- Floor Plan filter buttons now show SF alongside the standard/MTM counts.

**`office/availabilities`**
- Selection checkboxes added to all rows (visible to everyone).
- Bulk Upfront $ and Free Days inputs appear in the toolbar when rows are selected, but **only for Management dept + Asset/Manager role (or super admin)**. Apply patches `availabilities.concession_upfront_amount` and `concession_free_rent_days` for all selected units in one DB call.

**`office/pricing/floor-plans`**
- Unit badges in both tables (Available and Applicant/Future) now use the same vacancy color coding as the main Availabilities page: red/pink/yellow/green/blue by days until ready.
- Status badge added to Available Units table (was rendering raw text).

---

## Test Suite

736 tests passing, zero regressions. Net new: +48 tests across 3 new files.

Key new coverage:
- `delinquencySummaryDetection.test.ts` — 17 tests for the format detection + discrepancy tracking
- `save-snapshot.post.test.ts` — 15 tests for the solver save-snapshot server route
- `update-tenancy-status.post.test.ts` — 15 tests for the tenancy status update route

---

## Active Watch Items (from ANOMALY_LOG)

| Property | Item | Status | Last Seen |
|---|---|---|---|
| RS | Silent-drop loop — W1 (RS-2019, RS-3130, RS-1015) | WATCHING | 2026-03-10 |

W1 fix (Notices processor `validStatuses` restriction) has been stable for 16 days. RS-3130 Jeffers moved in today — if no silent-drop occurs tonight, consider closing this watch item on the next audit.

---

## Pending Follow-Ups

| Item | Priority | Notes |
|---|---|---|
| WO 464-E Sanchez | 🔴 EMERGENCY | 8 days overdue, move-in 03-16 (6 days). Manager has not responded per audit. |
| OB S093 / S042 | ⚠️ WARNING | Day 15, 2027 lease dates. No manager response logged. |
| OB S150 | ⚠️ WARNING | New 4-day overdue flag (first appearance 03-10). Monitor. |
| SB work order 200% anomaly | ⚠️ WARNING | Returned after prior resolution. Needs Yardi-side investigation. |
| pg_cron first run | ℹ️ INFO | Tonight 03:00 UTC — verify jobs executed in Supabase dashboard (cron.job_run_details). Nothing to delete yet; confirms jobs are live. |

---

## Architecture Notes for Next Session

- **`ANOMALY_LOG.md` must be read at the start of every audit.** The audit prompt already enforces this, but Foreman should verify the agent reads it before flagging anything.
- **Zero-alerts inference:** The Solver now treats absence-in-batch as zero alerts. If a property is somehow missing from `residents_status` in a given batch (unusual), it will NOT get alerts cleared — this is correct and intentional. Flag if any property goes missing from `residents_status`.
- **Supabase setup:** Hosted only, no Docker. `npx supabase db push` is the only CLI command needed for migrations. `supabase status` will always fail — expected.
