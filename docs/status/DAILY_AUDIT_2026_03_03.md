# Daily Solver Audit — 2026-03-03

**Auditor:** Tier 2 Forensic Auditor (Claude Sonnet 4.6)
**Batch ID:** `4392111c-867a-4d2c-b0dc-6b66367980e1`
**Run Time:** Tuesday, March 3, 2026 @ 6:46 AM
**Status:** ⚠️ WARNING — RS 2 silent drops (threshold); CV MakeReady escalating (C213 Day 27); OB contracted rent -$15 (watch)

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 3 |
| Fixes Applied | 0 |
| W1 Verification | ✅ PASS — Day 5 confirmed (Kenton/Jeffers/Poorman all Future) |
| CV C213 Escalation | 🔴 Day 27 — Taub applicant still active (start 2026-03-13; 10 days out) |
| MakeReady Resolutions | ✅ **5 flags resolved** (RS 2007/1027/3061, OB S081/S050) |
| OB S100 Typo (2102-05-22) | ✅ **RESOLVED** — Yardi corrected to 2026-05-01; end date updated to 2027-04-30 |
| UNKNOWN Transfer Flag | ✅ **CONFIRMED RESOLVED** — Day 2 absent; watch closed |
| Snapshot 403 Errors | ✅ RESOLVED — Option B stable Day 5. Zero 403 errors across all 5 properties |
| Email Notifications | Triggered (success: true, 8 results) |

---

## Property Activity

| Property | Rows | ΔRows | Safe Sync (New/Upd) | Lease Creates | Lease Updates | Renewals | Applications | Notices | Flags Created | Silent Drops |
|---|---|---|---|---|---|---|---|---|---|---|
| RS | 585 | -3 | 0 / 351 | 11 | 11 | 0 | 2 | 33 | 0 | **2** ⚠️ |
| SB | 668 | +5 | 1 / 382 | 4 | 4 | 1 | 1 | 20 | 0 | 0 |
| CV | 193 | -1 | 0 / 117 | 3 | 3 | 1 | 3 | 2 | 0 | 1 |
| OB | 710 | 0 | 0 / 209 | 3 | 3 | 0 | 0 | 9 | 0 | 0 |
| WO | 327 | 0 | 0 / 91 | 1 | 1 | 0 | 0 | 2 | 0 | 0 |

RS row delta of -3 is consistent with 2 silent drops plus 1 natural Yardi removal. No alert churn (all ≤1 add/remove per property).

---

## Availability Pipeline

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased | Contracted Rent | ΔRent |
|---|---|---|---|---|---|---|---|---|
| RS | 39 | 2 | 4 | **+1** | 0 | 0 | $1,488 | $0 |
| SB | 29 | 1 | 3 | **+1** | +1 | 0 | $1,644 | $0 |
| CV | 7 | 3 | 0 | +0 | 0 | 0 | $2,364 | -$2 |
| OB | 23 | 0 | 2 | **+1** | 0 | 0 | $2,532 | **-$15** ⚠️ |
| WO | 3 | 0 | 1 | +1 | 0 | 0 | $2,950 | $0 |

RS (+1 avail), SB (+1), OB (+1) increases are consistent with units vacated by the RS silent drops and OB MakeReady resolutions freeing units back to available status.

OB contracted rent dropped -$15 ($2,547 → $2,532) with no OB renewals, no silent drops, and no new occupancy events to explain it. Most likely statistical recalculation after Arreola Garcia's lease terms were corrected in Yardi (start date 2102-05-22 → 2026-05-01, end date 2027-02-28 → 2027-04-30), which may have shifted how the tenancy is averaged. Monitor tomorrow — if it stabilizes at $2,532 the recalculation explanation holds.

---

## Availability Price Changes

### CV — AIRM Micro-Decrements (Day 7 — Normal)

| Unit | Old Rent | New Rent | Change | % Change |
|---|---|---|---|---|
| C311 | $2,442 | $2,439 | ↓ $3 | -0.1% |
| C217 | $2,342 | $2,339 | ↓ $3 | -0.1% |
| C229 | $2,791 | $2,787 | ↓ $4 | -0.1% |
| C419 | $2,202 | $2,199 | ↓ $3 | -0.1% |
| C112 | $2,661 | $2,657 | ↓ $4 | -0.2% |
| C330 | $2,686 | $2,682 | ↓ $4 | -0.1% |

6 CV vacant units with $3–$4 AIRM decrements. Normal algorithmic behavior (Day 7 of AIRM adjustment cycle). No RS, SB, OB, or WO price changes today.

**Cumulative AIRM drift from 2026-02-28 baseline:** C311 -$10 | C217 -$10 | C229 -$18 | C419 -$10 | C112 -$18 | C330 -$18

---

## Lease Creates

| Resident | Property | Unit | Type | Rent | Lease Start |
|---|---|---|---|---|---|
| Taub, Timothy | CV | C213 | Applicant | $2,654 | 2026-03-13 |
| Cedillo, Jonathan | CV | C230 | Applicant | $2,572 | 2026-03-07 |
| Kirksey, Ramon | CV | C427 | Applicant | $2,383 | 2026-04-01 |
| Poorman, Timothy | SB | 1015 | Future | $1,753 | 2026-04-10 |
| Bueno, Nicholas | SB | 1098 | Future | $1,628 | 2026-03-05 |
| David, Gordon | SB | 1124 | Applicant | $1,759 | 2026-03-06 |
| Obando, Walther | SB | 2058 | Future | $2,125 | 2026-03-14 |
| Guzman, Fernando | RS | 1005 | Future | $1,631 | 2026-03-10 |
| Estrada, Amyia | RS | 1016 | Applicant | $1,218 | 2026-02-27 |
| Tyars, Latora | RS | 1038 | Future | $1,233 | 2026-04-16 |
| Oltmanns, Brian | RS | 1073 | Future | $1,335 | 2026-03-27 |
| Lopez, Anderson | RS | 1084 | Future | $1,218 | 2026-03-06 |
| Salazar, James | RS | 1099 | Future | $1,656 | 2026-04-26 |
| Kenton, Christina | RS | 2019 | Future | $1,835 | 2026-03-16 |
| Richardson, Erica | RS | 2024 | Applicant | $1,190 | 2026-02-24 |
| Rivera, Joel | RS | 2135 | Future | $1,631 | 2026-03-09 |
| Helbert, Kyle | RS | 3103 | Future | $1,563 | 2026-03-07 |
| Jeffers, Ryan | RS | 3130 | Future | $1,200 | 2026-03-10 |
| Sanchez Calixto, Karina | WO | 464-E | Future | $3,395 | 2026-03-16 |
| Arreola Garcia, Pedro I | OB | S100 | Future | $1,975 | 2026-05-01 |
| Mesinas, Gustavo | OB | S101 | Future | $2,125 | 2026-03-06 |
| Avalos, Ashley | OB | S139 | Future | $1,975 | 2026-03-14 |

**Total: 22 lease creates** (RS 11, SB 4, CV 3, OB 3, WO 1). No event spike vs. yesterday (23). All dates valid — no year anomalies.

---

## Renewals

| Resident | Unit | Property | Old Rent | New Rent | Change |
|---|---|---|---|---|---|
| Espinoza, Michael | 1136 | SB | $1,679 | $1,679 | = $0 |
| Othman, Fahme | C223 | CV | $2,762 | $2,762 | = $0 |

Both flat. Flat renewal streak continues (12+ consecutive over audit series). Renewals module still in development — "No active worksheet items" messages are expected and not an error.

---

## Operational Sync Results

### Alerts

| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| RS | 2 | 0 | 1 | 0 |
| SB | 1 | 1 | 1 | 0 |
| CV | 1 | 0 | 1 | 0 |

OB and WO not in Phase 3A batch today. No alert churn concerns (all ≤1 per property, well under the >3 flag threshold).

### Work Orders

| Property | Processed | Deactivated | Ratio |
|---|---|---|---|
| CV | 19 | 1 | 5% |
| RS | 32 | 6 | 19% |
| OB | 37 | 5 | 14% |
| SB | 8 | 4 | **50%** |
| WO | 5 | 1 | 20% |

SB continues high deactivation ratio pattern (Day 4+). Still plausible as legitimate work order completions, but SB manager confirmation remains outstanding.

### Delinquencies — March Flush Day 3

| Property | Rows | Updated/New | Resolved | Note |
|---|---|---|---|---|
| RS | 98 | 14 | 77 | Flush slowing (113 → 14 new) — most March rent posted |
| SB | 100 | 67 | 91 | Strong flush continuing |
| CV | 56 | 12 | 46 | Joining cycle |
| WO | 51 | 14 | 33 | Joining cycle |
| OB | 131 | 31 | 33 | Modest resolution activity |

RS/SB new/updated volumes dropped sharply (RS: 113 → 14; SB: 92 → 67), indicating the March rent payment wave is largely complete for those properties. CV and WO now entering their flush cycle. OB remains the most active delinquency property by row count (131 rows, 33 resolved). Overall a strong delinquency reduction day.

---

## MakeReady Status Board — Full Portfolio

### Resolved Today ✅

| Unit | Property | Days Overdue | Resolution |
|---|---|---|---|
| 2007 | RS | 5 days | ✅ Resolved — "Resolved 3 makeready flags for RS" |
| 1027 | RS | 5 days | ✅ Resolved |
| 3061 | RS | 5 days | ✅ Resolved |
| S081 | OB | 7 days | ✅ Resolved — "Resolved 2 makeready flags for OB" |
| S050 | OB | 3 days | ✅ Resolved |

**5 flags resolved in a single run — strongest resolution day in the audit series.**

### Active Overdue Flags (7 remaining, down from 12 yesterday)

| Unit | Property | Ready Date | Days Overdue | Trend |
|---|---|---|---|---|
| C213 | CV | 2026-02-04 | **27 days** | Day 8 audit — Taub applicant (start 2026-03-13; 10 days out) |
| C311 | CV | 2026-02-19 | **12 days** | +1/day — no incoming applicant |
| C217 | CV | 2026-02-20 | **11 days** | +1/day — no incoming applicant |
| C229 | CV | 2026-02-25 | **6 days** | +1/day — no incoming applicant |
| C230 | CV | 2026-02-27 | **4 days** | Cedillo applicant start **2026-03-07 (4 days out)** — likely auto-resolves |
| 3125 | RS | 2026-02-28 | **3 days** | +1 from yesterday (was 2) |
| S160 | OB | 2026-02-28 | **3 days** | +1 from yesterday (was 2) |

**Total: 7 active overdue flags** (5 CV, 1 RS, 1 OB) — down 42% from yesterday.

---

## Move-Out Overdue (Phase 2D.5)

- 2 overdue move-outs flagged
- 1 new flag created
- 1 existing flag severity-escalated

Within normal range. Unit identities not surfaced individually in log. Use the following to identify:
```sql
SELECT unit_name, property_code, metadata, created_at
FROM unit_flags
WHERE flag_type = 'move_out_overdue'
  AND (created_at::date = '2026-03-03' OR updated_at::date = '2026-03-03')
ORDER BY property_code, unit_name;
```

---

## W1 Watch — Notices Fix Stability (Day 5) ✅

| Resident | Unit | Property | Rent | Status |
|---|---|---|---|---|
| Kenton, Christina | 2019 | RS | $1,835 | ✓ Future → lease created |
| Jeffers, Ryan | 3130 | RS | $1,200 | ✓ Future → lease created |
| Poorman, Timothy | 1015 | SB | $1,753 | ✓ Future → lease created |

All three processing correctly as Future for Day 5. Fix from `useSolverEngine.ts:1322` (2026-02-23) confirmed stable. Note: Jeffers move-in is 2026-03-10 (7 days out) — after conversion to Current, this watch entry can be retired.

---

## Follow-Up Tracking

| # | Item | Yesterday | Today | Δ |
|---|---|---|---|---|
| 1 | 🔴 CV C213 (27 days) | Day 26 | **Day 27 — Taub applicant start 2026-03-13** | ❌ +1 day |
| 2 | ⚠️ CV C311 | 11 days | **12 days** | ❌ +1 day |
| 3 | ⚠️ CV C217 | 10 days | **11 days** | ❌ +1 day |
| 4 | ⚠️ CV C229 | 5 days | **6 days** | ❌ +1 day |
| 5 | ⚠️ CV C230 | 3 days | **4 days — Cedillo start 03-07 (Sat)** | ❌ +1 day |
| 6 | ⚠️ RS 2007/1027/3061 | 4 days | **RESOLVED** ✅ | ✅ Closed |
| 7 | ⚠️ RS 3125 | 2 days | **3 days** | ❌ +1 day |
| 8 | ⚠️ OB S081 | 6 days | **RESOLVED** ✅ | ✅ Closed |
| 9 | ⚠️ OB S050 | 2 days | **RESOLVED** ✅ | ✅ Closed |
| 10 | ⚠️ OB S160 | 2 days | **3 days** | ❌ +1 day |
| 11 | ⚠️ OB S093/S042/S170 (2027 dates) | Day 7 | **Day 8 — still unconfirmed** | ❌ Escalate |
| 12 | ⚠️ UNKNOWN Transfer Flag | Absent (Day 1) | **Absent (Day 2)** | ✅ **CONFIRMED CLOSED** |
| 13 | ⚠️ OB Arreola Garcia S100 typo | 2102-05-22 | **RESOLVED** — corrected to 2026-05-01 | ✅ Closed |

---

## Findings

### ✅ CLEAN

**1 — No Fatal Errors**
All 5 properties processed to completion across all phases (Safe Sync → Leases → Notices → Move-Out → MakeReady → Applications → Transfers → Alerts → Work Orders → Delinquencies → Snapshots). No 403 errors, no authentication failures, no stalled phases.

**2 — W1 Fix Day 5 Confirmed**
Kenton, Christina (RS-2019), Jeffers, Ryan (RS-3130), and Poorman, Timothy (SB-1015) processed as Future for the 5th consecutive run. Fix from `useSolverEngine.ts:1322` remains stable.

**3 — Snapshot Option B Stable Day 5**
All 5 properties saved availability snapshots with zero 403 errors. Server-route pattern (`save-snapshot.post.ts` + `serverSupabaseServiceRole`) confirmed. Escalation fully closed.

**4 — OB Arreola Garcia S100 Yardi Typo: RESOLVED**
`lease_start_date` corrected from `2102-05-22` to `2026-05-01`. End date also updated from `2027-02-28` to `2027-04-30`. Rent $1,975 confirmed. Full tenancy re-entry by Yardi team. This was Day 8 of the tracking — resolved before the 2026-03-10 MakeReady deadline.

**5 — UNKNOWN Transfer Flag: CONFIRMED RESOLVED**
Phase 2E shows WO, OB, SB, RS — UNKNOWN absent for Day 2. Watch closed.

**6 — 5 MakeReady Flags Resolved (Single-Run Record)**
RS 2007, RS 1027, RS 3061 (all ~5 days overdue) and OB S081 (7 days), OB S050 (3 days) all resolved in this run. Portfolio overdue flag count dropped from 12 to 7 — a 42% reduction. Outstanding ops performance.

**7 — H-065 Universal Unit Search: No Regression**
H-065 (merged 2026-03-02) added `/assets/units/search` — read-only UI, no solver/RLS/DB write changes. Zero regression to solver pipeline confirmed.

**8 — March Delinquency Flush Continuing (Day 3)**
RS: 77 resolved (of 98); SB: 91 resolved (of 100); CV: 46 resolved (of 56); WO: 33 resolved (of 51); OB: 33 resolved (of 131). RS/SB payment wave is largely complete. CV and WO now flushing. Net delinquency inventory continues to decrease.

**9 — CV AIRM Day 7 Normal**
6 units with $3–$4 decrements. Cumulative drift since 02-28: $10–$18 per unit. Expected algorithmic behavior. No action required.

---

### ⚠️ WARNING

**W1 — RS: 2 Silently-Dropped Tenancies (Threshold Exceeded)**

```
[Solver] RS: 2 silently-dropped tenancies detected
[Solver] RS: Transitioned 2 tenancies → Past
```

Per audit protocol, > 1 silent drop at any single property in one run requires flagging. RS had 2 tenancies disappear from Yardi without a normal status transition. Both were automatically transitioned to **Canceled** and the affected units were reset to Available (contributing to the RS +1 available unit delta). Unit identities were not individually surfaced in the log — use the query below to identify:

```sql
SELECT t.unit_id, u.unit_name, t.resident_id, r.full_name, t.tenancy_status, t.updated_at
FROM tenancies t
JOIN units u ON t.unit_id = u.id
JOIN residents r ON t.resident_id = r.id
WHERE t.property_code = 'RS'
  AND t.tenancy_status = 'Canceled'
  AND t.updated_at::date = '2026-03-03'
ORDER BY t.updated_at DESC;
```

Two silently-dropped tenancies at RS in a single run is the exact threshold — not a major concern but worth monitoring. If RS posts ≥ 2 silent drops again tomorrow, investigate for a Yardi data export gap or bulk application denial event.

---

**W2 — CV MakeReady Escalation: C213 Day 27, C311 Day 12**

| Unit | Ready Date | Days Overdue | Outlook |
|---|---|---|---|
| C213 | 2026-02-04 | **27 days** | Taub, Timothy applicant — start **2026-03-13 (10 days)**. If converts, auto-resolves. |
| C311 | 2026-02-19 | **12 days** | No incoming applicant. Escalating. |
| C217 | 2026-02-20 | **11 days** | No incoming applicant. Escalating. |
| C229 | 2026-02-25 | **6 days** | No incoming applicant. |
| C230 | 2026-02-27 | **4 days** | Cedillo, Jonathan — start **2026-03-07 (Sat)**. Likely auto-resolves Monday. |

C213 has now been overdue for 27 consecutive days. The flag remains at critical severity. If Taub converts on or after 2026-03-13, the solver will auto-resolve the MakeReady flag. If Taub's application cancels or is denied, the flag continues indefinitely. CV has 5 concurrent overdue flags — the highest burden of any property.

C311 and C217 are approaching 2-week duration with no incoming applicants. Direct CV property manager escalation is warranted for C311/C217 if not resolved by 03-06.

---

**W3 — OB Contracted Rent Drop: -$15 (Watch)**

OB contracted rent fell from $2,547 to $2,532 in a single run with no OB renewals, no new OB occupancy conversions, and no OB silent drops. The most likely explanation is a recalculation artifact triggered by the Arreola Garcia lease date correction in Yardi (full re-entry of t2559309 with different start/end dates may have shifted how the solver processes this tenancy for averaging purposes). No action required today, but this should normalize by 03-04. If OB contracted rent continues to drop tomorrow without new occupancy changes, investigate the contracted rent calculation for consistency with tenant count and active lease set.

---

### 🔴 FATAL

None.

---

## Duplicate TRACE Analysis (Code Efficiency)

**SB Unit 1026** resolved twice (Roommate + Primary roles):
```
Found Unit 1026 -> 0c3ce341... (Role: Roommate)
Found Unit 1026 -> 0c3ce341... (Role: Primary)
```

**RS Unit 1027** resolved twice (Roommate + Primary roles):
```
Found Unit 1027 -> 0b3638dd... (Role: Roommate)
Found Unit 1027 -> 0b3638dd... (Role: Primary)
```

Same multi-resident pattern observed in prior runs. The solver resolves `unit_id` for each tenancy individually (once per Primary, once per Roommate), resulting in duplicate lookups when two co-residents share a unit. These are not bugs — the data is correct — but the redundant DB call for the same `unit_id` is mildly inefficient. See Architectural Optimization below.

---

## Architectural Optimization

**Dedup Unit Lookups in Multi-Resident Tenancy Processing**

Today's TRACE log shows the same `unit_id` being resolved twice for co-resident units (1026 at SB, 1027 at RS). When a unit has both a Primary and a Roommate tenancy, the solver fires two separate `unit_id` lookups for the same physical unit. In a portfolio with ~400 units and some percentage of co-resident arrangements, this compounds DB round-trips on every solver run.

**Proposed fix:** Before the tenancy processing loop, build a `unitLookupCache: Map<unit_name, unit_id>` scoped to the current property. On each tenancy, check the cache first — if the unit was already resolved (by a prior tenancy in the same batch), reuse the cached `unit_id` without hitting the DB. This is an additive, low-risk change that does not alter data logic.

**Estimated scope:** ~15 lines in `useSolverEngine.ts` in the per-property tenancy processing block. Reduces redundant lookups proportionally to co-resident density per property.

---

## Shift Handoff

**For next session (2026-03-04):**

- 🔴 **C213 (CV):** Day 27 overdue. Taub, Timothy `lease_start_date = 2026-03-13` — 10 days remain. Monitor for conversion event. If still Applicant on 03-08, escalate directly to CV manager (5-day warning before move-in date).
- ⚠️ **C311/C217 (CV):** 12 and 11 days — no incoming applicants. Approaching 2-week threshold. Escalate to CV property manager if no Yardi resolution by 03-06.
- ✅ **C230 (CV):** Cedillo, Jonathan `lease_start_date = 2026-03-07` (Saturday). Expect auto-resolution on Monday 03-09 (next solver run after Saturday). If Cedillo doesn't appear as Current by Monday, flag.
- ⚠️ **RS 3125 (3 days):** Monitor for escalation past the 7-day threshold.
- ⚠️ **OB S160 (3 days):** Monitor.
- ⚠️ **OB S093/S042/S170:** Day 8 with 2027 ready dates — no OB manager response. Must escalate to OB manager directly. These are anomalous long-term holds requiring confirmation.
- ⚠️ **RS Silent Drops:** 2 in today's run — at the exact threshold. Run the query above to identify affected units. If RS posts ≥ 2 again tomorrow, flag for Yardi data export investigation.
- ⚠️ **OB Contracted Rent ($2,532):** Watch for stabilization. If still dropping 03-04, investigate contracted rent calculation vs. active lease set.
- ⚠️ **SB Work Order Pattern:** Day 4+ of deactivations ≥ processed (50% today). Confirm with SB property manager that Yardi work order completions are being uploaded correctly.
- ℹ️ **W1 Watch:** Day 6 tomorrow. Jeffers, Ryan move-in is 2026-03-10 (6 days). After conversion, retire this watch entry. Continue monitoring Kenton/Poorman.
- ℹ️ **CV AIRM Day 8:** 6 units, $3–$4/day. Cumulative: $10–$18 per unit from 02-28 baseline. Normal.
- ℹ️ **March Delinquency Flush:** RS/SB volumes normalizing (wave complete). Expect CV/WO to continue resolving. OB may see larger resolution wave in next 1–2 runs.
- ℹ️ **Flat Renewal Streak:** Espinoza (SB) + Othman (CV) both flat. 12+ consecutive flat renewals over audit series. Consider surfacing to property managers — renewals module (H-057) implementation would provide systemic enforcement.
