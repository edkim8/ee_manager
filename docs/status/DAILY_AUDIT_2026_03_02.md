# Daily Solver Audit — 2026-03-02

**Auditor:** Tier 2 Forensic Auditor (Claude Sonnet 4.6)
**Batch ID:** `59f17201-ca15-46fc-bc53-ca3115630c45`
**Run Time:** Monday, 2026-03-02 @ 7:41 AM
**Status:** ⚠️ WARNING — CV C213 Day 26 critical; 3 new MakeReady overdue flags (RS 3125, OB S160, OB S050)

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 5 (2 persistent, 3 new) |
| Fixes Applied | 0 |
| W1 Verification | ✅ PASS — Day 4 confirmed (Kenton/Jeffers/Poorman all processed correctly as Future) |
| CV C213 Escalation | 🔴 Day 26 — No Yardi update. Taub applicant active (start 2026-03-13) |
| Snapshot 403 Errors | ✅ RESOLVED — Option B stable Day 4. Zero 403 errors across all 5 properties |
| UNKNOWN Transfer Flag | ✅ APPARENT RESOLUTION — UNKNOWN absent from today's Phase 2E log (unconfirmed) |
| RS/SB Delinquency Flush | ✅ MAJOR — RS 165 resolved, SB 171 resolved (March 1 rent payments posting) |
| Email Notifications | Triggered (success: true, 8 results) |

---

## Property Activity

| Property | Rows | ΔRows (vs 02-26) | Lease Creates | Lease Updates | Applications | Notices | Flags Created |
|---|---|---|---|---|---|---|---|
| RS | 588 | 0 | 12 | 12 | 2 | 34 | 1 (3125 — new) |
| SB | 663 | 0 | 5 | 5 | 0 | 18 | 0 |
| CV | 194 | +4 | 3 | 3 | 3 | 2 | 0 (all already exist) |
| OB | 710 | -9 | 3 | 3 | 0 | 8 | 2 (S160, S050 — new) |
| WO | 327 | -1 | 1 | 1 | 0 | 1 | 0 |

**Notes:**
- CV +4 rows aligns with the 3 new Applicant tenancies (Taub/C213, Cedillo/C230, Kirksey/C427) plus natural daily flux.
- OB -9 row delta requires monitoring — likely moved-out or canceled tenancy removals that cleared from Yardi.
- All Safe Syncs: 0 New rows across all properties (pure update run — no net-new Yardi tenancy records).
- RS Safe Sync: 353 updates; SB: 382 updates — highest update volumes of the run, consistent with month-start delinquency and status refresh cycle.

---

## Availability Pipeline

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased | Contracted Rent | ΔRent |
|---|---|---|---|---|---|---|---|---|
| RS | 38 | 2 | 4 | **0** | 0 | 0 | $1,488 | $0 |
| SB | 28 | 0 | 4 | **0** | 0 | 0 | $1,644 | $0 |
| CV | 6 | 3 | 0 | **0** | 0 | 0 | $2,366 | $0 |
| OB | 22 | 0 | 2 | **0** | 0 | 0 | $2,547 | $0 |
| WO | 2 | 0 | 1 | **0** | 0 | 0 | $2,950 | $0 |

Pipeline fully static today — zero delta across all 5 properties vs. 2026-03-01. No units moved between Available → Applied → Leased. All Future/Applicant lease creates are pre-occupancy (no current-status conversions). Contracted rent unchanged — no new Current leases added to the average.

---

## Availability Price Changes

### CV — AIRM Micro-Decrements (Day 6 — Normal)

| Unit | Old Rent | New Rent | Change | % Change |
|---|---|---|---|---|
| C311 | $2,444 | $2,442 | -$2 | -0.1% |
| C217 | $2,344 | $2,342 | -$2 | -0.1% |
| C229 | $2,796 | $2,791 | -$5 | -0.2% |
| C419 | $2,204 | $2,202 | -$2 | -0.1% |
| C330 | $2,691 | $2,686 | -$5 | -0.2% |
| C112 | $2,666 | $2,661 | -$5 | -0.2% |

6 CV vacant units with $2–$5 AIRM decrements. Normal algorithmic behavior. C311/C217/C419 continue in the adjustment cycle (they dropped off briefly on 02-26 and re-entered — AIRM rebalancing). No RS, SB, OB, or WO price changes today.

---

## Follow-Up Tracking Resolution

| # | Item | 03-01 Status | 03-02 Status | Δ |
|---|---|---|---|---|
| 1 | 🔴 CV C213 | Day 25 — Taub applicant (2026-03-13) appeared | **Day 26 — No Yardi update; Taub still Applicant** | ❌ +1 day |
| 2 | ⚠️ CV C311 | 10 days overdue | **11 days overdue** | ❌ Escalating |
| 3 | ⚠️ CV C217 | 9 days overdue | **10 days overdue** | ❌ Escalating |
| 4 | ⚠️ CV C229 | 4 days overdue | **5 days overdue** | ❌ Escalating |
| 5 | ⚠️ CV C230 | 2 days overdue (NEW 03-01) | **3 days overdue** | ❌ Escalating |
| 6 | ⚠️ OB S081 | 5 days overdue | **6 days overdue** | ❌ Escalating |
| 7 | ⚠️ OB S093/S042/S170 | Day 6 (2027 ready dates, unconfirmed) | **Still 2027 dates, Day 7** | ❌ Still unconfirmed |
| 8 | ⚠️ W2 UNKNOWN Transfer Flag | Persisting (stale DB records suspected) | **UNKNOWN absent from Phase 2E log** | ✅ Likely resolved |
| 9 | ⚠️ RS 2007 / 1027 / 3061 | 3 days overdue (03-01) | **4 days overdue** | ❌ Escalating |
| 10 | ℹ️ OB Typo S100 Arreola Garcia | Yardi data: `lease_start_date=2102-05-22` | **Still present — not corrected** | ❌ Yardi fix outstanding |

---

## Findings

### ✅ CLEAN

- **No fatal errors** — All 5 properties processed to completion across all phases.
- **W1 Fix Day 4 Confirmed** — Kenton, Christina (RS-2019, $1,835), Jeffers, Ryan (RS-3130, $1,200), and Poorman, Timothy (SB-1015, $1,753) all processed as Future tenancies. Zero `Future → Notice` auto-correction for the 4th consecutive run. Fix from 2026-02-23 (`useSolverEngine.ts:1322`) remains stable.
- **Snapshot 403 Errors: Resolved** — Option B server-route pattern (`save-snapshot.post.ts` + `serverSupabaseServiceRole`) stable through Day 4. All 5 properties saved cleanly with zero 403 errors or retries. Original Option A policy dropped (migration `20260227000001`). Escalation fully closed.
- **RS/SB Month-Start Delinquency Flush** — RS resolved 165 delinquencies (of 174 rows), SB resolved 171 (of 190 rows). This is the expected March 1 rent cycle post — tenants who paid rent overnight on March 1 are now reflected. Net delinquency inventory reduced significantly. This is a strong positive signal.
- **CV AIRM Day 6** — 6 units, $2–$5 decrements. Expected algorithmic behavior. No action required.
- **UNKNOWN Transfer Flag — Apparent Resolution** — Yesterday's W2 (stale `unit_flags` records with `property_code = 'UNKNOWN'`) is no longer surfacing in Phase 2E. The 4 properties present today are: WO, OB, SB, RS (CV absent, UNKNOWN absent). Most likely the stale UNKNOWN rows were cleaned up in a DB operation between sessions. Monitor next run to confirm.
- **All operational syncs clean** — Alerts, Work Orders, and Delinquencies completed without stall or regression.
- **CV Applications Progressing** — 3 Applicant leases created/synced for C213, C230, and C427. Most notable: Taub, Timothy applicant (C213, lease_start 2026-03-13, $2,654) is now in the pipeline. If this application converts, C213 exits the MakeReady queue on or around 2026-03-13.

---

### ⚠️ WARNING

**W1 — CV MakeReady: Critical Escalation (Day 26)**

| Unit | Ready Date | Days Overdue | Trend |
|---|---|---|---|
| C213 | 2026-02-04 | **26 days** | Day 7 of audit series — Taub applicant active |
| C311 | 2026-02-19 | **11 days** | +1 from yesterday |
| C217 | 2026-02-20 | **10 days** | +1 from yesterday |
| C229 | 2026-02-25 | **5 days** | +1 from yesterday |
| C230 | 2026-02-27 | **3 days** | +1 from yesterday |

C213 is now 26 days overdue with no Yardi MakeReady resolution. However, Taub, Timothy has been in the Applicant pipeline since 03-01 with a lease start date of 2026-03-13. If the application converts to a Current tenancy on or after 2026-03-13, the MakeReady flag will be automatically resolved by the solver. Until then, the flag persists at critical severity.

All 5 CV MakeReady flags confirmed as "all already exist" — no new CV flags created this run, no CV flags resolved. CV has the highest concurrent MakeReady burden of any property (5 units).

---

**W2 — NEW: RS MakeReady Overdue — RS 3125 (2 Days)**

```
[Solver DEBUG] 3125: ready=2026-02-28, cutoff=2026-03-01, overdue=true
[Solver DEBUG] Creating flag for 3125: 2 days overdue
[Solver] Created 1 new overdue flags for RS
```

RS 3125 ready date passed on 2026-02-28. Now 2 days overdue. This is the 4th RS unit in the overdue queue alongside 2007, 1027, and 3061 (all at 4 days overdue). RS currently has 4 concurrent MakeReady overdue flags — monitor for escalation past the 7-day warning threshold.

---

**W3 — NEW: OB MakeReady Escalation — S160 and S050 (2 Days Each)**

```
[Solver DEBUG] S160: ready=2026-02-28, cutoff=2026-03-01, overdue=true
[Solver DEBUG] S050: ready=2026-02-28, cutoff=2026-03-01, overdue=true
[Solver DEBUG] Creating flag for S160: 2 days overdue
[Solver DEBUG] Creating flag for S050: 2 days overdue
[Solver] Created 2 new overdue flags for OB
```

Two new OB units entered the overdue MakeReady queue today. S081 also was flagged for severity escalation (6 days overdue — pre-existing flag). OB now has 3 concurrent MakeReady overdue flags (S081: 6 days, S160: 2 days, S050: 2 days).

---

**W4 — OB S093/S042/S170: 2027 Ready Dates (Day 7, Unconfirmed)**

| Unit | Ready Date | Days Until Ready |
|---|---|---|
| S093 | 2027-01-01 | ~305 days |
| S042 | 2027-01-07 | ~311 days |
| S170 | 2027-01-07 | ~311 days |

Unchanged for the 7th consecutive audit session. Ready dates remain implausibly far (2027) with no OB manager confirmation. These are not flagged as overdue by the solver (ready dates are in the future) but the extended runway is anomalous. Escalate to OB property manager — confirm these are intentional long-term holds (major rehab, structural work) or Yardi data errors.

---

**W5 — OB Yardi Data Entry Typo: Arreola Garcia S100 (2102-05-22)**

```
[Solver Debug] Future tenancy t2559309: {unit: 'S100', resident: 'Arreola Garcia, Pedro I',
  lease_start_date: '2102-05-22', lease_end_date: '2027-02-28', ...}
```

Flagged on 03-01. Still present today — Yardi team has not corrected `lease_start_date = 2102-05-22` (should be `2026-05-22`). The tenancy continues to be processed correctly against the valid `lease_end_date: 2027-02-28`, so there is no functional impact. However, the typo will persist in audit history until corrected. Notify Yardi data entry team.

---

**ℹ️ INFORMATIONAL — Browser Extension Error (Non-Critical)**

```
9:3001/admin/solver:1 Uncaught (in promise) Error: A listener indicated an asynchronous response
by returning true, but the message channel closed before a response was received
```

This is a Chrome browser extension error occurring between the Safe Sync phase and the Notices phase. It is not generated by the solver engine — the URL pattern `9:3001/admin/solver:1` indicates it originates from a browser tab extension (likely a dev tool or session manager) losing its message channel. All downstream solver phases (2D.5 through 3C + snapshots + email) completed successfully without interruption. No action required.

---

### 🔴 FATAL

None.

---

## Operational Sync Results

### Alerts
| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| RS | 3 | 0 | 0 | 0 |
| SB | 1 | 0 | 0 | 0 |
| CV | 2 | 0 | 0 | 0 |

OB and WO: no alert data in batch (not processed in Phase 3A). All 3 properties processed cleanly — no alert adds or removals.

### Work Orders
| Property | Processed | Deactivated | Net |
|---|---|---|---|
| CV | 18 | 0 | +18 |
| OB | 40 | 0 | +40 |
| RS | 28 | **8** | +20 |
| SB | 5 | **2** | +3 |
| WO | 2 | 0 | +2 |

RS deactivated 8 work orders — consistent with week-over-week work order completions. SB deactivated 2 (normal, unlike the 02-26 W6 anomaly where deactivated > processed). All properties stable.

### Delinquencies
| Property | Rows | Updated/New | Resolved | Note |
|---|---|---|---|---|
| RS | 174 | 113 | **165** | 🔴 March 1 rent flush — mass resolution |
| SB | 190 | 92 | **171** | 🔴 March 1 rent flush — mass resolution |
| OB | 162 | 156 | **44** | ✅ Active collection |
| CV | 102 | 98 | 11 | ✅ Active |
| WO | 84 | 84 | 4 | ✅ Active |

**RS and SB Delinquency Flush:** Combined 336 resolutions across RS + SB in a single run. This is the expected first-of-month delinquency resolution spike as March rent payments posted overnight on March 1. The high "Updated/New" counts alongside high "Resolved" counts are consistent with the month-start refresh cycle where the system re-evaluates all delinquency records. Net delinquency inventory is substantially lower today than yesterday — a strong positive.

**OB** continues with active resolution activity (44 resolved). WO and CV are progressing.

---

## MakeReady Status Board — Full Portfolio

| Unit | Property | Ready Date | Days Overdue | Status | Trend |
|---|---|---|---|---|---|
| C213 | CV | 2026-02-04 | **26** | 🔴 Critical — Taub applicant (2026-03-13) | Day 7 audit series |
| C311 | CV | 2026-02-19 | **11** | ⚠️ Escalating | +1/day |
| C217 | CV | 2026-02-20 | **10** | ⚠️ Escalating | +1/day |
| C229 | CV | 2026-02-25 | **5** | ⚠️ Warning | +1/day |
| C230 | CV | 2026-02-27 | **3** | ⚠️ Warning — Cedillo applicant (2026-03-07) | Day 2 |
| 2007 | RS | 2026-02-26 | **4** | ⚠️ Warning | Stable (existing) |
| 1027 | RS | 2026-02-26 | **4** | ⚠️ Warning | Stable (existing) |
| 3061 | RS | 2026-02-26 | **4** | ⚠️ Warning | Stable (existing) |
| **3125** | **RS** | **2026-02-28** | **2** | ⚠️ Warning — **NEW** | Created today |
| S081 | OB | 2026-02-24 | **6** | ⚠️ Warning — Escalated | Severity escalation |
| **S160** | **OB** | **2026-02-28** | **2** | ⚠️ Warning — **NEW** | Created today |
| **S050** | **OB** | **2026-02-28** | **2** | ⚠️ Warning — **NEW** | Created today |
| SB | — | — | — | ✅ No flags | Clear |
| WO | — | — | — | ✅ No flags | Clear |

**Total: 12 active MakeReady overdue flags** (5 CV, 4 RS, 3 OB)

---

## W1 Watch — Notices Fix Stability (Day 4) ✅

| Resident | Unit | Property | Rent | Today's Status |
|---|---|---|---|---|
| Kenton, Christina | 2019 | RS | $1,835 | ✓ Future → lease created |
| Jeffers, Ryan | 3130 | RS | $1,200 | ✓ Future → lease created |
| Poorman, Timothy | 1015 | SB | $1,753 | ✓ Future → lease created |

All three W1 watch tenancies processed correctly as Future for the 4th consecutive day. Fix from `useSolverEngine.ts:1322` (2026-02-23) is confirmed stable. Continuing to monitor.

---

## Shift Handoff

**For next session (2026-03-03):**

- 🔴 **C213 (CV):** Now **Day 26** overdue. Taub, Timothy applicant has a `lease_start_date = 2026-03-13` — if the application converts in the next 11 days, the flag resolves automatically. If no conversion by 2026-03-13, flag remains active and requires direct CV manager contact. Watch this carefully.
- ⚠️ **C311/C217 (CV):** 11 and 10 days — approaching 2-week threshold. Daily escalation. No Yardi response.
- ⚠️ **C229/C230 (CV):** Both have active applicants (C229 watch-only; C230: Cedillo applicant starts 2026-03-07 — 5 days out). If Cedillo converts, C230 resolves automatically.
- ⚠️ **RS 2007/1027/3061:** All at 4 days overdue. Approaching the 7-day escalation threshold. Notify RS property manager if not resolved by 03-05.
- ⚠️ **RS 3125:** NEW, 2 days overdue. Monitor.
- ⚠️ **OB S081:** 6 days overdue. Crossing warning threshold — escalate to OB manager.
- ⚠️ **OB S160/S050:** NEW, 2 days overdue. Monitor daily.
- ⚠️ **OB S093/S042/S170:** Day 7 with 2027 ready dates — no OB manager response yet. Must escalate.
- ✅ **UNKNOWN Transfer Flag:** Absent from today's log — confirm resolution next run by checking Phase 2E output. If still absent, close this watch.
- ⚠️ **OB Typo — Arreola Garcia S100:** `lease_start_date = 2102-05-22` still in Yardi. Notify data entry team for correction.
- ℹ️ **RS/SB Delinquency Flush:** Expect volumes to normalize tomorrow. Watch for any properties that did not participate in the flush — may indicate collection gaps.
- ℹ️ **CV AIRM Day 6:** 6 units with $2–$5 decrements. Normal. Track cumulative decline from baseline.
- ℹ️ **W1 Watch:** Day 5 tomorrow. Continue monitoring Kenton/Jeffers/Poorman.
- ℹ️ **CV Taub Application (C213, starts 2026-03-13):** Mark your calendar — if converted, C213 MakeReady crisis resolves without manual Yardi intervention. If still Applicant on 03-13, escalate as missed move-in.
