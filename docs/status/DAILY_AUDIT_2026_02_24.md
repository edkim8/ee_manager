# Daily Solver Audit — 2026-02-24

**Auditor:** Tier 2 Data Architect (Claude Sonnet 4.6)
**Batch ID:** `e803b836-3be0-43c2-ada0-b312f6abcad1`
**Run Time:** Tuesday, 2026-02-24 @ 7:08 AM
**Status:** ✅ COMPLETE — No fatal errors

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, OB, WO, CV (5) |
| Fatal Errors | None |
| Warnings | 7 (4 active, 3 informational) |
| Fixes Applied | 0 (no new code changes required) |
| W1 Verification | ✅ PASS — Zero auto-status corrections (fix confirmed) |
| W4 Verification | ✅ PASS — 0 new UNKNOWN flags created (residual log noise explained below) |
| Email Notifications | Triggered (status from API below) |

---

## Property Activity

| Property | Rows | ΔRows | New Tenancies | Lease Inserts | Lease Updates | Applications | Notices | Past Transitions |
|---|---|---|---|---|---|---|---|---|
| RS | 594 | +2 | 2 | 2 | 15 | 9 | 30 | 2 |
| SB | 659 | — | 0 | 0 | 4 | 1 | 16 | 0 |
| OB | 722 | -5 | 0 | 0 | 6 | 4 | 7 | 2 |
| WO | 324 | +1 | 0 | 0 | 0 | 0 | 0 | 0 |
| CV | 190 | -4 | 0 | 0 | 1 | 1 | 2 | 2 |

Row count deltas are within normal daily variance. No anomalous spikes.

---

## Availability Pipeline

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased |
|---|---|---|---|---|---|---|
| RS | 29 | 8 | 3 | -1 | +2 | — |
| SB | 26 | 1 | 2 | — | -1 | -1 |
| OB | 18 | 3 | 0 | +1 | — | — |
| CV | 8 | 1 | 0 | +1 | — | — |
| WO | 2 | 0 | 0 | — | — | — |

---

## Findings

### ✅ CLEAN

- **No fatal errors** — All 5 properties processed to completion.
- **W1 Fix Verified** — RS-3130 (Jeffers, Ryan), RS-2019 (Kenton, Christina), SB-1015 (Poorman, Timothy) all processed as Future tenancies with no `Future → Notice` auto-correction. Fix from 2026-02-23 (`useSolverEngine.ts:1322`) confirmed working. No recurrence.
- **W4 Verified — 0 new UNKNOWN flags created.** `Phase 2E Complete: 0 transfer flags created`. "All already exist" message is correct idempotent behavior — see W4 section below for full explanation.
- **CV C414 MakeReady Resolved** — C414 now has `ready=2026-03-06` (future date). Solver closed the overdue flag. Carter, Bryson's situation was updated in Yardi. No longer active.
- **RS Flat Renewal** — Bausley, Edward, Unit 1029, $1,735 → $1,735 (flat, $0 change). 1 lease archived as Past, 1 re-signed. Clean.
- **0 Move-Out Overdue Flags** — Phase 2D.5 found no Notice tenancies past their move_out_date. All previously overdue units resolved or still within bounds.
- **Stale Availability Sweep** — 2 records deactivated (Current tenancy resolved), 2 records updated (Future/Applicant). Normal operation.
- **All operational syncs clean** — Delinquencies, work orders, and alerts completed without errors across all 5 properties.
- **OB: 4 Delinquency Resolutions** — Positive collection activity at OB.

---

### ⚠️ WARNING

**W1 — CV MakeReady: C213 Critically Overdue (20 Days, Day 3)**

| Unit | Ready Date | Days Overdue | Flag Status |
|---|---|---|---|
| C213 | 2026-02-04 | **20 days** | Active — no change, staff action required |
| C311 | 2026-02-19 | 5 days | Escalating |
| C217 | 2026-02-20 | 4 days | Escalating |

C414 resolved today (new ready date 2026-03-06). C213 remains the critical escalation — 20 days is an abnormal delay. Escalate to CV property manager immediately if not already done.

---

**W2 — W4 RESIDUAL: UNKNOWN Property Code in Phase 2E (Log Noise — Not a Data Error)**

**Full explanation (per today's investigation):**

The "UNKNOWN" appearing in Phase 2E logs is **NOT caused by any specific row or unit_name** in the transfer data. It originates at the `import_staging` record level:

- `pCode = report.property_code` at line 1916 of `useSolverEngine.ts`
- The Yardi transfers report is cross-property by nature (a transfer can go from RS → SB, CV → OB, etc.)
- When the upload parser stages this report, it cannot assign a single property code, so `import_staging.property_code` defaults to `'UNKNOWN'`
- The `pCode` variable is only used for **console logging and tracking stats** — not for any actual flag creation
- The flags themselves correctly use `row.from_property_code` and `row.to_property_code` from the row data (which ARE properly set)

**The "duplication of residents" you observed is also expected behavior:**

Each transfer generates **2 rows** in the Yardi report:
- Row A: FROM unit — same resident name, outgoing status (e.g., `Past`, `Current`)
- Row B: TO unit — same resident name, incoming status (e.g., `Future`, `Applicant`)

With 6 transferring residents → 12 rows. Same resident name appears twice with different statuses. This is how Yardi represents in-progress transfers.

**"All already exist"** = the `unit_transfer_active` flags created on Day 1 of each transfer are still unresolved (residents haven't completed their transfers). Solver correctly skips creating duplicates. Idempotent behavior confirmed correct.

**Verdict:** W4 is fully resolved at the DB level. The log noise is a cosmetic issue in Phase 2E — the transfers report will always log as `UNKNOWN` because cross-property transfers have no single property code. No data correctness issue exists.

---

**W3 — RS: 6 Alerts Removed in One Run (Alert Churn Threshold)**

RS: 6 alerts removed, 0 added, net count = 1. Template threshold for alert churn is >3 removes. This likely represents a batch of maintenance issues resolved in Yardi. Verify with RS property team that no legitimate alerts were accidentally cleared.

---

**W4 — CV AIRM Price Micro-Decrements: Day 3 (Informational)**

7 CV vacant units dropped $1–$2 for the third consecutive day. Confirmed AIRM behavior. No action required.

| Units | Drop |
|---|---|
| C213, C229, C230, C330, C112 | -$2 |
| C311, C217 | -$1 |

---

**W5 — OB Long-Term MakeReady: S093, S042, S170 (Ready Date: 2027)**

Three OB units have `ready` dates set to January 2027 (10+ months out):
- S093: ready=2027-01-01
- S042: ready=2027-01-07
- S170: ready=2027-01-07

Three units simultaneously offline for ~10 months is unusual. Likely intentional (major renovation or repositioning). Confirm with OB property manager that these dates are correct and units are intentionally offline.

---

**W6 — RS Delinquencies: 8 New/Updated, 0 Resolved**

RS had 8 delinquency updates with zero resolutions today. RS has the highest delinquency volume (58 rows). No single-day spike threshold crossed, but a multi-day trend of 0 resolutions at RS warrants monitoring.

---

### 🔴 FATAL

None.

---

## Operational Sync Results

### Work Orders
| Property | Processed | Deactivated |
|---|---|---|
| OB | 28 | 0 |
| CV | 19 | 0 |
| RS | 12 | 6 |
| WO | 10 | 0 |
| SB | 8 | 2 |

### Alerts
| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| OB | 4 | 0 | 1 | 0 |
| RS | 1 | 0 | 6 | 0 |

### Delinquencies
| Property | Rows | Updated/New | Resolved |
|---|---|---|---|
| OB | 61 | 2 | 4 |
| RS | 58 | 8 | 0 |
| SB | 41 | 4 | 1 |
| CV | 34 | 2 | 1 |
| WO | 20 | 2 | 1 |

---

## Architectural Optimization Suggestion

**Fix the Phase 2E UNKNOWN log noise at the parser level.**

The transfers report in `import_staging` stores `property_code = 'UNKNOWN'` because no single property can be assigned. A targeted fix would be to check `if (pCode === 'UNKNOWN')` in the Phase 2E loop and substitute a descriptive label like `'TRANSFERS (multi-property)'` for logging purposes only. Alternatively, the upload parser could detect the `report_type = 'transfers'` and set `property_code = 'MULTI'` at staging time to make logs self-documenting. Neither change affects data correctness — purely cosmetic.

---

## Shift Handoff

**For next session:**
- 🔴 C213 (CV): Now **20 days** overdue in MakeReady — physical escalation to CV property manager required if not already completed
- ⚠️ C311/C217 (CV): 5 and 4 days overdue respectively — monitor for resolution
- ✅ W1 (auto-status flip-flop): Confirmed fixed — no further monitoring needed for RS-3130, RS-2019, SB-1015
- ✅ W4 (UNKNOWN transfer): Fully explained — idempotent log noise, not a data issue. No action needed.
- ⚠️ RS alert churn: 6 removals in one run — verify with RS property team
- ⚠️ OB S093/S042/S170: MakeReady 2027 — confirm with OB manager that long-term dates are intentional
- ℹ️ CV AIRM: Day 3 of micro-decrements — normal, no action
- ℹ️ RS delinquencies: 0 resolved today — watch trend
