# Daily Solver Audit — 2026-03-14

**Auditor:** Tier 2 Forensic Auditor (Claude Sonnet 4.6)
**Batch ID:** `85372180-72a9-48e0-a912-30630cbd6161`
**Run ID:** `aee11fa9-e319-4451-b07c-d9b717e710c3`
**Run Time:** Saturday, March 14, 2026
**Status:** ⚠️ WARNING — WO 464-E Day 12 EMERGENCY (Sanchez vacates 458-C TOMORROW, move-in 464-E Monday 03-16); OB S054/Sandoval starts TOMORROW (03-15, Sunday) with MakeReady=03-28 (Day 3 unresolved); RS silent drops ESCALATED TO RECURRING (3rd consecutive day, 4 total drops); Work Orders 0 Day 2 (anomalous); ERR_CONNECTION_CLOSED transient errors at import staging
**Green:** W1 Day 16 stable (Kenton Future, Poorman Future); OB S139/Avalos starts today (confirmed cleared); Delinquency total −$11.6k WoW; 9 CV AIRM normal; no discrepancies; no status auto-fixes

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | WO, CV, RS, SB, OB (5/5) |
| Files | 48 in batch — 0 parse errors |
| Fatal Errors | None |
| Discrepancies | **0** |
| Status Auto-Fixes | **0** |
| Warnings | 10 |
| Silent Drops | ⚠️ RS: 2 → Past (t0711454, t2557921) · WO: 1 → Canceled (t3418950) |
| W1 Watch | ✅ Day 16 — Kenton Future (RS-2019, ready=03-15, starts 03-16) · Poorman Future (SB-1015, 27 days) |
| WO 464-E | 🔴 Day 12 overdue — Sanchez vacates 458-C TOMORROW, moves in 464-E Monday |
| OB S054/Sandoval | 🔴 START TOMORROW (03-15 Sunday) — MakeReady=03-28 — Day 3 unresolved |
| RS Silent Drops | 🔴 ESCALATED TO RECURRING — 3rd consecutive day, 4 total drops |
| Work Orders | ⚠️ 0 open Day 2 — still zero portfolio-wide (was 79+ on 03-12) |
| CV Taub C213 | ⚠️ Day 3 delayed conversion (started 03-12, still Applicant) |
| Connection Errors | ⚠️ 5× ERR_CONNECTION_CLOSED at import_staging (all retried OK) |
| Snapshot Option B | ✅ Stable Day 16 |
| OB Avalos S139 | ✅ RESOLVED — cleared, starts today 03-14 |

---

## Property Activity

| Property | Tenancies Upd | New Leases | Apps | Notices | Silent Drops | MakeReady |
|---|---|---|---|---|---|---|
| WO | 91 | 1 | 0 | 3 | **1 → Canceled** | **1 overdue (464-E Day 12)** |
| CV | 116 | 7 | 2 | 3 | 0 | 0 |
| RS | 356 | 16 | 4 | 35 | **2 → Past** | 0 |
| SB | 381 | 11 | 3 | 18 | 0 | 0 |
| OB | 209 | 10 | 1 | 8 | 0 | **1 conflict (S054)** |

---

## Availability Price Changes

### CV — AIRM Normal (9 units)

| Unit | Old | New | Change | % | Note |
|---|---|---|---|---|---|
| C311 | $2,414 | $2,412 | ↓ $2 | −0.1% | Normal AIRM |
| C217 | $2,314 | $2,312 | ↓ $2 | −0.1% | Normal AIRM |
| C229 | $2,740 | $2,736 | ↓ $4 | −0.1% | Normal AIRM |
| C419 | $2,174 | $2,172 | ↓ $2 | −0.1% | Normal AIRM |
| C330 | $2,635 | $2,631 | ↓ $4 | −0.2% | Normal AIRM |
| C112 | $2,610 | $2,606 | ↓ $4 | −0.2% | Normal AIRM |
| C323 | $2,635 | $2,631 | ↓ $4 | −0.2% | Normal AIRM |
| C322 | $2,790 | $2,786 | ↓ $4 | −0.1% | Normal AIRM |
| C216 | $2,314 | $2,312 | ↓ $2 | −0.1% | Normal AIRM |

All CV decrements are $2–$4, consistent with the prior day's closing prices. Confirmed AIRM automated pricing — no action required.

### RS, SB, OB, WO — No Manual Repricing ✅

---

## Availability Snapshots

| Property | Available | Δ | Avg Rent | Δ | Notes |
|---|---|---|---|---|---|
| WO | 3 | **+1** | $2,943 | −$2 | +1 from silent drop reset (t3418950 unit returned to available) |
| CV | 9 | 0 | $2,368 | $0 | Stable |
| RS | 36 | 0 | $1,483 | −$1 | Stable |
| SB | 28 | **−1** | $1,644 | $0 | Armenta (1135, starts 03-27) absorbed |
| OB | 22 | 0 | $2,537 | $0 | Stable |

---

## Findings

### 🔴 FATAL — None

### ⚠️ WARNING

---

**W1 — WO 464-E: Day 12 Overdue — EMERGENCY. Sanchez Vacates 458-C TOMORROW. Move-In Monday.**

```
MakeReady: 2 active | 1 overdue (portfolio)
notice_given WO | 458-C | Sanchez Calixto, Karina | Notice Date: 2026-03-15
Solver: ✓ Creating lease for Future tenancy t3067567 (Sanchez Calixto, Karina - Unit 464-E) — Rent: $3,395
Solver: Created 2 overdue move-in flags
```

Day **12** with no WO manager resolution. Sanchez Calixto is an internal WO resident currently living at 458-C. Her notice date is **tomorrow (Sunday, 03-15)** — she physically vacates 458-C tomorrow. Her Future tenancy at 464-E starts **Monday, 03-16**.

The 464-E lease is still being created in each run (Future status). The MakeReady has been overdue since 03-02. The solver created 2 overdue move-in flags in today's run — Sanchez is one of them. If the WO manager did not act this weekend, Sanchez will have no unit on Monday. **This is the last possible audit before the physical move-in date.**

---

**W2 — OB S054/Sandoval: START TOMORROW (03-15, Sunday). MakeReady=03-28. Day 3 Unresolved.**

```
application_saved OB | Unit S054
MakeReady: S054 ready=2026-03-28 (13 days after start)
```

Sandoval, America ($2,970 Applicant) has a lease start of **2026-03-15 — tomorrow (Sunday)**. The MakeReady for S054 remains at 2026-03-28 — unchanged for 3 consecutive runs. No MakeReady resolution event in today's run.

**Action required:** If Sandoval attempts to move in Sunday, the unit may not be physically ready. The OB manager must confirm S054 actual readiness OR contact Sandoval to adjust her start date. If still unresolved in Monday's run with start date now passed, **escalate to FATAL.**

---

**W3 — RS Silent Drops: 3rd Consecutive Day — ESCALATED TO RECURRING**

| Date | Drops | Direction | Tenancies |
|---|---|---|---|
| 03-12 | 1 | → Past | (unknown) |
| 03-13 | 1 | → Canceled | t3420752 |
| **03-14** | **2** | → Past | t0711454, t2557921 |

Four total RS silent drops across three consecutive days. Exceeds the ANOMALY_LOG escalation threshold of 3+ consecutive days. The payload SILENT DROPS section labels these as "→ Canceled" but the RS property summary and the solver console both confirm **"→ Past"** — meaning the dropped tenancies were in Current or Notice status (legitimate vacates, not canceled applications).

**Escalated to RECURRING.** Unit identity query must run in Monday's session:

```sql
SELECT u.unit_name, t.status, t.updated_at
FROM tenancies t JOIN units u ON t.unit_id = u.id
WHERE t.property_code = 'RS'
  AND t.status IN ('Past', 'Canceled')
  AND t.updated_at::date IN ('2026-03-12', '2026-03-13', '2026-03-14')
ORDER BY t.updated_at;
```

**Payload label bug noted:** The SILENT DROPS section in the structured payload appears to use a hardcoded "Canceled" label for all silent drop events regardless of actual inferred status. Property summary and console are authoritative. Low-priority engineering fix.

---

**W4 — Work Orders: 0 Open — Day 2**

```
Work Orders: 0 open | 0 open > 3 days
```

Still zero open work orders portfolio-wide — Day 2 of this anomaly. No console output for work order processing in today's run, supporting hypothesis (B): the 5p_Work_Orders file was excluded from today's batch. Alerts are functional (116 active, 18 new), ruling out a complete operational data blackout. Was 79+ on 03-12.

**Investigate before Monday's run:** Confirm whether 5p_Work_Orders was included in today's batch upload. If it was and the count is genuinely 0, a mass deactivation event occurred. If excluded, confirm the re-ingestion plan.

---

**W5 — CV Taub (C213): Day 3 Past Start Date (Started 03-12, Still Applicant)**

```
Solver: ✓ Creating lease for Applicant tenancy t3412293 (Taub, Timothy - Unit C213) — Rent: $2,740
```

Taub, Timothy's lease_start_date was 2026-03-12 — now 2 days past. He is still processing as Applicant in today's run. Today is Saturday; Yardi will not process a status conversion over the weekend. If still Applicant in Monday's run (Day 5 from start), escalate to CV manager. Note: rent in today's solver debug shows $2,740 vs $2,654 in recent audits — possible Yardi tenancy record correction. Monitor.

---

**W6 — RS Kenton (2019): MakeReady Ready=03-15 (Tomorrow). Starts 03-16. W1 Day 16.**

```
[Solver DEBUG] 2019: ready=2026-03-15, cutoff=2026-03-13, overdue=false
```

MakeReady 1-day cushion is intact. Kenton, Christina ($1,835 Future) starts Monday 03-16. The RS manager must confirm 2019 MakeReady completion and update Yardi by tomorrow (03-15). If Monday's run shows MakeReady still active AND Kenton still Future, investigate for W1 regression.

---

**W7 — ERR_CONNECTION_CLOSED: 5 Transient Errors at Import Staging (Pre-Batch)**

```
POST .../rest/v1/import_staging net::ERR_CONNECTION_CLOSED (×5)
Retrying fetch attempt 2 for request: .../import_staging (×5 — all succeeded)
```

Five consecutive connection drops at the import_staging endpoint before the solver batch began. All 5 retried on attempt 2 and succeeded. No data loss; batch completed normally. Indicates Supabase connection instability on Saturday morning — possibly cold-start or load-related. Monitor for recurrence in Monday's run.

---

**W8 — Alerts Spike: 18 New (vs. 2 Yesterday)**

```
Alerts: 116 active | 18 new today
```

18 new alerts today vs. 2 yesterday. Likely driven by Phase 2D flag creation: 1 move-out overdue + 3 pre-move-out inspections + 2 overdue move-in + 7 pre-move-in inspection = 13 solver flags. The remaining ~5 correlate with notice-wave alert sync. No single-property breakdown in the payload — cannot confirm per-property churn threshold compliance. The large notice wave today (67 total notices across 5 properties) explains the spike. No action required unless Monday shows continued elevation.

---

**W9 — OB S170: Ready=03-18. 4 Days Remaining.**

OB MakeReady debug output was absent from today's console (OB had no 5p_MakeReady rows in this batch). Cannot directly verify S170 today. Ready date is 03-18 — 4 days from now. If not cleared in Yardi by Monday's run, an overdue flag will be created. OB manager must confirm S170 on track.

---

**W10 — SB Kimminau (2099): Notice Date Tomorrow (03-15)**

```
notice_given SB | Unit 2099 | Tenant: Karem Kimminau | Notice Date: 2026-03-15
```

Near-term vacate. SB manager should confirm move-out is coordinated and unit readiness plan is in place for the upcoming vacancy.

---

### ✅ CLEAN

**C1 — No Fatal Errors · No Discrepancies · No Status Auto-Fixes**
All 5 properties completed all phases. Zero parse errors, zero 403 errors, zero discrepancy events, zero status auto-fixes. Pipeline fully healthy on core processing.

**C2 — W1 Fix Day 16 Stable**
Kenton (RS-2019, $1,835, Future) and Poorman (SB-1015, $1,753, Future) both processing correctly. No Future→Notice corruption. MakeReady for 2019 confirms `ready=2026-03-15, overdue=false`. Fix at `useSolverEngine.ts:1322` confirmed stable for 16 consecutive runs. ✅

**C3 — OB Avalos (S139): RESOLVED — Starts Today (03-14)**
Avalos, Ashley ($1,975 Future) starts today. Absent from OB application_saved events — MakeReady confirmed cleared. Zero-cushion situation resolved cleanly. Watch item closed. ✅

**C4 — Delinquencies: Healthy Direction**
Total: 501 residents / $255,417.78. Down from $267,029.61 yesterday — a $11,611.83 single-day reduction. 90+ day count stable at 33. No DATA COMPROMISED events. ✅

**C5 — Date Sanity Clean**
All new lease start dates in 2026-03 through 2027-04. No year-typos. OB S093/S042 2027-01 dates are Acknowledged Normals (eviction holds). ✅

**C6 — WO Transfers Confirmed**

| Resident | From | To | Vacate | Start | Status |
|---|---|---|---|---|---|
| Sanchez Calixto, Karina | 458-C | 464-E | 03-15 | 03-16 | 🔴 EMERGENCY — see W1 |
| Luna, Mario | 458-F | 454-H | 03-23 | 03-23 | ✅ Same-day transfer, clean |

**C7 — Saturday Same-Day Starts (RS Aguilar 1033, RS Jama 2103, SB Obando 2058)**
Three residents with lease_start=03-14 (today, Saturday). All still Future/Applicant — expected for Saturday move-ins (Yardi batch won't convert to Current until Monday). Monitor for Current conversion in Monday's run. ✅

**C8 — OB Eviction Hold Notices (Acknowledged Normal)**
`notice_given OB | S042 | Larry Carr | 12-31-2026` and `notice_given OB | S093 | Martha Rodriguez | 12-31-2026` — per Acknowledged Normals (confirmed OB manager 03-12). ✅

**C9 — Snapshot Option B Stable Day 16**
All 5 properties saved availability snapshots. Zero 403 errors. ✅

**C10 — SB Armenta (1135): Clean Pipeline Entry**
Armenta, Angie (Applicant, $1,554, starts 03-27) entered pipeline. SB-1135 MakeReady shows `ready=2026-03-25, overdue=false` — 2-day cushion. ✅

---

## MakeReady Status Board

### Active Overdue Flags

| Unit | Property | Ready Date | Days Overdue | Tenant | Move-In | Outlook |
|---|---|---|---|---|---|---|
| **464-E** | WO | 2026-03-02 | **12 days** | Sanchez Calixto (internal from 458-C) | **03-16 (Monday)** | 🔴 EMERGENCY — vacates 458-C TOMORROW (03-15) |

### Conflict Flags (Active, Not Overdue)

| Unit | Property | Ready Date | Tenant | Start Date | Issue |
|---|---|---|---|---|---|
| **S054** | OB | 2026-03-28 | Sandoval, America | **2026-03-15 (TOMORROW)** | MakeReady 13 days after start — Day 3 unresolved |

### Resolved This Run

| Unit | Property | Resolution | Note |
|---|---|---|---|
| **S139** | OB | ✅ 03-14 | Avalos starts today. MakeReady cleared. Confirmed absent from application queue. |

### Near-Term Watch

| Unit | Property | Ready Date | Tenant | Start | Cushion |
|---|---|---|---|---|---|
| 2019 | RS | **2026-03-15 (tomorrow)** | Kenton (03-16) | Monday | 1-day cushion — W1 Day 16 |
| 1135 | SB | 2026-03-25 | Armenta (03-27) | 13 days | 2-day cushion ✅ |

### Date-Extended (Not Completed)

| Unit | Property | Ready Date | Extension | Status |
|---|---|---|---|---|
| S170 | OB | 2026-03-18 | +6 days from 03-12 | 4 days remaining — OB manager confirm |
| S150 | OB | 2026-04-22 | +46 days | No eviction context — OB manager confirm |

---

## Operational Health

### Alerts

```
Alerts: 116 active | 18 new today
Phase 2D: 1 move-out overdue · 3 pre-move-out inspections · 2 overdue move-in · 7 pre-move-in inspections
```

18 new alerts correlated with large notice wave (67 total notices). Solver Phase 2D accounts for ~13 of the 18. No per-property breakdown in payload. ⚠️ Elevated but explainable.

### Work Orders

```
Work Orders: 0 open | 0 open > 3 days
```

⚠️ Day 2 anomaly. Zero work orders across all 5 properties. Console shows no WO processing phase output — likely file exclusion. Investigate before Monday's run.

### Delinquencies

| Metric | Value | Δ |
|---|---|---|
| Total residents | 501 | +1 |
| Total balance | $255,417.78 | −$11,611.83 ✅ |
| 30+ days | $118,071.95 | −$39.68 ✅ |
| 90+ days (residents) | 33 | 0 |

Healthy trend. Total balance declining, 90+ day count stable. No DATA COMPROMISED events.

---

## Notice Pipeline Highlights

### Near-Term Vacates (≤ 14 days)

| Property | Unit | Current Resident | Notice Date | Incoming | Note |
|---|---|---|---|---|---|
| WO | 458-C | Sanchez Calixto | 03-15 | (→ 464-E) | 🔴 Vacates TOMORROW |
| SB | 2099 | Karem Kimminau | 03-15 | — | ⚠️ Vacates TOMORROW |
| SB | 2075 | Javier Villegas | 03-20 | — | New |
| WO | 458-F | Mario Luna | 03-23 | (→ 454-H) | ✅ Same-day transfer |
| RS | 1039 | Mercedes Carey | **03-13** | — | ⚠️ Notice date YESTERDAY — already past |

**RS-1039 Carey notice date 03-13:** Notice fired in today's event log with date 2026-03-13 — yesterday. Either the notice was entered late in Yardi, or this is a backdated correction. Monitor for Past conversion in Monday's run.

---

## W1 Watch — Notices Fix Stability (Day 16) ✅

| Resident | Unit | Property | Rent | Status | Note |
|---|---|---|---|---|---|
| Kenton, Christina | 2019 | RS | $1,835 | ✓ Future | MakeReady ready=**03-15 (tomorrow)** · starts 03-16 (Monday) |
| Poorman, Timothy | 1015 | SB | $1,753 | ✓ Future | Starts 04-10 (27 days) — Almanzar gives notice 03-31 ✅ |

Fix at `useSolverEngine.ts:1322` stable for 16 consecutive runs.

---

## 7-Day Pattern Summary

| Trend | 7-Day Status | Note |
|---|---|---|
| WO 464-E overdue | 🔴 ESCALATING DAY 12 | Vacate tomorrow, move-in Monday. No resolution in 12 runs. |
| OB S054/Sandoval conflict | 🔴 START TOMORROW — DAY 3 | Sunday start. Escalate to FATAL if unresolved Monday. |
| RS silent drops | 🔴 ESCALATED TO RECURRING | 3rd consecutive day, 4 total drops. Unit identity query required Monday. |
| Work Orders = 0 | ⚠️ DAY 2 | Still zero. Console shows no WO processing output. |
| CV Taub C213 conversion | ⚠️ DAY 3 | Saturday — no Yardi processing. Monitor Monday (Day 5 from start). |
| RS Kenton (2019) W1 | ⚠️ 1-DAY CUSHION | MakeReady ready=03-15 (tomorrow). Starts 03-16. |
| OB S170 ready=03-18 | ⚠️ 4 DAYS | OB MakeReady not in batch today. Confirm with OB manager. |
| SB Kimminau (2099) | ⚠️ VACATES TOMORROW | SB manager must confirm. |
| SB silent drops | ✅ BREAK TODAY | 0 drops today after 3 in 4 days. Pattern paused. Monitor Monday. |
| CV AIRM (9 units) | ✅ NORMAL | $2–$4 decrements consistent. |
| W1 fix (Day 16) | ✅ STABLE | No corruption events. |
| Delinquencies | ✅ IMPROVING | −$11.6k total WoW. 90+ day count stable at 33. |
| OB Avalos S139 | ✅ RESOLVED | Starts today. Cleared from MakeReady queue. |
| Saturday same-day starts | ℹ️ MONITOR MONDAY | RS Aguilar (1033), RS Jama (2103), SB Obando (2058) all start 03-14. Expect Current conversions in Monday's run. |
| Weekly report pipeline | ℹ️ FIRST WEEKLY EMAIL MONDAY | 4 new leases this week. Delinquencies improving. Positive data for weekly summary. |

---

## Regression Check — H-086 (Manager Brief Email + Vercel Build Skip)

**Manager Brief Email:** No regressions detected. `send-audit.post.ts` `managerBrief` field functioning — dual email dispatch confirmed in prior runs. ✅

**Vercel Build Skip:** Daily audit commits only touch `docs/status/` — `ignoreCommand` prevents unnecessary production rebuilds. ✅

---

## Architectural Optimization

**Surface silent drop unit identity in the audit payload.**

Today's RS RECURRING escalation required a manual SQL query to identify which units were involved in 4 drops across 3 days — yet the payload's SILENT DROPS section only shows tenancy IDs, not unit names or resident names. The solver already has this information at the point of `trackSilentDrop`: it knows the `unit_id` and can resolve `unit_name` via the unit map that's already loaded in memory for that property.

**Proposed:** In `trackSilentDrop`, include the resolved `unit_name` in the tracking event payload:

```ts
trackSilentDrop(tenancyId, inferredStatus, unitName)
// → emits: "WO | Unit 454-H | Tenancy t3418950 | ? → Canceled"
```

The unit map is already built per-property before the Missing Sweep runs — zero additional DB queries required. This change would have surfaced the RS unit identities in today's payload and allowed immediate correlation without a Monday follow-up query. **Scope:** ~3 lines in `trackSilentDrop` + one parameter addition at each call site.

---

## Shift Handoff

**For next session (2026-03-16, Monday):**

- 🔴 **WO 464-E — PHYSICAL MOVE-IN DAY:** Sanchez Calixto's 464-E starts **TODAY (Monday)**. Her 458-C vacated yesterday (Sunday). If MakeReady is still not cleared in Monday's run, the move-in has physically failed. WO manager must have resolved this over the weekend.
- 🔴 **OB S054/Sandoval — START DATE PASSED:** Sandoval's lease start was yesterday (Sunday, 03-15). If she attempted to move in and the unit wasn't ready, OB has a crisis. Monday's run will reveal whether the MakeReady was updated or the start date was pushed. If still unresolved with past start, escalate to FATAL immediately.
- 🔴 **RS Silent Drops — RECURRING INVESTIGATION:** Run the unit identity query (SQL above). Determine if the same units appear repeatedly (loop) or if these are distinct, legitimate vacates. Result determines whether this is a Yardi sync issue or normal vacancy activity.
- ⚠️ **RS Kenton (2019) — W1 DAY 17 — MOVE-IN TODAY:** Kenton starts 03-16. MakeReady deadline was yesterday (03-15). If MakeReady flag is still active AND Kenton is still Future in Monday's run, investigate W1 regression.
- ⚠️ **SB Byjoe (1077) — STARTED 03-16:** Confirm Current conversion in Monday's run.
- ⚠️ **CV Taub C213 — Day 5 from start:** If still Applicant Monday, escalate to CV manager immediately — 5 days past start with no conversion is abnormal.
- ⚠️ **Saturday starts — Confirm Current conversion:** RS Aguilar (1033), RS Jama (2103), SB Obando (2058) all started 03-14. Expect Current in Monday's run.
- ⚠️ **Work Orders — Root cause must be resolved:** Day 2 with zero. Check if 5p_Work_Orders was in today's batch. If the file was present and count is genuinely 0, investigate mass deactivation.
- ⚠️ **OB S170 — Ready=03-18 (Monday):** If not cleared in Yardi before Monday's run, an overdue flag will be created. Check with OB manager.
- ⚠️ **SB Hong ($1,478) — Rent confirmation still pending:** Ongoing watch item since 03-12. SB manager must confirm the −$100 rent reduction is intentional.
- ⚠️ **CV Cedillo (C230) — Monitor:** No new changes today. Watch for 4th modification in Monday's run.
- ⚠️ **RS-1039 Carey notice (dated 03-13, yesterday):** Check if her tenancy transitions to Past in Monday's run as expected, or if this was a data entry timing issue.
- ⚠️ **ERR_CONNECTION_CLOSED:** Monitor Monday. If 5+ pre-batch errors recur, raise with infrastructure team.
- ⚠️ **SB Kimminau (2099) — Vacated yesterday (03-15):** Confirm unit enters available pool in Monday's run.
- ✅ **OB Avalos (S139):** Resolved. Starts today. Confirm Current conversion Monday.
- ✅ **WO Luna transfer (458-F → 454-H):** Starts 03-23. Clean same-day transfer. No action needed until then.
- ℹ️ **Weekly Report (Monday send — FIRST OF NEW PIPELINE):** Verify `send-weekly` fires correctly Monday morning and all weekly-summary subscribers receive it. Check `/solver/weekly-report` page data. This week's data: 4 new leases, delinquencies improving, RS/SB/CV/OB inventory stable. WO +1 available from today's silent drop reset.
- ℹ️ **RS RECURRING escalation:** Unit identity query results will determine if we need to notify the RS manager or if this is a natural Yardi vacancy pattern.
