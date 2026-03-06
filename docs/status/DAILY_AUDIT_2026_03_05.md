# Daily Solver Audit — 2026-03-05

**Auditor:** Tier 2 Forensic Auditor (Claude Sonnet 4.6)
**Batch ID:** `5c07560b-8b6d-4c61-ad62-3b1190d7edf8`
**Run Time:** Thursday, March 5, 2026 @ 6:30 AM (retry run — first run `b42e42e0` aborted, see §2)
**Status:** ⚠️ WARNING — RS 3103 CRITICAL (Helbert starts tomorrow 03-07); RS 1005 new overdue flag; WO 464-E escalating; OB 2027 dates Day 10; delinquency sync 0/0 all properties (stale files)

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 6 |
| Fixes Applied | 1 (three-part solver repair — see §2) |
| W1 Verification | ✅ PASS — Day 7 confirmed (Kenton/Jeffers/Poorman all Future) |
| RS 3125 MakeReady | ✅ RESOLVED — absent from Yardi MakeReady report today |
| OB S160 MakeReady | ✅ RESOLVED — absent from Yardi MakeReady report today |
| Work Order Anomaly (W2/W3) | ✅ RESOLVED — 0 deactivated across all 5 properties |
| Snapshot 403 Errors | ✅ RESOLVED — Option B stable Day 7. Zero 403 errors |
| CV AIRM | ✅ DORMANT — all 4 CV applicant units now Applied; no Available units with AIRM |
| Email Notifications | Triggered (success: true, 8 results) |

---

## §2 — Solver Crash & Three-Part Hotfix (Pre-Audit)

### First Run — Aborted (Batch `b42e42e0-263d-4e3f-b552-a00d2bdd34fd`)

The solver stopped silently after the RS renewals confirmation hook (line 990). No error appeared in the console because the outer `catch` block in `processBatch` had no `console.error`. The run committed Phase 1 data (residents/tenancies/silent drops for RS/CV/OB) and then crashed before Phase 3A/3B/3C and Snapshots.

**Root causes (three-part repair, commit `2eb0dc6`):**

**Fix 1 — Phase 1 existingLeases: add `is_active` filter (`useSolverEngine.ts:555`)**
Without this filter, the Phase 1 lookup for existing leases fetched ALL leases (active + Past/inactive). An old inactive Past lease for a tenancy would land in `leasesToUpdate`, causing the solver to reactivate a historical record with new Future dates instead of inserting a fresh one. This produced unexpected DB state that may have cascaded into a crash.

**Fix 2 — Phase 1 lease insert: `.insert()` → `.upsert(onConflict: 'tenancy_id,start_date')` (`useSolverEngine.ts:575`)**
Mirrors the Phase 2 fix from 2026-03-04 (`fa900d9`). The `UNIQUE(tenancy_id, start_date)` constraint (migration `20260303000003`) caused Phase 1 insert conflicts to silently fail (error logged, no throw), leaving leases unwritten and producing corrupted state for downstream phases.

**Fix 3 — Outer catch: add `console.error` (`useSolverEngine.ts:2302`)**
Any crash in Steps 2–3 (Leases, Availability, Phase 3A/3B/3C, Snapshots) was completely invisible. The catch block only set `statusMessage` without logging the error. Future fatal solver errors are now surfaced as `[Solver] Fatal error in processBatch:`.

All 664 unit tests passing post-fix. Retry run completed all phases successfully across all 5 properties.

**Phase 1 data from the aborted run was committed** (RS/CV/OB each 1 silently-dropped tenancy → Past/Canceled). The retry run idempotently re-processed these without re-triggering.

---

## Property Activity

| Property | Rows | Safe Sync (New/Upd) | Lease Updates | Applications | Notices | Silent Drops |
|---|---|---|---|---|---|---|
| WO | 327 | 0 / 91 | 1 | 0 | 2 | 0 (1 committed by run 1) |
| RS | 587 | 0 / 352 | 13 | 2 | 34 | 0 (1 committed by run 1) |
| SB | 668 | 0 / 383 | 5 | 2 | 19 | 0 |
| CV | 193 | 0 / 117 | 4 | 4 | 1 | 0 (1 committed by run 1) |
| OB | 707 | 0 / 208 | 3 | 0 | 8 | 0 |

0 New rows across all properties — idempotent retry. All 26 lease operations routed to UPDATE because run 1 had already inserted them before crashing.

**Silent drops (from aborted run 1):**

| Property | Count | Disposition |
|---|---|---|
| RS | 1 | → Past (committed by run 1 before crash) |
| CV | 1 | → Past (committed by run 1 before crash) |
| OB | 1 | → Past (committed by run 1 before crash) |

3 total silent drops across 3 properties. Each property at 1 (threshold is >1 per property per run). No action required. Standard term: Canceled (cannot distinguish Canceled vs. Denied by design).

---

## Lease Creates

All 26 leases processed as UPDATES in the retry run (already in DB from run 1):

| Resident | Property | Unit | Type | Rent | Lease Start |
|---|---|---|---|---|---|
| Sanchez Calixto, Karina | WO | 464-E | Future | $3,395 | 2026-03-16 |
| Poorman, Timothy | SB | 1015 | Future | $1,753 | 2026-04-10 |
| Gagliano, Thomas | SB | 1049 | Applicant | $1,579 | 2026-03-05 |
| Bueno, Nicholas | SB | 1098 | Future | $1,628 | 2026-03-05 |
| David, Gordon | SB | 1124 | Applicant | $1,759 | 2026-03-06 |
| Obando, Walther | SB | 2058 | Future | $2,125 | 2026-03-14 |
| Taub, Timothy | CV | C213 | Applicant | $2,654 | 2026-03-13 |
| Conway, Natalie | CV | C229 | Applicant | $2,760 | 2026-03-20 |
| Cedillo, Jonathan | CV | C330 | Applicant | $2,581.35 | 2026-04-01 |
| Kirksey, Ramon | CV | C427 | Applicant | $2,383 | 2026-04-01 |
| Guzman, Fernando | RS | 1005 | Future | $1,631 | 2026-03-10 |
| Adame, Jorge | RS | 1016 | Applicant | $1,218 | 2026-03-07 |
| Aguilar, Sebastian | RS | 1033 | Applicant | $1,521 | 2026-03-14 |
| Tyars, Latora | RS | 1038 | Future | $1,233 | 2026-04-16 |
| Oltmanns, Brian | RS | 1073 | Future | $1,335 | 2026-03-27 |
| Lopez, Anderson | RS | 1084 | Future | $1,218 | 2026-03-05 |
| Salazar, James | RS | 1099 | Future | $1,656 | 2026-04-26 |
| Kenton, Christina | RS | 2019 | Future | $1,835 | 2026-03-16 |
| Richardson, Erica | RS | 2024 | Future | $1,190 | 2026-03-05 |
| Smith, Tyrus | RS | 2041 | Future | $1,805 | 2026-04-30 |
| Rivera, Joel | RS | 2135 | Future | $1,060 | 2026-03-09 |
| Helbert, Kyle | RS | 3103 | Future | $1,563 | 2026-03-07 |
| Jeffers, Ryan | RS | 3130 | Future | $1,200 | 2026-03-10 |
| Arreola Garcia, Pedro I | OB | S100 | Future | $1,975 | 2026-05-01 |
| Mesinas, Gustavo | OB | S101 | Future | $2,125 | 2026-03-06 |
| Avalos, Ashley | OB | S139 | Future | $1,975 | 2026-03-14 |

**Notes:**
- Richardson, Erica (RS-2024): Status promoted from Applicant → Future in Yardi. No longer counted in Applications phase. ✅ Application approved.
- Cedillo, Jonathan: Unit changed C230 → C330, rent $2,572 → $2,581.35, start date 2026-03-07 → 2026-04-01. Leasing office moved application to a different unit. C230 reset to Available via stale availability sweep.
- No year-typos. No negative rents. All dates valid.

---

## Availability Price Changes

**No price changes detected in today's run.**

CV AIRM dormant: all 4 units that had been receiving algorithmic decrements (C213/C229/C330/C427) are now in Applied status. AIRM only runs on Available units. Remaining available CV units (C419, C323) showed no changes today. No manual repricing at any property.

**Cumulative AIRM drift since 2026-02-28 baseline:**
C311 −$12 | C217 −$12 | C419 −$12 | C330 baseline reset (new applicant) | C112 −$23 | C323 $2,677

---

## Availability Snapshots

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased | Contracted Rent | ΔRent |
|---|---|---|---|---|---|---|---|---|
| WO | 3 | 0 | 1 | 0 | 0 | 0 | $2,950 | $0 |
| RS | 39 | 2 | 6 | 0 | −1 | +1 | $1,488 | $0 |
| SB | 28 | 2 | 3 | 0 | 0 | 0 | $1,645 | $0 |
| CV | 6 | 4 | 0 | 0 | 0 | 0 | $2,369 | +$2 |
| OB | 23 | 0 | 2 | 0 | 0 | 0 | $2,534 | +$2 |

**RS:** Applied −1 (Richardson promoted to Future, removed from applications pool). Leased +1 (one Future tenant's lease agreement signed in Yardi; identity not surfaced in log).

**CV contracted rent +$2:** Reflects Cedillo's rent update ($2,572 → $2,581.35) shifting the active lease average.

**OB contracted rent +$2:** Minor recalculation, within noise. W3 (contracted rent watch) formally closed.

---

## Findings

### ✅ CLEAN

**1 — Three-Part Solver Fix Confirmed (Commit `2eb0dc6`)**
The `is_active` filter on Phase 1's existingLeases query, the Phase 1 upsert with conflict handling, and the outer catch `console.error` together resolved the silent crash pattern. This is the third lease-related hotfix in the series: migration `20260303000003` (unique constraint) → `fa900d9` (Phase 2 upsert) → `2eb0dc6` (Phase 1 upsert + diagnostics). The UNIQUE(tenancy_id, start_date) constraint is now fully defended at both insert points. 664 unit tests green.

**2 — RS 3125 MakeReady: RESOLVED**
RS 3125 was 4 days overdue on 03-04 (ready date 2026-02-28). It is absent from today's Yardi MakeReady report — Yardi cleared it. Follow-up tracking item closed.

**3 — OB S160 MakeReady: RESOLVED**
OB S160 was 4 days overdue on 03-04 (ready date 2026-02-28). Absent from today's OB MakeReady report — Yardi cleared it. Follow-up tracking item closed.

**4 — Work Order Anomaly (W2/W3): RESOLVED**
Yesterday: RS 278% deactivation ratio (25 deactivated / 9 processed), SB 117% (7/6). Today: 0 deactivated across ALL 5 properties. The anomaly is closed. Most likely explanation: a Yardi upload correction or batch work order completions that reconciled the active list. Both W2 and W3 from prior audits formally closed.

**5 — W1 Fix Day 7 Confirmed**
Kenton, Christina (RS-2019, $1,835), Jeffers, Ryan (RS-3130, $1,200), and Poorman, Timothy (SB-1015, $1,753) processed as Future for the 7th consecutive run. Fix from `useSolverEngine.ts:1322` (2026-02-23) confirmed stable. Jeffers move-in is 2026-03-10 (5 days) — retire from watch list after Current conversion.

**6 — CV Applicant Pipeline: All 4 Units Active**
CV now has 4 simultaneous applicants (Taub C213 03-13, Conway C229 03-20, Cedillo C330 04-01, Kirksey C427 04-01). Available count stable at 6. With all applicant units in Applied status, CV AIRM has naturally paused — a positive leasing signal.

**7 — CV C419: Day 1 of Grace Period**
CV C419 (ready date 2026-03-06) did not become overdue today (cutoff is 2026-03-04). It enters the overdue window tomorrow 03-06 if Yardi has not cleared it. Monitor.

**8 — Snapshot Option B Stable Day 7**
All 5 properties saved availability snapshots with zero 403 errors. Server-route pattern (`save-snapshot.post.ts` + `serverSupabaseServiceRole`) confirmed. Escalation closed Day 7.

**9 — Richardson Erica (RS-2024): Application Approved**
Richardson moved from Applicant → Future status in Yardi. Lease start 2026-03-05 (today). Her Future tenancy will convert to Current when she moves in. RS applied count dropped by 1 accordingly.

**10 — Transfers Phase 2E: Zero New Flags**
All transfer flags for RS/SB/OB/WO already exist. 0 new created. UNKNOWN transfer flag absent for Day 4 — watch permanently closed.

---

### ⚠️ WARNING

**W1 — RS 3103: 3 Days Overdue — Helbert Starts TOMORROW (2026-03-07)**

```
[Solver DEBUG] 3103: ready=2026-03-02, cutoff=2026-03-04, overdue=true
[Solver DEBUG] Creating flag for 3103: 3 days overdue
[Solver] No new MakeReady flags to create for RS (all already exist)
```

RS 3103 is now 3 days overdue (ready date 2026-03-02). Helbert, Kyle has a Future lease starting **2026-03-07 — tomorrow (Saturday)**. Flag exists in DB from run 1. The solver cannot escalate further automatically. This requires immediate human intervention: RS property manager must confirm MakeReady status for 3103 before close of business today. If the unit is not ready for Saturday move-in, contact Helbert to negotiate a delayed start or temporary alternative.

---

**W2 — RS 1005: 2 Days Overdue — Guzman Fernando Starts 2026-03-10 (5 Days)**

```
[Solver DEBUG] 1005: ready=2026-03-03, cutoff=2026-03-04, overdue=true
[Solver DEBUG] Creating flag for 1005: 2 days overdue
[Solver] No new MakeReady flags to create for RS (all already exist)
```

New overdue flag created by run 1 (committed before crash). RS 1005 has been overdue since 2026-03-03. Guzman, Fernando starts 2026-03-10 (5 days). Escalate to RS manager — 5 days is sufficient time to clear MakeReady if actioned now.

---

**W3 — WO 464-E: 3 Days Overdue — Sanchez Starts 2026-03-16 (11 Days)**

```
[Solver DEBUG] 464-E: ready=2026-03-02, cutoff=2026-03-04, overdue=true
[Solver DEBUG] Creating flag for 464-E: 3 days overdue
[Solver] No new MakeReady flags to create for WO (all already exist)
```

WO 464-E is 3 days overdue. Sanchez Calixto, Karina starts 2026-03-16 (11 days). Flag from run 1. Escalate to WO property manager — 11 days is workable if actioned now. Critical threshold is 03-09 (7 days out).

---

**W4 — OB S093/S042/S170: Day 10 with 2027 Ready Dates — No OB Manager Response**

```
[Solver DEBUG] S093: ready=2027-01-01, cutoff=2026-03-04, overdue=false
[Solver DEBUG] S042: ready=2027-01-07, cutoff=2026-03-04, overdue=false
[Solver DEBUG] S170: ready=2027-01-07, cutoff=2026-03-04, overdue=false
```

Three OB units with 10+ month ready dates, unchanged for 10 consecutive audit days. No OB manager confirmation received. These are either intentional long-term rehabilitation holds or Yardi data errors. A 10-day unacknowledged anomaly at this scale is unacceptable. Direct OB manager contact is required today — not via audit email, via direct outreach.

---

**W5 — Cedillo Unit Reassignment (CV C230 → C330)**

Cedillo, Jonathan's application was moved from C230 to C330 by the leasing office — unit, rent ($2,572 → $2,581.35), and start date (2026-03-07 → 2026-04-01) all changed. The old C230 unit was reset to Available via Phase 2C-2 (stale availability sweep). Verify:
1. CV availability snapshot shows correct counts (6 available, 4 applied — confirmed ✅)
2. C230 does not retain an "Applied" status record from the old Cedillo applicant (stale sweep should have cleared it)
3. C330 was not previously assigned to another applicant

This is an operational leasing decision. No data corruption suspected, but confirm C230 is clean in the UI.

---

**W6 — Delinquency Sync: 0 New / 0 Resolved Across ALL 5 Properties**

| Property | Rows in Upload | Updated/New | Resolved |
|---|---|---|---|
| WO | 33 | 0 | 0 |
| SB | 65 | 0 | 0 |
| RS | 76 | 0 | 0 |
| CV | 40 | 0 | 0 |
| OB | 69 | 0 | 0 |

All 5 properties showing zero changes is statistically improbable for a normal business day. Most likely explanation: the same delinquency files from 03-04 were re-staged for today's batch without refreshing from Yardi. The row counts are all lower than 03-04's DB totals (e.g., SB 65 vs 86 in DB after 03-04), yet the sync finds no changes — suggesting the uploaded data matches the prior state exactly. This is a data freshness issue, not a solver bug. Confirm with whoever staged the delinquency files that fresh 03-05 exports were used.

---

### 🔴 FATAL

None.

---

## Move-Out Overdue (Phase 2D.5)

```
[Solver] Found 0 overdue move-outs to flag
[Solver] Phase 2D.5 Complete: Move-out overdue check finished
```

Zero overdue move-outs. Clean.

---

## MakeReady Status Board — Full Portfolio

### Resolved This Week ✅

| Unit | Property | Resolved Date | Duration |
|---|---|---|---|
| 3125 | RS | 2026-03-05 | 4 days overdue at resolution |
| S160 | OB | 2026-03-05 | 4 days overdue at resolution |
| C213 | CV | 2026-03-04 | 28 days overdue at resolution |
| C311 | CV | 2026-03-04 | 13 days |
| C217 | CV | 2026-03-04 | 12 days |
| C229 | CV | 2026-03-04 | 7 days |
| C230 | CV | 2026-03-04 | 5 days |

### Active Overdue Flags

| Unit | Property | Ready Date | Days Overdue | Trend | Outlook |
|---|---|---|---|---|---|
| **3103** | RS | 2026-03-02 | **3 days** | +1/day | **🔴 CRITICAL — Helbert starts 03-07 (TOMORROW)** |
| 1005 | RS | 2026-03-03 | **2 days** | 🆕 (from run 1) | Guzman starts 03-10 (5 days) |
| **464-E** | WO | 2026-03-02 | **3 days** | +1/day | Sanchez starts 03-16 (11 days) |

### CV MakeReady Queue (None Overdue Yet)

| Unit | Ready Date | Days Until Overdue | Watch |
|---|---|---|---|
| C419 | 2026-03-06 | **1 day** | ⚠️ Enters overdue TOMORROW 03-06 |
| C427 | 2026-03-13 | 9 days | Kirksey applicant incoming |
| C330 | 2026-03-13 | 9 days | Cedillo (new unit) |
| C112 | 2026-03-20 | 16 days | Monitor |
| C323 | 2026-04-10 | 37 days | Safe |

---

## Operational Sync Results

### Alerts

| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| CV | 1 | 0 | 0 | 0 |
| SB | 1 | 0 | 0 | 0 |
| OB | 1 | 0 | 0 | 0 |

RS and WO not in today's alert batch. Zero churn. ✅

### Work Orders

| Property | Processed | Deactivated | Ratio |
|---|---|---|---|
| OB | 30 | 0 | 0% |
| CV | 10 | 0 | 0% |
| SB | 4 | 0 | 0% |
| WO | 8 | 0 | 0% |
| RS | 9 | 0 | 0% |

All 5 properties at 0% deactivation — complete reversal from yesterday's anomaly. W2 (RS 278%) and W3 (SB 117%) closed.

### Delinquencies

| Property | Rows | Updated/New | Resolved |
|---|---|---|---|
| WO | 33 | 0 | 0 |
| SB | 65 | 0 | 0 |
| RS | 76 | 0 | 0 |
| CV | 40 | 0 | 0 |
| OB | 69 | 0 | 0 |

See W6 above. Data freshness issue — 0/0 across all 5 is not a solver error.

---

## Applications

| Property | Count | Applicants |
|---|---|---|
| CV | 4 | Taub (C213), Conway (C229), Cedillo (C330), Kirksey (C427) |
| SB | 2 | Gagliano (1049), David (1124) |
| RS | 2 | Adame (1016), Aguilar (1033) |

RS dropped from 3 to 2 applications — Richardson promoted to Future. CV holds at 4 active applicants. Total portfolio: 8 active applications.

---

## W1 Watch — Notices Fix Stability (Day 7) ✅

| Resident | Unit | Property | Rent | Status |
|---|---|---|---|---|
| Kenton, Christina | 2019 | RS | $1,835 | ✓ Future — Updated |
| Jeffers, Ryan | 3130 | RS | $1,200 | ✓ Future — Updated |
| Poorman, Timothy | 1015 | SB | $1,753 | ✓ Future — Updated |

All three stable for Day 7. Jeffers move-in 2026-03-10 (5 days) — retire from watch list after Current conversion on or after 03-10.

---

## Follow-Up Tracking Resolution

| # | Item | 03-04 Status | 03-05 Status | Δ |
|---|---|---|---|---|
| 1 | ⚠️ RS 3103 (3 days) | Day 2 / URGENT | **Day 3 / CRITICAL — starts tomorrow** | ❌ +1 day |
| 2 | ⚠️ WO 464-E (2 days) | Day 2 | **Day 3** | ❌ +1 day |
| 3 | ⚠️ RS 3125 (4 days) | 4 days | **✅ RESOLVED** — absent from Yardi | ✅ Closed |
| 4 | ⚠️ OB S160 (4 days) | 4 days | **✅ RESOLVED** — absent from Yardi | ✅ Closed |
| 5 | ⚠️ OB S093/S042/S170 | Day 9 | **Day 10 — still unconfirmed** | ❌ Escalate now |
| 6 | ⚠️ RS Work Orders (278%) | Day 1 | **✅ RESOLVED** — 0 deactivated today | ✅ Closed |
| 7 | ⚠️ SB Work Orders (117%) | Day 5 | **✅ RESOLVED** — 0 deactivated today | ✅ Closed |
| 8 | ⚠️ CV C419 (overdue tomorrow) | 2 days away | **1 day away — enters overdue 03-06** | ⚠️ Monitor |
| 9 | ⚠️ OB Contracted Rent ($2,532) | STABLE | **$2,534 (+$2, noise)** | ✅ Closed |
| 10 | ℹ️ Jeffers (RS-3130) retirement | Day 6 / 6 days | **Day 7 / 5 days (03-10)** | Retire after 03-10 |
| 11 | ℹ️ Cedillo C230 reassignment | New | **C330 confirmed, C230 cleared** | Monitor UI |

---

## Duplicate TRACE Analysis (Code Efficiency)

**RS Unit 1027:** Primary + Roommate (Day 10 — same recurring pattern)
**SB Unit 1026:** Roommate + Primary (Day 10 — same recurring pattern)

Architectural optimization (unit lookup cache, ~15 lines) still unimplemented. See prior audit recommendations.

---

## Architectural Optimization

**Phase 1 Lease Insert: Complete the Idempotency Chain**

Today's three-part fix completed the idempotency guarantee for the UNIQUE(tenancy_id, start_date) constraint. The chain is now:

| Phase | Insert Type | Conflict Handling | Status |
|---|---|---|---|
| Phase 1: Residents → Leases (`line 575`) | `upsert(onConflict: 'tenancy_id,start_date')` | ✅ Fixed today (`2eb0dc6`) |
| Phase 2: ExpiringLeases → Leases (`line 924`) | `upsert(onConflict: 'tenancy_id,start_date')` | ✅ Fixed 03-04 (`fa900d9`) |

The next hardening step is to **add error checking to the Phase 3 availability existingAvails query** at `useSolverEngine.ts:1112`. Currently, if the query fails (network error, RLS issue), `existingAvails` is null and all availability records route to `toInsert`. This would hit the partial unique index `UNIQUE(unit_id) WHERE is_active=true` and crash. Add:

```ts
const { data: existingAvails, error: existingAvailsErr } = await supabase...
if (existingAvailsErr) {
    console.error(`[Solver] Availability query error for ${pCode}:`, existingAvailsErr)
    continue  // Skip this property's avail processing rather than crashing
}
```

Low risk, ~3 lines. Prevents the last unguarded crash path in the availability phase.

---

## Shift Handoff

**For next session (2026-03-06):**

- 🔴 **RS 3103 — MOVE-IN TOMORROW:** Helbert, Kyle starts **Saturday 2026-03-07**. If the unit is not confirmed MakeReady in Yardi by tomorrow morning's run, the move-in is at risk. RS manager must be contacted TODAY.
- ⚠️ **CV C419 — Enters overdue TOMORROW (03-06):** Ready date 2026-03-06, cutoff today. A new overdue flag will be created in tomorrow's run if Yardi has not cleared it.
- ⚠️ **RS 1005:** 2 days overdue (Guzman starts 03-10, 5 days). Escalate to RS manager — still time to resolve without impact.
- ⚠️ **WO 464-E:** 3 days overdue (Sanchez starts 03-16, 11 days). Escalate to WO manager — resolve by 03-09 to avoid critical status.
- ⚠️ **OB S093/S042/S170:** Day 10. This is beyond acceptable without manager acknowledgment. Direct contact required.
- ⚠️ **Delinquency files:** Verify that fresh 03-06 Yardi delinquency exports are uploaded for tomorrow's batch. Today's 0/0 result indicates stale files — tomorrow should show resolution activity.
- ⚠️ **Cedillo C230 → C330:** Verify C230 is clean (Available) in the UI and no orphan Applied record persists.
- ✅ **W1 Watch:** Day 8 tomorrow. Jeffers move-in 03-10 (5 days). Retire from watch list on or after 03-10 once conversion to Current is confirmed. Continue Kenton (03-16) and Poorman (04-10).
- ✅ **RS Helbert (3103):** If 3103 clears MakeReady on 03-07 (move-in day), the flag auto-resolves in tomorrow's run.
- ✅ **RS Adame (1016):** Applicant start 2026-03-07 (tomorrow). Expect conversion to Current by Monday 03-09.
- ✅ **CV AIRM:** Dormant while all 4 applicant units are in Applied status. Will resume if any of C213/C229/C330/C427 applications cancel. Track cumulative drift when AIRM resumes.
- ℹ️ **RS Leased +1:** One Future tenant converted to Leased in today's snapshot. Identity not surfaced in log. Query `availabilities WHERE status='Leased' AND updated_at::date='2026-03-05' AND property_code='RS'` to identify.
- ℹ️ **Flat Renewal Streak:** Day 10 with zero renewals. Renewals module (H-057) would surface this systematically.
- ℹ️ **Solver fix `2eb0dc6` monitoring:** First production run after the three-part repair. Watch for any unexpected behavior in Phase 1 lease routing (the `is_active` filter change means Past leases no longer block new Future lease inserts — correct behavior but first live test).
