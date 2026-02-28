# Daily Audit — 2026-02-28

**Batch ID:** `2e1c86ae-d16c-42d1-9d0d-83f6a4b4c69f`
**Run time:** 2026-02-28 at 7:32 AM
**Auditor:** Tier 2 Data Architect (Automated)
**Branch:** feat/mobile-ui

---

## Executive Summary

| Status | Count |
|---|---|
| ✅ CLEAN | 9 |
| ⚠️ WARNING | 3 |
| 🔴 FATAL | 0 |

System healthy. All 5 snapshots saved (Option B Day 2 confirmed). Notices fix stable (Day 5). Two urgent MakeReady flags resolved by ops. No fatal errors or auth failures.

> **Correction (post-audit):** W2 (originally "SB Unit 3125 stale MakeReady") was a misidentification. `3125: ready=2026-02-28` belongs to **RS unit 3125** (status: Past — legitimate vacant unit), not SB. SB unit 3125 is not in any MakeReady staging data. No false flag risk exists. W2 has been removed and RS-3125 is noted as expected behavior below.

---

## ✅ CLEAN

### 1 — Availability Snapshots (Option B, Day 2)

All 5 properties returned `✓ Availability snapshot saved` with zero 403 errors. Option B server route confirmed stable for a second consecutive run.

| Property | Available | Applied | Leased | Contracted Rent | Δ Rent |
|---|---|---|---|---|---|
| CV | 7 | 2 | 0 | $2,364 | +$2 |
| RS | 36 | 3 | 4 | $1,489 | -$1 |
| SB | 26 | 0 | 4 | $1,642 | = |
| OB | 21 | 0 | 2 | $2,527 | = |
| WO | 2 | 0 | 1 | $2,945 | = |

CV's +$2 contracted rent is counterintuitive given 7 AIRM decrements — driven upward by new Applicant leases for Taub ($2,654) and Kirksey ($2,383) shifting the average.

---

### 2 — Notices Processor Fix — Stable (Day 5)

All three W1 watch-list tenancies processed correctly as Future (not corrupted to Notice):

| Resident | Unit | Tenancy | Rent | Move-In |
|---|---|---|---|---|
| Kenton, Christina | RS-2019 | t3382793 | $1,835 | 2026-03-16 |
| Jeffers, Ryan | RS-3130 | t3389559 | $1,200 | 2026-03-10 |
| Poorman, Timothy | SB-1015 | t0715042 | $1,753 | 2026-04-10 |

Jeffers move-in is 10 days out — watch stays active through 2026-03-10.

---

### 3 — RS Unit 1027 MakeReady: Confirmed Ready ✅

Unit was flagged as 2 days overdue (`ready=2026-02-26`) with Sas, Anna (t3383056) move-in on **2026-03-02 (Sunday)**. Ops confirmed unit is physically ready. Move-in can proceed as scheduled.

---

### 4 — CV Unit C213 MakeReady: Confirmed Ready ✅

Unit flagged at **24 days overdue** (`ready=2026-02-04`). Ops physically inspected and confirmed unit is ready. Yardi has not been updated but the unit is move-in ready for Taub, Timothy (t3412293, $2,654) whose lease begins 2026-03-13.

---

### 5 — Data Sync — All Properties Clean

| Property | Rows | New | Updates | Leases Ins. | Leases Upd. |
|---|---|---|---|---|---|
| CV | 192 | 1 | 116 | 1 | 1 |
| RS | 588 | 0 | 353 | 0 | 13 |
| SB | 663 | 0 | 382 | 0 | 5 |
| OB | 718 | 0 | 211 | 0 | 4 |
| WO | 327 | 0 | 91 | 0 | 1 |

No failed phases. All properties completed all processing stages.

---

### 6 — Renewals

5 renewals archived today across RS and SB:

| Resident | Unit | Property | Old Rent | New Rent | Change |
|---|---|---|---|---|---|
| Davis, Cleshawna | 2036 | RS | $1,588 | $1,588 | = $0 |
| OConnor, Alex | 2133 | SB | $1,382 | $1,382 | = $0 |
| Yanez, Esperanza | 1012 | SB | $1,594 | $1,594 | = $0 |
| Bean, Austin | 1074 | SB | $1,504 | $1,504 | = $0 |
| McShan, Toya | 3125 | SB | $1,645 | $1,645 | = $0 (transfer — see W3) |

All five renewals are flat ($0 increase). See informational note on flat renewal streak below.

---

### 7 — SB Unit 3125: Transfer Correctly Processed ✅

McShan, Toya transferred from unit **2015 → 3125** on 2026-02-28. What appeared as a renewal archive for 3125 is Yardi's representation of the transfer. Unit 2015 (vacated) is now in the MakeReady pipeline (`ready=2026-04-04` — 5-week turn window). Unit 3125's MakeReady was correctly tracking the incoming transfer. Transfer processed cleanly.

> **Follow-up required:** SB-3125's MakeReady record (`ready=2026-02-28`) will become `overdue=true` in tomorrow's run since Toya has now moved in. The MakeReady flag should be manually resolved/deactivated to prevent a false overdue alert. See W3.

---

### 8 — Delinquencies & Operational Sync — Clean

All 5 properties: 0 updated/new, 0 resolved delinquencies. Month-end (Feb 28) — flat delinquency state is expected. Collections activity typically resumes early March.

**Alerts:**
| Property | Active | Added | Removed |
|---|---|---|---|
| RS | 2 | 1 | 1 |
| SB | 1 | 1 | 1 |
| CV | 1 | 1 | 3 |

CV net -2 alerts — AIRM-related churn as price engine adjusts. Normal.

**Work Orders:**
| Property | Processed | Deactivated |
|---|---|---|
| CV | 20 | 3 |
| RS | 24 | 5 |
| SB | 6 | 9 ⚠️ |
| OB | 36 | 6 |
| WO | 2 | 2 |

**Move-out overdue flags created:** 1 (within normal range).

---

## 💰 Availability Price Changes

| Unit | Property | Old Rent | New Rent | Change | % | Notes |
|---|---|---|---|---|---|---|
| C311 | CV | $2,449 | $2,447 | ↓ $2 | -0.1% | AIRM — normal |
| C217 | CV | $2,349 | $2,347 | ↓ $2 | -0.1% | AIRM — normal |
| C229 | CV | $2,805 | $2,800 | ↓ $5 | -0.2% | AIRM — normal |
| C230 | CV | $2,625 | $2,620 | ↓ $5 | -0.2% | AIRM — normal |
| C419 | CV | $2,209 | $2,207 | ↓ $2 | -0.1% | AIRM — normal |
| C330 | CV | $2,700 | $2,695 | ↓ $5 | -0.2% | AIRM — normal |
| C112 | CV | $2,675 | $2,670 | ↓ $5 | -0.2% | AIRM — normal |
| 3075 | RS | $1,591 | $1,581 | ↓ $10 | -0.6% | Manual reprice — informational |

**CV:** 7 AIRM micro-decrements ($2–$5) — expected daily behavior, no action required.
**RS:** Single manual adjustment (unit 3075, -$10). Operational decision, no action required.

---

## ⚠️ WARNING

### W1 — OB Unit S100: Yardi Date Anomaly (Day 2 — Correction Pending)

**Tenancy:** t2559309 — Arreola Garcia, Pedro I
```
lease_start_date: 2102-05-22  ← Should be 2026-05-22
lease_end_date:   2027-02-28
```
Leasing team has been notified. Correction expected by **Monday, 2026-03-02**. MakeReady for S100 is `ready=2026-03-10` — the 8-day window provides enough runway if the Yardi correction is applied Monday. The unit will not naturally activate without the correction (solver treats 2102 as a valid Future start, so it will never transition to Current).

**Deadline:** Must be corrected in Yardi before 2026-03-10.

---

### W2 — SB Work Orders: 9 Deactivated vs. 6 Processed (Day 3 Pattern)

| Date | Processed | Deactivated |
|---|---|---|
| 2026-02-26 | 6 | 7 |
| 2026-02-27 | — | — |
| 2026-02-28 | 6 | **9** |

Third consecutive day with SB deactivations exceeding active work orders. Likely reflects legitimate Yardi work order completions, but confirmation from SB property manager remains outstanding. If this pattern continues into next week, a batch upload gap should be investigated.

---

### W3 — Transfer Flag "UNKNOWN" Property Lookup Bug

```
[Solver] No new transfer flags to create for UNKNOWN (all already exist)
```

The property name is resolving as `UNKNOWN` instead of a property code in the transfer flag phase (Phase 2E). Flags are being found correctly (idempotent), so no data loss occurs, but the property identification is broken. Low-priority code bug — the property lookup in the transfer flag processor is likely missing a null-guard or the property map is not being passed correctly to that phase.

---

## ℹ️ INFORMATIONAL

### Flat Renewal Streak — 10 Consecutive Flat Renewals (5 Audit Days)

| Date | Resident | Unit | Property | Rent | Change |
|---|---|---|---|---|---|
| 2026-02-23 | Bausley, Edward | — | RS | $1,735 | $0 |
| 2026-02-25 | Burton, Eva | 2085 | RS | $1,400 | $0 |
| 2026-02-25 | Thomas, Kyra | 2021 | SB | $1,569 | $0 |
| 2026-02-26 | Esqueda, Sebastian | 2143 | SB | $1,624 | $0 |
| 2026-02-28 | Davis, Cleshawna | 2036 | RS | $1,588 | $0 |
| 2026-02-28 | OConnor, Alex | 2133 | SB | $1,382 | $0 |
| 2026-02-28 | Yanez, Esperanza | 1012 | SB | $1,594 | $0 |
| 2026-02-28 | Bean, Austin | 1074 | SB | $1,504 | $0 |
| 2026-02-28 | McShan, Toya | 3125 | SB | $1,645 | $0 (transfer) |

Zero rent increases across 9 true renewals (excl. transfer) over 5 days. Renewals worksheet module (H-057) is unimplemented — no system enforcement of rent escalation. Pattern spans both RS and SB. Surfacing to property managers as a potential revenue impact.

### OB S093/S042/S170: 2027 Ready Dates (Day 7 Unconfirmed)

| Unit | Ready Date | Days to Ready |
|---|---|---|
| S093 | 2027-01-01 | ~307 days |
| S042 | 2027-01-07 | ~313 days |
| S170 | 2027-01-07 | ~313 days |

No flags firing (correctly, as dates are future). OB manager confirmation still outstanding at Day 7. Background item — escalate if unconfirmed by end of next week.

---

## MakeReady Overdue Summary

| Unit | Property | Ready Date | Days Overdue | Status |
|---|---|---|---|---|
| C213 | CV | 2026-02-04 | **24 days** | ✅ Confirmed ready by ops |
| C311 | CV | 2026-02-19 | 9 days | Flag active — monitor |
| C217 | CV | 2026-02-20 | 8 days | Flag active — monitor |
| C229 | CV | 2026-02-25 | 3 days | Flag active |
| 2007 | RS | 2026-02-26 | 2 days | New flag — monitor |
| 1027 | RS | 2026-02-26 | 2 days | ✅ Confirmed ready (Sas, Anna Sun 3/2) |
| 3061 | RS | 2026-02-26 | 2 days | New flag — monitor |
| 3125 | RS | 2026-02-28 | 0 days today → 1 day tomorrow | Legitimate vacant unit (status: Past) — flag expected tomorrow |
| S081 | OB | 2026-02-24 | 4 days | Existing flag — escalate |

---

## Architectural Optimization

**Solver: Auto-resolve MakeReady on Transfer/Renewal Archive**

Today's SB-3125 scenario exposed a gap: when the solver archives a lease as Past (renewal or transfer), it does not check whether a MakeReady record exists for that unit and deactivate it. This creates false overdue flags the next day.

**Proposed fix:** In the lease archive phase (`Archived N leases as Past`), after each archive event, query `makeready_flags` for the affected unit and set `is_active = false` where the flag's incoming tenant matches the archived lease's tenant or the unit has a confirmed occupancy as of today. Estimated scope: ~15 lines in `useSolverEngine.ts` in the renewal processing block.

---

## Shift Handoff

**For next session (2026-03-01):**

1. **OB S100 / Arreola Garcia (W1):** Yardi correction expected Monday 2026-03-02. Confirm in Monday's audit. Deadline is before the 2026-03-10 make-ready date.

3. **CV C311/C217:** 9 and 8 days overdue respectively. Still no Yardi response. Escalate alongside C213 follow-up.

4. **Watch list — Jeffers, Ryan (RS-3130):** Move-in 2026-03-10 (10 days). Keep on watch through move-in date.

5. **Watch list — Kenton, Christina (RS-2019):** Move-in 2026-03-16. Keep on watch.

6. **RS-2007, RS-3061 MakeReady:** Both 2 days overdue, no incoming tenants imminent. Monitor for resolution in next 1–2 runs.

7. **W4 (UNKNOWN property transfer flag):** File as a low-priority bug when convenient. No data impact, but should be fixed.

8. **Flat renewal pattern:** 10 flat renewals over 5 days (RS + SB). Discuss with property managers — intentional retention strategy or missed escalation? Renewals module (H-057) implementation would address this systemically.

9. **Delinquencies:** Flat across all 5 properties at month-end. Expect resolution activity to resume early March — watch for first-of-month resolutions in Monday's run.

10. **SB Work Order deactivation pattern:** Day 3. If it continues into next week, request Yardi WO batch log from SB manager to confirm completions vs. upload gap.
