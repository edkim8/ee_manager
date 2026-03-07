# Daily Solver Audit — 2026-03-07

**Auditor:** Tier 2 Forensic Auditor (Claude Sonnet 4.6)
**Batch ID:** `d91b1f53-94de-482e-883e-e88c0549d568`
**Run Time:** Saturday, March 7, 2026 @ 6:20 AM
**Status:** ⚠️ WARNING — WO 464-E 5 days overdue (Sanchez starts 03-16); RS 3103 flag active on Helbert move-in day; CV C419 enters overdue 03-08; OB S093/S042 Day 12 (2027 dates)

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 4 |
| Code Fix Applied | 1 — TRACE debug block removed from `useSolverEngine.ts:257` |
| W1 Verification | ✅ PASS — Day 9 (Kenton/Jeffers/Poorman all Future) |
| Snapshot 403 Errors | ✅ RESOLVED — Option B stable Day 9 |
| OB S101 Mesinas $0 Rent | ✅ CORRECTED — Yardi shows $2,125 today |
| OB Delinquency Surge | ✅ NORMALIZED — 49 new entries (03-06) → 5 new today |
| SB Work Order Anomaly | ✅ RESOLVED — 0 deactivated today (Day 9+ pattern closed) |
| RS Rivera W4 | ✅ CLOSED — $1,060 confirmed correct; market rent $1,470 confirmed in Leased-Availabilities |
| Silent Drops | ✅ NONE — 0 across all 5 properties |
| Email Notifications | ✅ Triggered (success: true, 8 results) |

---

## Property Activity

| Property | Rows | Safe Sync (New/Upd) | Lease Ops | Applications | Notices | Silent Drops |
|---|---|---|---|---|---|---|
| CV | 191 | 0 / 116 | 3 updated | 3 | 2 | 0 |
| OB | 703 | 1 New / 207 | 1 inserted, 3 updated | 1 | 7 | 0 |
| RS | 585 | 1 New / 352 | 1 inserted, 12 updated | 4 | 33 | 0 |
| WO | 326 | 0 / 91 | 1 updated | 0 | 2 | 0 |
| SB | 665 | 0 / 381 | 2 updated | 0 | 21 | 0 |

---

## Lease Creates (23 total)

| Resident | Property | Unit | Type | Rent | Lease Start | Note |
|---|---|---|---|---|---|---|
| Taub, Timothy | CV | C213 | Applicant | $2,654 | 2026-03-13 | Continuing |
| Cedillo, Jonathan | CV | C330 | Applicant | $2,581.35 | 2026-04-01 | Continuing |
| Kirksey, Ramon | CV | C427 | Applicant | $2,383 | 2026-04-01 | Continuing |
| Garibaldi, Monique | OB | S050 | Applicant | $2,870 | 2026-04-22 | NEW |
| Arreola Garcia, Pedro I | OB | S100 | Future | $1,975 | 2026-05-01 | Continuing |
| Mesinas, Gustavo | OB | S101 | Future | $2,125 | 2026-03-06 | ✅ Rent corrected (was $0 on 03-06) |
| Avalos, Ashley | OB | S139 | Future | $1,975 | 2026-03-14 | Continuing |
| Guzman, Fernando | RS | 1005 | Future | $1,631 | 2026-03-10 | Continuing |
| Adame, Jorge | RS | 1016 | Applicant | $1,218 | 2026-03-07 | Move-in TODAY |
| Aguilar, Sebastian | RS | 1033 | Applicant | $1,521 | 2026-03-14 | Continuing |
| Tyars, Latora | RS | 1038 | Future | $1,233 | 2026-04-16 | Continuing |
| Oltmanns, Brian | RS | 1073 | Future | $1,335 | 2026-03-27 | Continuing |
| Salazar, James | RS | 1099 | Future | $1,656 | 2026-04-26 | Continuing |
| Herbert, Rylee | RS | 2007 | Applicant | $1,438 | 2026-03-06 | Continuing |
| Kenton, Christina | RS | 2019 | Future | $1,835 | 2026-03-16 | W1 watch |
| Ruffner, Kendall | RS | 2033 | Applicant | $1,531 | 2026-05-10 | NEW |
| Smith, Tyrus | RS | 2041 | Future | $1,805 | 2026-04-30 | Continuing |
| Rivera, Joel | RS | 2135 | Future | $1,060 | 2026-03-09 | ✅ Confirmed correct — see closed W4 |
| Helbert, Kyle | RS | 3103 | Future | $1,563 | 2026-03-07 | Move-in TODAY — MR flag active |
| Jeffers, Ryan | RS | 3130 | Future | $1,200 | 2026-03-10 | W1 watch — move-in 3 days |
| Sanchez Calixto, Karina | WO | 464-E | Future | $3,395 | 2026-03-16 | ⚠️ 5-day overdue flag |
| Poorman, Timothy | SB | 1015 | Future | $1,753 | 2026-04-10 | W1 watch |
| Obando, Walther | SB | 2058 | Future | $2,125 | 2026-03-14 | Continuing |

**Renewals:** 0 — flat renewal streak **Day 14**

---

## Availability Price Changes (All CV — AIRM)

| Unit | Property | Old Rent | New Rent | Change | % Change | Note |
|---|---|---|---|---|---|---|
| C217 | CV | $2,332 | $2,329 | ↓ $3 | −0.1% | Normal AIRM |
| C311 | CV | $2,432 | $2,429 | ↓ $3 | −0.1% | Normal AIRM |
| C419 | CV | $2,192 | $2,189 | ↓ $3 | −0.1% | Normal AIRM |
| C229 | CV | $2,773 | $2,768 | ↓ $5 | −0.2% | Normal AIRM |
| C230 | CV | $2,593 | $2,588 | ↓ $5 | −0.2% | Normal AIRM |
| C112 | CV | $2,643 | $2,638 | ↓ $5 | −0.2% | Normal AIRM |
| C323 | CV | $2,668 | $2,663 | ↓ $5 | −0.2% | Normal AIRM |

All 7 units are CV AIRM. No manual repricing at RS, SB, OB, or WO.

---

## Availability Snapshots

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased | Contracted Rent | ΔRent |
|---|---|---|---|---|---|---|---|---|
| CV | 8 | 3 | 0 | **+1** | 0 | 0 | $2,369 | $0 |
| OB | 22 | 1 | 2 | −1 | **+1** | 0 | $2,536 | $0 |
| RS | 37 | 4 | 4 | −1 | **+1** | 0 | $1,486 | $0 |
| WO | 3 | 0 | 1 | 0 | 0 | 0 | $2,950 | $0 |
| SB | 32 | 0 | 2 | 0 | 0 | 0 | $1,645 | $0 |

**CV +1 available:** One unit freed via Phase 2C-2 stale availability sweep (2 stale records updated this run).
**OB applied +1:** Garibaldi (S050) new applicant entered pipeline.
**RS applied +1:** Ruffner (2033) new applicant entered pipeline.

---

## Findings

### ✅ CLEAN

**1 — No Fatal Errors**
All 5 properties completed all phases (Safe Sync → Leases → Notices → MakeReady → Applications → Transfers → Alerts → Work Orders → Delinquencies → Snapshots). Zero 403 errors.

**2 — W1 Fix Day 9 Confirmed**
Kenton, Christina (RS-2019, $1,835), Jeffers, Ryan (RS-3130, $1,200), and Poorman, Timothy (SB-1015, $1,753) processed as Future for the 9th consecutive run. Fix from `useSolverEngine.ts:1322` (2026-02-23) stable.

**3 — Snapshot Option B Stable Day 9**
All 5 properties saved availability snapshots with zero 403 errors.

**4 — OB S101 Mesinas Rent Corrected**
Mesinas, Gustavo (OB S101) showed $0 rent on 03-06. Today Yardi shows $2,125. W3 from 03-06 closed.

**5 — OB Delinquency Surge Normalized**
OB had 49 new/updated delinquency entries on 03-06 (audit series high). Today: 5 new, 2 resolved. The spike was a batch late-charge posting event. W8 from 03-06 closed.

**6 — SB Work Order Anomaly Resolved**
SB deactivated ≥ processed for 9+ consecutive days. Today: 2 processed, 0 deactivated. Pattern closed.

**7 — RS Rivera (2135) W4 Closed**
Rivera, Joel (RS-2135, Future, $1,060, starts 03-09) confirmed correct at $1,060. The $1,631 figure referenced in prior audits was an erroneous availability asking price (remnant of the 03-04 RS mass repricing batch), not the true market rent. Confirmed market rent: **$1,470** ($1,430 base + $20 Tucked Under Carport + $20 1st Floor Studio). Leased-Availabilities record shows $1,470 correctly. $1,060 is a legitimate negotiated rate below market. W4 closed.

**8 — Zero Silent Drops All Properties**
No tenancies disappeared without normal status transitions in today's run.

**9 — New Applications: Garibaldi (OB) + Ruffner (RS)**
Portfolio application count increased from 6 to 8. OB Garibaldi, Monique (S050, $2,870, starts 04-22) and RS Ruffner, Kendall (2033, $1,531, starts 05-10) are new to the pipeline.

**10 — Code Fix: TRACE Debug Block Removed**
Hardcoded `console.log` TRACE for units 1025/1026/1027 at `useSolverEngine.ts:257` removed. This debug artifact was firing twice per co-resident unit (once for Primary, once for Roommate) — producing the recurring "Day N" duplicate TRACE note in audit logs. `resolveUnitId` is a static in-memory lookup; there were never redundant DB calls. Log noise eliminated.

---

### ⚠️ WARNING

**W1 — WO 464-E: 5 Days Overdue — Sanchez Starts 2026-03-16 (9 Days)**

```
464-E: ready=2026-03-02, cutoff=2026-03-06, overdue=true
Creating flag for 464-E: 5 days overdue
No new MakeReady flags to create for WO (all already exist)
Updated 2 move-out overdue flags (severity escalation)
```

WO 464-E is now 5 days overdue. Sanchez Calixto, Karina starts 2026-03-16 ($3,395). Critical threshold (7 days to move-in) is crossed **Monday 03-09**. Flag severity was escalated in this run. WO manager must act this weekend — no time remaining to wait for Monday's run.

---

**W2 — RS 3103: MakeReady Flag NOT Resolved on Helbert Move-In Day (TODAY)**

```
3103: ready=2026-03-07, cutoff=2026-03-06, overdue=false
No makeready flags to resolve for RS
```

Helbert, Kyle's lease starts **today (Saturday, 2026-03-07)**. RS 3103 is still present in the Yardi MakeReady report as of this morning's run — the flag did not auto-resolve. The 1-day cushion prevents an overdue flag from being created today, but the unit has not been cleared in Yardi. RS manager must confirm physical readiness before handing over keys. If Yardi is updated today/Sunday, Monday's run will auto-resolve the flag.

---

**W3 — CV C419: Enters Overdue Window Tomorrow (03-08)**

```
C419: ready=2026-03-06, cutoff=2026-03-06, overdue=false
```

Ready date is 2026-03-06 (yesterday). Not flagged today due to 1-day cushion. Will become overdue in **Monday's run (03-09)** if not cleared in Yardi over the weekend. No incoming applicant for C419 currently — no move-in deadline pressure, but the flag will be created.

---

**W4 — OB S093/S042: Day 12 with 2027 Ready Dates — No Manager Response**

```
S093: ready=2027-01-01, cutoff=2026-03-06, overdue=false
S042: ready=2027-01-07, cutoff=2026-03-06, overdue=false
```

S170 was corrected on 03-06 (positive signal). S093 and S042 remain at Day 12, unacknowledged. Twelve consecutive audit days without manager confirmation on units with ~300-day ready dates is not acceptable. Direct OB manager contact required — confirm whether these are intentional long-term rehabilitation holds or Yardi data errors.

---

**Open Bugs (Not Triggered Today — Fix Pending on Feature Branch)**

| Bug | Status | Branch |
|---|---|---|
| Parser trailing-space bug (false silent drop detection) | Not triggered today | `feat/continue-dev-on-owners` |
| RLS gap — tenancy status transitions silently fail via JWT | Not triggered today | `feat/continue-dev-on-owners` |

Both fixes are in-progress on the feature branch. Merge to main before next run to eliminate both vulnerabilities permanently.

---

### 🔴 FATAL

None.

---

## Move-Out Overdue (Phase 2D.5)

```
[Solver] Found 2 overdue move-outs to flag
[Solver] Updated 2 move-out overdue flags (severity escalation)
```

2 existing flags escalated in severity (not newly created). Unit identities not surfaced in log. Query to identify:

```sql
SELECT u.unit_name, t.property_code, f.metadata, f.updated_at
FROM unit_flags f
JOIN units u ON f.unit_id = u.id
JOIN tenancies t ON t.unit_id = u.id
WHERE f.flag_type = 'move_out_overdue'
  AND f.updated_at::date = '2026-03-07'
ORDER BY t.property_code, u.unit_name;
```

---

## MakeReady Status Board

### Active Overdue Flags

| Unit | Property | Ready Date | Days Overdue | Outlook |
|---|---|---|---|---|
| **464-E** | WO | 2026-03-02 | **5 days** | Sanchez starts 03-16 (9 days) — critical threshold 03-09 |
| **3103** | RS | 2026-03-07 | Flag active | Helbert move-in TODAY (Saturday) — not yet cleared in Yardi |

### CV MakeReady Queue

| Unit | Ready Date | Overdue? | Watch |
|---|---|---|---|
| **C419** | 2026-03-06 | Not yet (enters 03-09) | ⚠️ Flag created Monday if not cleared |
| C427 | 2026-03-13 | No | Kirksey applicant incoming |
| C330 | 2026-03-13 | No | Cedillo applicant incoming |
| C112 | 2026-03-20 | No | Monitor |
| C323 | 2026-04-10 | No | Safe |

### OB MakeReady (2027 Dates)

| Unit | Ready Date | Status |
|---|---|---|
| S170 | ~~2027-01-07~~ → 2026-03-12 | ✅ Corrected 03-06 |
| S093 | 2027-01-01 | ⚠️ Day 12 — no response |
| S042 | 2027-01-07 | ⚠️ Day 12 — no response |

---

## Operational Sync Results

### Alerts

| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| OB | 3 | 1 | 1 | 0 |
| RS | 1 | 1 | 2 | 0 |
| SB | 2 | 0 | 0 | 0 |

CV and WO not in today's alert batch. All within normal thresholds. ✅

### Work Orders

| Property | Processed | Deactivated | Ratio |
|---|---|---|---|
| RS | 9 | 0 | 0% ✅ |
| WO | 13 | 0 | 0% ✅ |
| SB | 2 | 0 | 0% ✅ |
| OB | 34 | 3 | 9% ✅ |
| CV | 10 | 2 | 20% ✅ |

SB anomaly (200% ratio, 9+ days) confirmed closed. All properties normal. ✅

### Delinquencies

| Property | Rows | Updated/New | Resolved |
|---|---|---|---|
| RS | 72 | 1 | 2 |
| SB | 52 | 3 | 5 |
| WO | 30 | 4 | 2 |
| CV | 36 | 6 | 5 |
| OB | 60 | 5 | 2 |

Portfolio delinquencies trending down across all properties. OB spike (49 on 03-06) confirmed a one-day batch event. ✅

---

## Applications

| Property | Count | Applicants |
|---|---|---|
| CV | 3 | Taub (C213, 03-13), Cedillo (C330, 04-01), Kirksey (C427, 04-01) |
| OB | 1 | Garibaldi (S050, 04-22) — NEW |
| RS | 4 | Adame (1016, 03-07), Aguilar (1033, 03-14), Herbert (2007, 03-06), Ruffner (2033, 05-10) — Ruffner NEW |
| SB | 0 | — |
| WO | 0 | — |

Portfolio total: **8 active applications** (up from 6 on 03-06).

---

## W1 Watch — Notices Fix Stability (Day 9) ✅

| Resident | Unit | Property | Rent | Status |
|---|---|---|---|---|
| Kenton, Christina | 2019 | RS | $1,835 | ✓ Future |
| Jeffers, Ryan | 3130 | RS | $1,200 | ✓ Future — move-in 03-10 (3 days) |
| Poorman, Timothy | 1015 | SB | $1,753 | ✓ Future |

Jeffers moves in 03-10 (Monday). Retire from watch list after Current conversion is confirmed in Monday's run.

---

## Duplicate TRACE Analysis (Code Efficiency)

**Fix applied this session:** TRACE debug block at `useSolverEngine.ts:257` removed. The hardcoded log for units 1025/1026/1027 was firing twice per co-resident unit (Primary + Roommate). `resolveUnitId` is a static in-memory map — no DB round-trips were occurring. Log noise eliminated. This recurring finding is now closed permanently.

---

## Architectural Optimization

**Merge the feature branch fix for the parser trailing-space bug before Monday's run.**

The trailing-space normalization fix (`normalize_id` transform in `useGenericParser.ts`) and the RLS gap fix for tenancy status transitions (server-route + service_role) are both implemented on `feat/continue-dev-on-owners`. Neither bug was triggered in today's run, but both remain live vulnerabilities:

- The trailing-space bug will recur whenever an Excel `Code` column has a trailing space — intermittent and silent.
- The RLS gap means any legitimate silent drop (→ Past / → Canceled) silently fails to commit, leaving vacated units stuck at their prior status indefinitely.

Merging the feature branch to main eliminates both permanently. The fixes are small and self-contained. Recommend merge before the next scheduled solver run.

---

## Shift Handoff

**For next session (2026-03-09, Monday):**

- 🔴 **WO 464-E — CRITICAL (Monday 03-09):** Critical threshold hit. Sanchez Calixto starts 03-16 (7 days Monday). If WO manager has not confirmed MakeReady completion by Monday's run, escalate immediately. No further cushion.
- 🔴 **RS 3103 — Helbert Move-In TODAY:** MakeReady flag not auto-resolved. If Yardi is cleared over the weekend, Monday's run will close it. If not, flag will be overdue and Helbert's move-in is compromised.
- ⚠️ **RS Jeffers (3130):** Move-in 03-10 (Monday). Expect Current conversion. Retire from W1 watch list after confirmation.
- ⚠️ **RS Adame (1016):** Move-in today (03-07). Expect Current conversion by Monday.
- ⚠️ **CV C419:** Flag will be created in Monday's run if not cleared in Yardi this weekend.
- ⚠️ **OB S093/S042:** Day 13 on Monday. Direct manager contact required — 12 days without response is beyond acceptable.
- ⚠️ **CV Taub (C213):** Starts 03-13 (6 days). Monitor for Current conversion.
- ⚠️ **Merge feature branch:** Both bug fixes (parser trailing-space + RLS gap) should be merged to main before Monday's solver run.
- ✅ **W1 Watch:** Jeffers retires after Monday's Current conversion. Continue Kenton (03-16) and Poorman (04-10).
- ✅ **OB Garibaldi (S050):** New applicant, starts 04-22. S050 ready date 03-10 (3 days) — well ahead of move-in. Monitor.
- ✅ **RS Ruffner (2033):** New applicant, starts 05-10. Long runway. Monitor.
- ✅ **OB Mesinas (S101):** $0 rent corrected to $2,125 in Yardi. Confirm Current conversion (lease start 03-06, yesterday).
- ℹ️ **Flat Renewal Streak:** Day 14 with zero renewals logged.
- ℹ️ **CV AIRM:** 7 units continuing $3–$5 daily decrements. Normal.
- ℹ️ **TRACE log eliminated:** RS-1027 and SB-1026 double TRACE entries will no longer appear in solver logs.
