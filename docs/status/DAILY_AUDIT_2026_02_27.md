# Daily Audit — 2026-02-27

**Batch ID:** `30a8f72d-d56e-4f95-9b5e-f0692804276f`
**Run time:** 2026-02-27 at 6:51 AM
**Auditor:** Tier 2 Data Architect (Automated)
**Branch:** feat/mobile-ui

---

## Executive Summary

| Status | Count |
|---|---|
| ✅ CLEAN | 8 |
| ⚠️ WARNING | 2 |
| 🔴 FATAL | 0 |

System healthy. Option B snapshot server route **confirmed operational**. Watch-list Notices fix stable (Day 4). No RLS or auth errors.

---

## ✅ CLEAN — System Stability

### Option B Availability Snapshot — CONFIRMED LIVE
All 5 properties returned `✓ Availability snapshot saved` via the new server route (`/api/solver/save-snapshot`). Zero 403 or RLS errors detected. Option A policy (`authenticated_can_write_availability_snapshots`) can now be safely dropped.

| Property | Available | Applied | Leased | Contracted Rent |
|---|---|---|---|---|
| RS | 35 | 5 | 3 | $1,490 |
| SB | 25 | 0 | 5 | $1,642 |
| CV | 8 | 1 | 0 | $2,362 |
| OB | 21 | 1 | 1 | $2,527 |
| WO | 2 | 0 | 1 | $2,945 |

OB contracted_rent: $2,527 (was $2,530 — $3 drop consistent with today's unit price reductions).

### Notices Fix — Stable (Day 4)
All three W1 watch-list tenancies processed correctly as Future (not corrupted to Notice):
- Kenton, Christina (RS-2019): t3382793, $1,835, start 2026-03-16 ✓
- Jeffers, Ryan (RS-3130): t3389559, $1,200, start 2026-03-10 ✓
- Poorman, Timothy (SB-1015): t0715042, $1,753, start 2026-04-10 ✓

### Mobile/Context Impersonation — No Regression
The `is_super_admin` suppression and department-based nav filtering introduced in today's `feat/mobile-ui` commit are UI-only. Solver property scoping and Primary/Roommate role resolution ran without issue across all 5 properties.

### Data Sync — All Properties Clean

| Property | Rows | New | Updates | Leases Created | Status Updates |
|---|---|---|---|---|---|
| RS | 588 | 0 | 353 | 14 | 14 |
| SB | 663 | 0 | 382 | 6 | 6 |
| CV | 190 | 0 | 116 | 1 | 1 |
| OB | 718 | **1** | 210 | 4 | 4 |
| WO | 328 | 0 | 91 | 1 | 1 |

### Delinquencies — No Net Change
All 5 properties: 0 Updated/New, 0 Resolved. Stable delinquency state.

### Silently-Dropped Tenancies — Within Threshold
OB: 1 tenancy silently dropped → transitioned to Canceled, 1 unit reset to Available. Within normal range (threshold: ≤1 per property).

### MakeReady — All Properties
- RS: 43 units tracked, 0 overdue. All future-dated. ✓
- SB: 17 units tracked, 0 overdue. All future-dated. ✓
- OB: 1 overdue (S081, 3d) — existing flag, no new flag needed. ✓
- WO: 2 units tracked, 0 overdue. ✓

### Alerts & Work Orders — Nominal
- RS Alerts: 2 active, 1 added, 0 removed.
- Work Orders: CV 22 / RS 18 / SB 9 / OB 38 / WO 4 processed. All synced cleanly.
- Transfer flags: 2 created (Phase 2E).
- Applications: CV 1 / RS 5 / OB 2 saved, 0 overdue flags.

---

## ⚠️ WARNING

### W1 — OB Unit S100: Yardi Data Entry Error (Year 2102)
**Tenancy:** t2559309 — Arreola Garcia, Pedro I
```
lease_start_date: 2102-05-22  ← Should be 2026-05-22
lease_end_date:   2027-02-28
```
Solver processed this as a valid Future tenancy (2102 > today) — technically correct behavior. However the unit will **never naturally activate** without manual intervention. Make-ready date is 2026-03-10, so this must be corrected in Yardi before that date to avoid a ghost reservation. Action required from leasing team.

### W2 — CV Unit C213: 23 Days Overdue Make-Ready
Ready date was 2026-02-04. Today is 2026-02-27 — 23 calendar days past due. This is the most overdue unit in the portfolio. A concurrent $5 price reduction suggests it may be intentionally held, but no documentation is available. Ops follow-up required.

---

## 💰 Availability Price Changes

| Unit | Property | Old Rent | New Rent | Change | % Change | Notes |
|---|---|---|---|---|---|---|
| C112 | CV | $2,680 | $2,675 | ↓ $5 | -0.2% | AIRM — normal |
| C213 | CV | $2,810 | $2,805 | ↓ $5 | -0.2% | AIRM — normal |
| C217 | CV | $2,352 | $2,349 | ↓ $3 | -0.1% | AIRM — normal |
| C229 | CV | $2,810 | $2,805 | ↓ $5 | -0.2% | AIRM — normal |
| C230 | CV | $2,630 | $2,625 | ↓ $5 | -0.2% | AIRM — normal |
| C311 | CV | $2,452 | $2,449 | ↓ $3 | -0.1% | AIRM — normal |
| C330 | CV | $2,705 | $2,700 | ↓ $5 | -0.2% | AIRM — normal |
| C419 | CV | $2,212 | $2,209 | ↓ $3 | -0.1% | AIRM — normal |
| 2103 | RS | $1,383 | $1,533 | ↑ **$150** | **+10.8%** | Manual reprice |
| 3069 | RS | $1,705 | $1,805 | ↑ $100 | +5.9% | Manual reprice |
| 2041 | RS | $1,830 | $1,805 | ↓ $25 | -1.4% | Manual reprice |
| 3036 | RS | $1,613 | $1,563 | ↓ $50 | -3.1% | Manual reprice |
| 2057 | RS | $1,841 | $1,691 | ↓ **$150** | **-8.1%** | Manual reprice |
| S081 | OB | $2,785 | $2,635 | ↓ $150 | -5.4% | Manual reprice |
| S180 | OB | $2,480 | $2,430 | ↓ $50 | -2.0% | Manual reprice |
| 454-H | WO | $2,699 | $2,649 | ↓ $50 | -1.9% | Manual reprice |

**CV:** 8 AIRM micro-decrements ($3–$5) — expected daily behavior, no action required.
**RS:** Active repricing day. Largest moves: Unit 2103 +$150 (+10.8%) and Unit 2057 -$150 (-8.1%). Operational decisions.
**OB:** S081 -$150 (-5.4%) is the largest single drop today — aligns with its 3-day overdue make-ready status (motivated price reduction).
**WO:** 454-H -$50, minor manual adjustment.

---

## MakeReady Overdue Detail (CV)

| Unit | Ready Date | Days Overdue | Status |
|---|---|---|---|
| C213 | 2026-02-04 | **23 days** | ⚠️ Escalate |
| C311 | 2026-02-19 | 8 days | Flag active |
| C217 | 2026-02-20 | 7 days | Flag active |
| C229 | 2026-02-25 | 2 days | New flag |

---

## Architectural Optimization — Proposal

**Yardi Date Validation Pre-Filter**

Today's W1 (OB S100, start year 2102) demonstrates that Yardi can emit logically invalid lease dates that the solver silently accepts. Recommend adding a lightweight sanity-check layer in the solver's tenancy ingestion step:

```
if (lease_start_date > today + 10 years) → flag as DATA_ERROR, skip lease creation, log warning
```

This would prevent ghost reservations from being written to the DB while still surfacing the underlying Yardi data quality issue. A simple threshold (e.g., start date > `today + 3650 days`) would catch typos like 2102 while allowing legitimate long-term pre-leases. Estimated implementation: 1 composable function in `useSolverEngine.ts`, ~10 lines.

---

## Shift Handoff

**For the next session:**

1. **Option B confirmed** — run the cleanup migration to drop Option A RLS policy:
   ```sql
   DROP POLICY "authenticated_can_write_availability_snapshots" ON public.availability_snapshots;
   ```
   Update MEMORY.md to close out the Option B pending confirmation block.

2. **OB S100 / Arreola Garcia** — notify leasing team to correct `lease_start_date` from `2102-05-22` to `2026-05-22` in Yardi. Make-ready is 2026-03-10 — window is tight.

3. **CV C213** — 23 days overdue. Needs ops escalation. Check with maintenance/leasing if intentionally held.

4. **Watch list:** Kenton/RS-2019, Jeffers/RS-3130, Poorman/SB-1015 all clean today. Keep on watch through their respective move-in dates (March 10–16 for RS, April 10 for SB).

5. **WO work order deactivations** — 9 deactivated vs. 4 active. Monitor next run to confirm ratio normalizes.

6. **feat/mobile-ui branch** — Context Impersonation and Mobile Detect foundations are in place. No solver regression. Safe to continue UI work.
