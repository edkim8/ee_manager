# Daily Solver Audit — 2026-03-06

**Auditor:** Tier 2 Forensic Auditor (Claude Sonnet 4.6)
**Batch ID:** `5b5ac9b8-3a5e-4026-b9f6-a7a71ded5648`
**Run Time:** Friday, March 6, 2026 @ 7:20 AM
**Status:** ⚠️ WARNING — Parser trailing-space bug (false silent drops); RLS gap on tenancy status transitions; RS 3103 Helbert move-in TOMORROW; OB S093/S042 Day 11 (2027 dates); WO 464-E escalating; OB 49 new delinquencies

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 13 |
| Fixes Applied | 0 (2 bugs identified — see §2) |
| W1 Verification | ✅ PASS — Day 8 (Kenton/Jeffers/Poorman all Future) |
| Snapshot 403 Errors | ✅ RESOLVED — Option B stable Day 8 |
| Delinquency Sync | ✅ RESTORED — fresh data after 03-05 stale-file issue |
| OB S170 (2027 date) | ✅ CORRECTED — Yardi updated to 2026-03-12 |
| RS 3103 Ready Date | ✅ YARDI UPDATED — 2026-03-02 → 2026-03-07 (Helbert move-in TOMORROW) |
| DB Correction Applied | ✅ t2487994 (SB-1057) reverted to Notice after accidental audit-session Past override |
| Email Notifications | ✅ Triggered (success: true, 8 results) |

---

## §2 — Bugs Identified This Run

### Bug 1 — Parser Trailing Space: False Silent Drop Detection

**Root cause:** The `Code` column in the Yardi 5p_Residents_Status Excel file may contain trailing spaces on certain rows (e.g., `'t2487994 '` instead of `'t2487994'`). The `useParseResidentsStatus` parser maps `Code → tenancy_id` with **no transform and no trim**. The raw value goes directly into the `reportedTenancyIds` Set. The solver's missing-tenancy check calls `reportedTenancyIds.has(t.id)` — the clean DB value `'t2487994'` does not match the spaced Set entry `'t2487994 '` → false positive silent drop.

**Evidence:** SB-1057 (t2487994) and SB-1059 (t2973298) are confirmed present in today's 5p_Residents_Status at rows 687-688 and 691-692 with Notice status. Yardi confirms both residents are active with move-out dates in May 2026. Despite being in the report, the solver flagged both as silently-dropped.

**Outcome:** The availability reset to Available was **accidentally correct** — Notice tenants with no incoming Future/Applicant are legitimately Available. However the detection mechanism is broken and will repeat every run until fixed.

**Fix required** in `useSolverEngine.ts` and/or `useGenericParser.ts`:
```ts
// Normalize when building the Set:
const reportedTenancyIds = new Set(
    rows.filter((r: any) => r.tenancy_id)
        .map((r: any) => String(r.tenancy_id).trim().toLowerCase())
)
// Normalize when checking:
const missing = activeTenancies.filter(
    (t) => !reportedTenancyIds.has(String(t.id).trim().toLowerCase())
)
```
Also add a critical console.error when a parsed row has a null/empty tenancy_id after normalization — tenancy_id is the primary matching key; a missing ID should never be silently ignored.

### Bug 2 — RLS Gap: Tenancy Status Updates Silently Fail via Authenticated JWT

**Root cause:** The solver runs with the authenticated user's JWT. The RLS policy on the `tenancies` table silently blocks `UPDATE status = 'Past'` and `UPDATE status = 'Canceled'` for the authenticated role. Supabase returns HTTP 200 with no `error` object (RLS-blocked updates return empty result, not an error). The solver code only checks `if (error)` — it cannot detect 0 rows affected. Result: "Transitioned X tenancies → Canceled/Past" is logged but nothing commits to the DB.

**Evidence:** Post-run DB query showed t2487994 and t2973298 still as `Notice` (unchanged). Service role PATCH succeeded immediately.

**Fix required:** Run silent drop tenancy status transitions via a server-side route using `serverSupabaseServiceRole` (same pattern as the snapshot save-route at `layers/admin/server/api/solver/save-snapshot.post.ts`). Additionally add row-count checking: if `.update()` returns an empty data array, emit `console.warn`.

---

## Property Activity

| Property | Rows | Safe Sync (New/Upd) | Lease Ops | Applications | Notices | Silent Drops |
|---|---|---|---|---|---|---|
| SB | 665 | 0 / 381 | 2 updated | 0 | 21 | 2 (false positive — see §2) |
| CV | 191 | 0 / 116 | 3 updated | 3 | 1 | 1 (Conway C229 — legitimate) |
| WO | 326 | 0 / 91 | 1 updated | 0 | 2 | 0 |
| OB | 706 | 0 / 208 | 3 updated | 0 | 8 | 0 |
| RS | 583 | 1 New / 351 | 1 inserted, 11 updated | 3 | 33 | 1 (→ Past, status update silently failed — see §2) |

---

## Lease Creates (21 total)

| Resident | Property | Unit | Type | Rent | Lease Start | Note |
|---|---|---|---|---|---|---|
| Poorman, Timothy | SB | 1015 | Future | $1,753 | 2026-04-10 | Continuing |
| Obando, Walther | SB | 2058 | Future | $2,125 | 2026-03-14 | Continuing |
| Taub, Timothy | CV | C213 | Applicant | $2,654 | 2026-03-13 | Continuing |
| Cedillo, Jonathan | CV | C330 | Applicant | $2,581.35 | 2026-04-01 | Continuing |
| Kirksey, Ramon | CV | C427 | Applicant | $2,383 | 2026-04-01 | Continuing |
| Sanchez Calixto, Karina | WO | 464-E | Future | $3,395 | 2026-03-16 | Continuing |
| Arreola Garcia, Pedro I | OB | S100 | Future | $1,975 | 2026-05-01 | Continuing |
| Mesinas, Gustavo | OB | S101 | Future | $0 | 2026-03-06 | ⚠️ $0 rent — see W3 |
| Avalos, Ashley | OB | S139 | Future | $1,975 | 2026-03-14 | Continuing |
| Guzman, Fernando | RS | 1005 | Future | $1,631 | 2026-03-10 | Continuing |
| Adame, Jorge | RS | 1016 | Applicant | $1,218 | 2026-03-07 | Move-in TOMORROW |
| Aguilar, Sebastian | RS | 1033 | Applicant | $1,521 | 2026-03-14 | Continuing |
| Tyars, Latora | RS | 1038 | Future | $1,233 | 2026-04-16 | Continuing |
| Oltmanns, Brian | RS | 1073 | Future | $1,335 | 2026-03-27 | Continuing |
| Salazar, James | RS | 1099 | Future | $1,656 | 2026-04-26 | Continuing |
| Herbert, Rylee | RS | 2007 | Applicant | $1,438 | 2026-03-06 | NEW — RS-2007 rapid turnaround |
| Kenton, Christina | RS | 2019 | Future | $1,835 | 2026-03-16 | W1 watch |
| Smith, Tyrus | RS | 2041 | Future | $1,805 | 2026-04-30 | Continuing |
| Rivera, Joel | RS | 2135 | Future | $1,060 | 2026-03-09 | ⚠️ Rent was $1,631 on 03-03 — see W4 |
| Helbert, Kyle | RS | 3103 | Future | $1,563 | 2026-03-07 | Move-in TOMORROW |
| Jeffers, Ryan | RS | 3130 | Future | $1,200 | 2026-03-10 | W1 watch |

---

## Renewals (3 — all flat)

| Resident | Unit | Property | Old Rent | New Rent | Change |
|---|---|---|---|---|---|
| Farrales, John | 3147 | SB | $1,569 | $1,569 | $0 |
| Mitchell, Jennafer | 2060 | RS | $1,445 | $1,445 | $0 |
| Vega, Erik | 3105 | RS | $1,626 | $1,626 | $0 |

Flat renewal streak: **Day 13** of the audit series.

---

## Availability Price Changes (All CV — AIRM)

| Unit | Property | Old Rent | New Rent | Change | % Change | Note |
|---|---|---|---|---|---|---|
| C217 | CV | $2,334 | $2,332 | ↓ $2 | −0.1% | Normal AIRM |
| C311 | CV | $2,434 | $2,432 | ↓ $2 | −0.1% | Normal AIRM |
| C419 | CV | $2,194 | $2,192 | ↓ $2 | −0.1% | Normal AIRM |
| C230 | CV | $2,597 | $2,593 | ↓ $4 | −0.2% | Normal AIRM |
| C112 | CV | $2,647 | $2,643 | ↓ $4 | −0.2% | Normal AIRM |
| C323 | CV | $2,672 | $2,668 | ↓ $4 | −0.1% | Normal AIRM |
| **C229** | CV | $2,787 | $2,773 | ↓ **$14** | −0.5% | ⚠️ Larger than typical $2–$5 — Conway canceled |

All 7 units are CV AIRM. No manual repricing at RS, SB, OB, or WO.

**C229 note:** C229 was Applied (Conway) on 03-05 when AIRM was dormant. Today C229 is receiving AIRM decrements again — Conway's application was canceled (CV silent drop, 1 Canceled). CV applied count dropped 4→3. C229 correctly returned to Available and AIRM resumed. The $14 drop is a larger algorithmic step likely triggered by the unit re-entering the AIRM queue.

---

## Availability Snapshots

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased | Contracted Rent | ΔRent |
|---|---|---|---|---|---|---|---|---|
| SB | 32 | 0 | 2 | **+4** | −2 | −1 | $1,645 | $0 |
| CV | 7 | 3 | 0 | +1 | −1 | 0 | $2,369 | $0 |
| WO | 3 | 0 | 1 | 0 | 0 | 0 | $2,950 | $0 |
| OB | 23 | 0 | 2 | 0 | 0 | 0 | $2,536 | +$2 |
| RS | 38 | 3 | 4 | −1 | +1 | −2 | $1,486 | −$2 |

**SB +4 available, applied→0:** SB-1057 and SB-1059 correctly became Available (Notice tenants, no incoming replacement). Gagliano (1049) and David (1124) applications dropped. SB leased −1.

**RS leased −2:** Two Future tenants converted to Current (moved in), exiting the Leased pool.

**CV applied −1:** Conway (C229) application canceled → C229 reset to Available.

---

## Findings

### ✅ CLEAN

**1 — No Fatal Errors**
All 5 properties completed all phases (Safe Sync → Leases → Notices → MakeReady → Applications → Transfers → Alerts → Work Orders → Delinquencies → Snapshots). Zero 403 errors.

**2 — W1 Fix Day 8 Confirmed**
Kenton, Christina (RS-2019, $1,835), Jeffers, Ryan (RS-3130, $1,200), and Poorman, Timothy (SB-1015, $1,753) all processed as Future for the 8th consecutive run. Fix from `useSolverEngine.ts:1322` (2026-02-23) remains stable.

**3 — Snapshot Option B Stable Day 8**
All 5 properties saved availability snapshots with zero 403 errors.

**4 — Delinquency Sync Restored**
Fresh delinquency data confirmed after 03-05 stale-file issue. All 5 properties show real activity.

**5 — OB S170 Ready Date Corrected**
S170 changed from 2027-01-07 to 2026-03-12. One of the three long-standing anomalous 2027-date units has been corrected in Yardi. S093 and S042 remain.

**6 — RS 3103 Yardi Ready Date Updated**
3103 ready date changed from 2026-03-02 to 2026-03-07 — Yardi aligned the completion target with Helbert's move-in date. Activity signal from the RS property manager. Prior overdue flag still active in DB.

**7 — RS-2007 Rapid Turnaround**
Herbert, Rylee (RS-2007, Applicant, $1,438) starts today. RS-2007 MakeReady was cleared 2026-03-03 — unit turned over in 3 days.

**8 — RS Adame (1016) Move-In Tomorrow**
Adame, Jorge (Applicant, $1,218, start 2026-03-07). Expect Current conversion by Monday 03-09.

**9 — DB Integrity Corrected**
t2487994 (SB-1057) was accidentally set to Past during the audit DB investigation session. Reverted to Notice via service role. Confirmed: `status = Notice`.

**10 — SB-1057/1059 Availability Correctly Available**
Both units are on Notice with May move-out dates and no incoming Future/Applicant tenancies. Setting availability to Available is the correct solver behavior — these units are actively on the market. The solver outcome was correct despite the false-positive silent drop detection mechanism.

---

### ⚠️ WARNING

**W1 — Parser Bug: Trailing Space Causes False Silent Drop Detection (SB)**

SB-1057 (t2487994, Holli Mae Startin, Notice 3/5/26, move-out 5/4/26) and SB-1059 (t2973298, move-out 5/16/26) are confirmed present in today's 5p_Residents_Status at rows 687-688 and 691-692. Both have Unit=1057/1059 and Code=t2487994/t2973298. Despite being in the file, the solver detected both as silently-dropped.

Root cause: trailing space in the Excel `Code` column (`'t2487994 '` ≠ `'t2487994'`). The parser has no trim transform on `tenancy_id`. The Set lookup fails → false positive.

**Action required:** Fix trailing space normalization in `useSolverEngine.ts` (see §2). This will recur on every run until patched.

---

**W2 — RLS Gap: Tenancy Status Transitions Silently Fail**

Silent drop tenancy status updates (→ Past / → Canceled) executed via the authenticated user's JWT do not commit. Supabase returns HTTP 200 with no error but 0 rows affected — the solver's `if (error)` check cannot detect this. Confirmed via direct DB query post-run.

The accidental correct outcome: for the false-positive SB cases, the tenancy staying at Notice is the right state. For legitimate silent drops (CV Conway, RS Past), these transitions also failed silently — real vacated units may remain stuck at their prior status indefinitely.

**Action required:** Move tenancy status transitions to a server-side route with `serverSupabaseServiceRole` (see §2). Add row-count validation to the solver's update calls.

---

**W3 — OB S101 Mesinas, Gustavo: $0 Rent**

```
Future tenancy t3189173: {unit: 'S101', resident: 'Mesinas, Gustavo',
  lease_start_date: '2026-03-06', rent: 0}
```

A Future tenancy starting today with $0 rent. Could be a staff/employee unit, full concession, or Yardi data entry error. Confirm with OB manager — if intentional, note in Yardi as a concession; if error, correct in Yardi for next run.

---

**W4 — RS Rivera (2135): Rent Dropped $1,631 → $1,060 (−$571, −35%)**

Rivera, Joel (RS-2135, Future, start 2026-03-09) showed rent $1,631 on 2026-03-03. Today: $1,060. Move-in is in 3 days. A 35% rent reduction on a lease about to begin is significant — confirm this is an intentional negotiation or correction and not a Yardi data entry error.

---

**W5 — SB Work Orders: Day 8+ Anomaly (200% Deactivation Ratio)**

4 deactivated from 2 processed. This pattern has persisted for 8+ consecutive audit days with no SB manager confirmation. Escalate directly.

---

**W6 — RS Work Orders: 50% Deactivation Ratio (Oscillating)**

RS was 278% on 03-04, 0% on 03-05, 50% today. Inconsistent pattern — either batched Yardi uploads or irregular work order completions. Monitor — if RS spikes above 100% again on 03-07, escalate alongside SB.

---

**W7 — CV C229: Back in AIRM After Conway Application Canceled**

C229 was dormant (Applied) on 03-05. Today shows −$14 AIRM drop — larger than the typical $2–$5 range. Consistent with the unit re-entering the AIRM queue after a gap (algorithmic catch-up). CV applied count dropped 4→3. Confirm Conway's application was intentionally canceled in the leasing office.

---

**W8 — OB: 49 New/Updated Delinquencies**

Highest single-property new delinquency volume in the audit series. OB row count is 62 with 49 new/updated entries and only 7 resolved. Monitor next run — if OB new entries remain elevated (>20/day), investigate for a batch of non-paying tenants or a late-charge posting event.

---

**W9 — WO 464-E: 4 Days Overdue — Sanchez Starts 2026-03-16 (10 Days)**

```
464-E: ready=2026-03-02, cutoff=2026-03-05, overdue=true
```

Now 4 days overdue. Sanchez Calixto, Karina starts 2026-03-16. Critical threshold is 03-09 (7 days to move-in). WO manager must confirm MakeReady status.

---

**W10 — RS 3103: Flag Unresolved — Helbert Move-In TOMORROW (03-07, Saturday)**

Yardi updated ready date from 2026-03-02 to 2026-03-07 (today's log: `ready=2026-03-07, overdue=false` with 1-day cushion). The prior overdue flag was **not** auto-resolved ("No makeready flags to resolve for RS"). The ready date was aligned to move-in day — this is a deadline, not a completion confirmation. RS manager must confirm the unit is physically ready today before Saturday move-in.

---

**W11 — OB S093/S042: Day 11 with 2027 Ready Dates (No Manager Response)**

| Unit | Ready Date | Days Until Ready |
|---|---|---|
| S093 | 2027-01-01 | ~300 days |
| S042 | 2027-01-07 | ~306 days |

S170 corrected today (2027-01-07 → 2026-03-12) — a positive signal that OB is responding. S093 and S042 remain at Day 11. Direct OB manager follow-up required — confirm whether these are intentional long-term rehabilitation holds.

---

**W12 — CV C419: Enters Overdue Window 03-08 (2 Days)**

```
C419: ready=2026-03-06, cutoff=2026-03-05, overdue=false
```

Not overdue today (ready date = today, 1-day cushion still applies). Based on cutoff logic, C419 enters the overdue window on **03-08** if not cleared in Yardi by then.

---

**W13 — OB Alerts: 2 Added in One Run**

OB added 2 alerts simultaneously (count: 3, added: 2). Under the >3 flag threshold but notable. Confirm with OB manager what operational condition triggered two simultaneous alerts.

---

### 🔴 FATAL

None.

---

## Move-Out Overdue (Phase 2D.5)

```
[Solver] Found 2 overdue move-outs to flag
[Solver] Created 2 move-out overdue flags
```

2 flags created. Unit identities not surfaced in log. Query to identify:
```sql
SELECT u.unit_name, t.property_code, f.metadata, f.created_at
FROM unit_flags f
JOIN units u ON f.unit_id = u.id
JOIN tenancies t ON t.unit_id = u.id
WHERE f.flag_type = 'move_out_overdue'
  AND f.created_at::date = '2026-03-06'
ORDER BY t.property_code, u.unit_name;
```

---

## MakeReady Status Board

### Active Overdue Flags

| Unit | Property | Ready Date | Days Overdue | Outlook |
|---|---|---|---|---|
| **464-E** | WO | 2026-03-02 | **4 days** | Sanchez starts 03-16 (10 days) — critical threshold 03-09 |
| **3103** | RS | ~~2026-03-02~~ → 2026-03-07 | Flag active | Helbert TOMORROW (03-07, Saturday) |

### CV MakeReady Queue

| Unit | Ready Date | Days Until Overdue | Watch |
|---|---|---|---|
| **C419** | 2026-03-06 | **2 days** | Enters overdue 03-08 |
| C427 | 2026-03-13 | 9 days | Kirksey applicant |
| C330 | 2026-03-13 | 9 days | Cedillo applicant |
| C112 | 2026-03-20 | 16 days | Monitor |
| C323 | 2026-04-10 | 37 days | Safe |

### OB MakeReady (2027 Dates)

| Unit | Ready Date | Status |
|---|---|---|
| S170 | ~~2027-01-07~~ → 2026-03-12 | ✅ Corrected today |
| S093 | 2027-01-01 | ⚠️ Day 11 — no response |
| S042 | 2027-01-07 | ⚠️ Day 11 — no response |

---

## Operational Sync Results

### Alerts

| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| CV | 1 | 0 | 0 | 0 |
| SB | 2 | 1 | 0 | 0 |
| OB | 3 | **2** ⚠️ | 0 | 0 |

RS and WO not in today's alert batch.

### Work Orders

| Property | Processed | Deactivated | Ratio |
|---|---|---|---|
| CV | 10 | 0 | 0% ✅ |
| OB | 34 | 2 | 6% ✅ |
| WO | 13 | 3 | 23% ✅ |
| RS | 8 | **4** | **50%** ⚠️ |
| SB | 2 | **4** | **200%** ⚠️ Day 8+ |

### Delinquencies

| Property | Rows | Updated/New | Resolved |
|---|---|---|---|
| SB | 56 | 13 | 10 |
| OB | 62 | **49** ⚠️ | 7 |
| RS | 74 | 16 | 4 |
| WO | 32 | 5 | 1 |
| CV | 40 | 4 | 1 |

Fresh data confirmed (restored from 03-05 stale-file issue). OB volume is highest in the series.

---

## Applications

| Property | Count | Applicants |
|---|---|---|
| CV | 3 | Taub (C213), Cedillo (C330), Kirksey (C427) |
| RS | 3 | Adame (1016), Aguilar (1033), Herbert (2007) |

SB dropped to 0 (Gagliano and David applications canceled/denied). Portfolio total: 6 active applications.

---

## W1 Watch — Notices Fix Stability (Day 8) ✅

| Resident | Unit | Property | Rent | Status |
|---|---|---|---|---|
| Kenton, Christina | 2019 | RS | $1,835 | ✓ Future |
| Jeffers, Ryan | 3130 | RS | $1,200 | ✓ Future — move-in 03-10 (4 days) |
| Poorman, Timothy | 1015 | SB | $1,753 | ✓ Future |

Jeffers move-in 2026-03-10 (4 days). Retire from watch list after Current conversion on or after 03-10.

---

## Duplicate TRACE Analysis (Code Efficiency)

- **SB 1026:** Primary + Roommate (Day 12 — same recurring pattern)
- **RS 1027:** Roommate + Primary (Day 12 — same recurring pattern)

Unit lookup cache (~15 lines) still unimplemented. See prior audit recommendations.

---

## Architectural Optimization

**Normalize tenancy_id at the parser level, not the solver level.**

The trailing-space bug (W1) could be fixed defensively in `useSolverEngine.ts`, but the correct fix is at the source — in `useGenericParser.ts`. Any field with no explicit transform currently returns raw cell values with potential whitespace, numeric coercion, or encoding artifacts from Excel.

**Proposed:** Add a `'normalize_id'` transform type to the parser mapping that applies `.toString().trim().toLowerCase()` to the value. Apply it to all ID fields (`tenancy_id`, `resident_id`, etc.) across all parsers. This is a single ~5-line change to `applyTransform()` in `useGenericParser.ts` that defensively covers all future ID fields portfolio-wide, not just `tenancy_id` in `useParseResidentsStatus`.

```ts
// In applyTransform():
if (fieldConfig.transform === 'normalize_id') {
    if (rawVal === null || rawVal === undefined) return null
    return String(rawVal).trim().toLowerCase()
}
```

Then in `useParseResidentsStatus.ts`:
```ts
'Code': { targetField: 'tenancy_id', transform: 'normalize_id', required: true },
```

**Scope:** ~5 lines in `useGenericParser.ts`, 1-line change in each parser that has ID fields. Eliminates the entire class of whitespace-mismatch bugs across all parsers permanently.

---

## Shift Handoff

**For next session (2026-03-07 — Saturday):**

- 🔴 **RS 3103 — Helbert Move-In TODAY:** Helbert, Kyle starts 2026-03-07 (Saturday). RS manager must confirm MakeReady before move-in. If 3103 clears in tomorrow's run, the flag auto-resolves.
- 🔴 **Parser Trailing-Space Bug (W1):** Both SB-1057/1059 will be false-flagged as silently-dropped again tomorrow unless the trim fix is applied to `useSolverEngine.ts` or `useGenericParser.ts`. Fix before next run.
- 🔴 **Tenancy Status Update RLS Gap (W2):** Legitimate silent drops (Conway CV, RS Past) are not committing. Real vacated units may stay stuck at prior status. Fix before next run via server-route + service_role.
- ⚠️ **WO 464-E:** 4 days overdue (Sanchez starts 03-16, 10 days). Critical threshold 03-09 (7 days). WO manager must act this weekend.
- ⚠️ **RS Adame (1016):** Applicant, starts today (03-07). Expect Current conversion by Monday 03-09.
- ⚠️ **RS Rivera (2135):** Rent $1,631 → $1,060 (−35%), starts 03-09. Confirm with RS manager before move-in.
- ⚠️ **OB S101 Mesinas ($0 rent):** Starts today. Confirm with OB manager.
- ⚠️ **CV C419:** Enters overdue window 03-08. Monitor.
- ⚠️ **OB S093/S042:** Day 12. Direct OB manager contact required.
- ⚠️ **SB Work Orders:** Day 9+ anomaly — SB manager confirmation still outstanding.
- ⚠️ **OB Delinquencies:** 49 new/updated entries today. Monitor trend on 03-09.
- ✅ **W1 Watch:** Jeffers (RS-3130) move-in 03-10 (4 days). Retire after Current conversion. Continue Kenton (03-16) and Poorman (04-10).
- ✅ **RS Herbert (2007):** Started today as Applicant. Expect conversion soon.
- ✅ **CV Taub (C213):** Starts 03-13 (7 days). Monitor for Current conversion.
- ℹ️ **Flat Renewal Streak:** Day 13 (Farrales SB + Mitchell RS + Vega RS all flat today). Renewals module would surface this systematically.
- ℹ️ **CV AIRM:** 7 units resuming decrements. C229 re-entered queue after Conway cancellation.
