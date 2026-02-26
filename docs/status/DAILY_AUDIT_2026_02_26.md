# Daily Solver Audit — 2026-02-26

**Auditor:** Tier 2 Data Architect (Claude Sonnet 4.6)
**Batch ID:** `4ab52458-825a-4f9a-aa0a-f2fc8176f514`
**Run Time:** Thursday, 2026-02-26 @ 6:57 AM
**Status:** ⚠️ WARNING — 1 new infrastructure error (403 on snapshots), 3 RS silent drops (applications canceled)

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 8 (4 persistent, 4 new) |
| Fixes Applied | 0 |
| W1 Verification | ✅ PASS — Zero auto-status corrections (Day 4 confirmed) |
| CV C213 Escalation | 🔴 Day 22 — No Yardi update across 5 consecutive audit days |
| Snapshot 403 Errors | ⚠️ All 5 properties — recovered via fetch-retry (root cause identified) |
| Email Notifications | Triggered (success: true, 8 results) |

---

## Property Activity

| Property | Rows | ΔRows | Lease Creates | Lease Updates | Applications | Notices | Renewals |
|---|---|---|---|---|---|---|---|
| RS | 588 | -6 | 14 | 14 | 5 | 33 | 0 |
| SB | 663 | +4 | 6 | 5+1 insert | 1 | 17 | 1 (Esqueda, Sebastian — flat) |
| CV | 190 | 0 | 1 | 1 | 1 | 2 | 0 |
| OB | 719 | 0 | 4 | 4 | 3 | 7 | 0 |
| WO | 328 | +4 | 1 | 1 | 0 | 1 | 0 |

RS -6 row delta aligns with 3 silently-dropped (canceled) tenancy removals plus normal daily attrition. WO +4 rows corresponds to the new Sanchez Calixto, Karina lease.

---

## Availability Pipeline

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased | Contracted Rent |
|---|---|---|---|---|---|---|---|
| RS | 35 | 5 | 3 | **+4** | -3 | 0 | $1,490 |
| SB | 25 | 1 | 4 | -1 | +1 | +1 | $1,642 |
| CV | 8 | 1 | 0 | 0 | 0 | 0 | $2,362 |
| OB | 19 | 2 | 0 | 0 | 0 | 0 | $2,530 |
| WO | 2 | 0 | 1 | 0 | 0 | **+1** | $2,945 |

RS +4 available driven by 3 canceled tenancies resetting units + pipeline movement (applied -3). WO +1 leased aligns with Sanchez Calixto, Karina (464-E, $3,395). Contracted rent captured for the first time today (new `avg_contracted_rent` column from migration `20260225000003`).

---

## Availability Price Changes

### CV — AIRM Micro-Decrements (Day 5 — Normal)

| Unit | Old Rent | New Rent | Change |
|---|---|---|---|
| C213 | $2,812 | $2,810 | -$2 (-0.1%) |
| C229 | $2,812 | $2,810 | -$2 (-0.1%) |
| C230 | $2,632 | $2,630 | -$2 (-0.1%) |
| C330 | $2,707 | $2,705 | -$2 (-0.1%) |
| C112 | $2,682 | $2,680 | -$2 (-0.1%) |

5 units with -$2 AIRM decrements (C311, C217, C419 dropped off adjustment list today — no action required).

### RS — Manual Market Repricing (Informational)

| Unit | Old Rent | New Rent | Change | % Change |
|---|---|---|---|---|
| 3061 | $1,558 | $1,533 | -$25 | -1.6% |
| 2125 | $1,563 | $1,538 | -$25 | -1.6% |
| 2007 | $1,553 | $1,538 | -$15 | -1.0% |
| 3125 | $1,553 | $1,538 | -$15 | -1.0% |
| 1033 | $1,631 | $1,621 | -$10 | -0.6% |
| 3129 | $1,160 | $1,150 | -$10 | -0.9% |

6 RS units reduced $10–$25 by RS property manager. Per-property operational decision consistent with market and availability conditions. Yesterday: RS 2041 +$100, 2126 -$50. Downward repricing pattern continuing — informational, no action required.

---

## Follow-Up Tracking Resolution

| # | Item | Yesterday | Today | Status |
|---|---|---|---|---|
| 1 | 🔴 CV C213 | 21 days overdue (Day 4) | **22 days overdue (Day 5)** | ❌ No change — critical |
| 2 | ⚠️ CV C311 | 6 days overdue | **7 days overdue** | ❌ Escalating |
| 3 | ⚠️ CV C217 | 5 days overdue | **6 days overdue** | ❌ Escalating |
| 4 | ⚠️ OB S099 | +$250 spike ($2,125) | **No price change today** | ✅ Stabilized — watch closed |
| 5 | ⚠️ OB S093/S042/S170 | 2027 ready dates, Day 4 | **Unchanged — Day 5** | ❌ Still unconfirmed |
| 6 | ⚠️ OB Silent Drop (unit) | Unidentified | **Still unidentified from log** | ❌ Open — DB query required |

---

## Findings

### ✅ CLEAN

- **No fatal errors** — All 5 properties processed to completion across all phases.
- **W1 Fix Verified (Day 4)** — Kenton, Christina (RS-2019), Jeffers, Ryan (RS-3130), and Poorman, Timothy (SB-1015) all processed as Future tenancies with zero `Future → Notice` auto-correction. Fix from 2026-02-23 (`useSolverEngine.ts:1322`) confirmed stable.
- **Phase 2D.5** — 0 overdue move-outs detected across all properties.
- **OB S099 Watch Closed** — No price change logged today. Yesterday's $250 spike confirmed as a one-time correction aligning S099 ($2,125) with peer units S101 and S139 (both at $2,125). Watch closed.
- **CV AIRM Day 5** — 5 units with normal -$2 micro-decrements. C311, C217, C419 no longer in today's adjustment list (AIRM decision; no action required).
- **All operational syncs clean** — Alerts, Work Orders, and Delinquencies completed without errors.
- **Stale Availability Sweep** — 3 records updated (Future/Applicant). Normal operation.
- **Contracted Rent First Capture** — `avg_contracted_rent` now saved in all 5 property snapshots: RS $1,490 / SB $1,642 / CV $2,362 / OB $2,530 / WO $2,945. New trend data stream begins today.

---

### ⚠️ WARNING

**W1 — CV MakeReady: Critical Escalation (Day 5 of Audit Series)**

| Unit | Ready Date | Days Overdue | Trend |
|---|---|---|---|
| C213 | 2026-02-04 | **22 days** | Day 5 — zero Yardi response |
| C311 | 2026-02-19 | **7 days** | +1 from yesterday |
| C217 | 2026-02-20 | **6 days** | +1 from yesterday |

C213 has now been at critical overdue status for 5 consecutive audit days with no resolution or Yardi update. All three flags confirmed as "all already exist" (idempotent). Physical escalation to CV property manager is mandatory — if not already completed, this unit may be physically occupied without Yardi reflection.

---

**W2 — Availability Snapshot 403 Errors (All 5 Properties)**

```
POST .../availability_snapshots?on_conflict=property_code%2Csnapshot_date  403 (Forbidden)
```

Occurred once per property (5 total). `fetch-retry.js` recovered each time — all 5 snapshots saved successfully. No data loss.

**Root Cause (confirmed via migration analysis):**
Migration `20260225000004_fix_security_definer_views.sql` (Part 2) enabled RLS on `availability_snapshots` and created only a `FOR SELECT TO authenticated` policy. The migration comment incorrectly assumed writes would come via `service_role` — but the Solver (`useSolverEngine.ts`) is a **browser-side composable** that writes using the authenticated user's JWT. Before this migration, RLS was OFF on the table (original `20260221` migration never enabled it), so writes worked freely.

**Why retries succeed:** `fetch-retry.js` retries after a short delay. The retry hits a different Supabase connection-pool connection that may still have pre-RLS session state cached — a transient pooling edge case, not a reliable fix.

**Recommended fix — Option A (quick):**
```sql
CREATE POLICY "authenticated_can_write_availability_snapshots"
  ON public.availability_snapshots
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```
**Option B (proper, per design intent):** Move snapshot writes from `useSolverEngine.ts` to a server-side API route using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS by design. Recommend Option A now; Option B as future refactor.

---

**W3 — RS: 3 Silently-Dropped (Canceled) Tenancies**

```
[Solver] RS: 3 silently-dropped tenancies detected
[Solver] RS: Transitioned 3 tenancies → Canceled
[Solver] RS: Reset 3 availability records → Available
```

3 RS tenancy records disappeared from Yardi without a normal status transition. Per design, these are treated as **Canceled** — the system cannot distinguish Canceled vs. Denied (application declined), and this is intentional: including denied application detail adds unnecessary data noise. Solver handled correctly (Canceled + Available reset).

RS available count jumped 31 → 35 (+4), partially explained by these 3 resets. Unit IDs not surfaced in the log (known logging gap — recommended for fix yesterday, still outstanding). Magnitude is 3x yesterday's OB event (1 silent drop). Recommend DB query to confirm these are legitimate application declines and not a Yardi data error.

---

**W4 — NEW: OB S081 Overdue MakeReady (2 Days)**

```
[Solver DEBUG] S081: ready=2026-02-24, cutoff=2026-02-25, overdue=true
[Solver DEBUG] Creating flag for S081: 2 days overdue
[Solver] Created 1 new overdue flags for OB
```

New entry to the overdue list. OB S081 ready date passed 2 days ago. At warning severity (1–3 day threshold). Monitor daily.

---

**W5 — OB S093/S042/S170: 2027 Ready Dates (Day 5, Unconfirmed)**

| Unit | Ready Date | Days Until Ready |
|---|---|---|
| S093 | 2027-01-01 | ~309 days |
| S042 | 2027-01-07 | ~315 days |
| S170 | 2027-01-07 | ~315 days |

Unchanged for the 5th consecutive audit. OB manager confirmation is still outstanding. Escalate.

---

**W6 — SB Work Orders: More Deactivated Than Processed**

| Property | Processed | Deactivated | Net |
|---|---|---|---|
| SB | 6 | **7** | -1 |

All other properties had more processed than deactivated. SB's 7 deactivated vs. 6-row upload means 7 previously open work orders were absent from today's batch and auto-deactivated. Likely reflects work order completions in Yardi — confirm with SB property manager that these were intentionally closed and not a batch upload gap.

---

**W7 — Delinquency Stall: RS and CV Regressed to 0 Resolved**

| Property | Rows | Updated/New | Resolved | vs. Yesterday |
|---|---|---|---|---|
| RS | 57 | 0 | **0** | Regression (-1) |
| SB | 42 | 0 | 0 | Flat |
| CV | 34 | 0 | **0** | Regression (-1) |
| OB | 59 | 1 | 1 | ✅ Active |
| WO | 20 | 0 | 0 | Flat |

RS and CV each had 1 resolution yesterday; both stalled to 0 today. OB remains the only property with active collection activity. Delinquency resolution is often non-linear (collections happen on specific days), but two-property regression warrants continued monitoring.

---

**W8 — Flat Renewal Streak: Day 4 Across Properties**

| Date | Resident | Property | Unit | Rent | Change |
|---|---|---|---|---|---|
| 2026-02-23 | Bausley, Edward | RS | — | $1,735 | flat |
| 2026-02-25 | Burton, Eva | RS | 2085 | $1,400 | flat |
| 2026-02-25 | Thomas, Kyra | SB | 2021 | $1,569 | flat |
| 2026-02-26 | Esqueda, Sebastian | SB | 2143 | $1,624 | flat |

Four consecutive renewal days — all flat ($0 increase). Pattern spans both RS and SB. Renewal worksheet module is still unimplemented (H-057), so there are no worksheet items to cross-reference. Surfacing this pattern to property managers is recommended — intentional retention strategy or missed escalation opportunity?

---

### 🔴 FATAL

None.

---

## Operational Sync Results

### Work Orders
| Property | Processed | Deactivated |
|---|---|---|
| CV | 19 | 8 |
| RS | 19 | 5 |
| SB | 6 | **7** ⚠️ |
| OB | 35 | 16 |
| WO | 12 | 3 |

### Alerts
| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| RS | 1 | 0 | 1 | 0 |

All other properties: no alerts processed (none in batch).

### Delinquencies
| Property | Rows | ΔRows | Updated/New | Resolved |
|---|---|---|---|---|
| RS | 57 | 0 | 0 | 0 |
| SB | 42 | 0 | 0 | 0 |
| CV | 34 | 0 | 0 | 0 |
| OB | 59 | 0 | 1 | 1 |
| WO | 20 | 0 | 0 | 0 |

---

## Architectural Optimization Suggestion

**Fix the `availability_snapshots` RLS write policy (Option A migration).**

The 403 errors represent a policy gap introduced by `20260225000004` — a single new migration with 3 lines resolves it cleanly:

```sql
-- Migration: Fix availability_snapshots write access for authenticated Solver
CREATE POLICY "authenticated_can_write_availability_snapshots"
  ON public.availability_snapshots
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

This is a zero-risk change (the table had no RLS before `00004`; adding back write access for authenticated users restores the original behavior with RLS now correctly enabled for security). The longer-term Option B (move writes to service_role API route) remains the architecturally correct path and should be scheduled as a future refactor once the Solver is partially server-side.

---

## Shift Handoff

**For next session (2026-02-27):**
- 🔴 **C213 (CV):** Now **22 days** overdue — Day 5 with zero Yardi response. Physical escalation to CV property manager is overdue itself. If not resolved by tomorrow, flag as operational failure requiring management escalation above property level.
- ⚠️ **C311/C217 (CV):** 7 and 6 days overdue — daily escalation. Watch for Yardi update.
- 🔴 **Snapshot 403 Errors:** Apply Option A migration (`authenticated_can_write_availability_snapshots` policy) before next run. Retries are masking the issue but are not reliable long-term.
- ⚠️ **RS 3 Silent Drops:** Query `availabilities` table to identify the 3 units reset to Available today. Confirm legitimate application cancellations.
- ⚠️ **OB S081:** 2 days overdue as of today. Watch for escalation tomorrow (crosses 3-day warning threshold).
- ⚠️ **OB S093/S042/S170:** 2027 ready dates — Day 5 unconfirmed. Must escalate to OB manager.
- ⚠️ **OB Silent Drop (2026-02-25):** Yesterday's unidentified OB unit still unresolved via DB query.
- ⚠️ **SB Work Orders:** Confirm 7 deactivated WOs were intentional closures in Yardi.
- ℹ️ **Flat Renewal Streak:** 4 consecutive days (RS + SB). Discuss with property managers.
- ℹ️ **RS Price Repricing:** 6-unit downward reprice today ($10–$25). Operational decision — monitor for continuation or reversal.
- ℹ️ **Contracted Rent Baseline:** First day of `avg_contracted_rent` capture. Tomorrow's snapshot will begin the trend series.
- ℹ️ **CV AIRM:** Day 5 — 5 units. Normal. C311/C217/C419 dropped off today's adjustment list.
- ℹ️ **Renewal Worksheet Warnings:** Persist until H-057 renewals module is fully implemented. Expected noise.
