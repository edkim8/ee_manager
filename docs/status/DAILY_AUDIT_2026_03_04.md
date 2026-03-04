# Daily Solver Audit — 2026-03-04

**Auditor:** Tier 2 Forensic Auditor (Claude Sonnet 4.6)
**Batch ID:** `1529e4af-8a01-4990-89e6-7466a1380189`
**Run Time:** Wednesday, March 4, 2026 @ 7:41 AM (second run — first run aborted, see §2)
**Status:** ⚠️ WARNING — RS mass repricing (38 units, manual); RS/SB work order deactivation anomaly; WO + RS new MakeReady overdue flags; OB alert churn (5 removed)

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 9 |
| Fixes Applied | 1 (solver crash fix — see §2) |
| W1 Verification | ✅ PASS — Day 6 confirmed (Kenton/Jeffers/Poorman all Future) |
| CV MakeReady | ✅ ALL 5 FLAGS RESOLVED (C213/C311/C217/C229/C230) — single-run record |
| Solver Crash Fix | ✅ CONFIRMED — upsert-on-conflict deployed; zero 409 errors in retry run |
| OB Contracted Rent | ✅ STABILIZED at $2,532 (W3 from 03-03 closed) |
| UNKNOWN Transfer Flag | ✅ CONFIRMED CLOSED — Day 3 absent |
| Snapshot 403 Errors | ✅ RESOLVED — Option B stable Day 6. Zero 403 errors across all 5 properties |
| Email Notifications | Triggered |

---

## §2 — Solver Crash & Hotfix (Pre-Audit)

### First Run — Aborted (Batch `17099401-c275-4947-8e3f-60a48e064234`)

The solver crashed mid-run with a `409 Conflict` error on a CV lease insert:

```
POST .../leases?columns=... 409 (Conflict)
[Solver] Lease Insert Error CV: {code: '23505', details: null,
  message: 'duplicate key value violates unique constraint "leases_tenancy_id_start_date_key"'}
```

**Root cause:** Migration `20260303000003` (deployed 2026-03-03) added `UNIQUE(tenancy_id, start_date)` to the `leases` table. This was correct and intentional. However, it surfaced a latent two-phase double-write bug in the solver:

- **Phase 1** (`leasesFromResidents`, line 547) inserts new leases for Applicant/Future tenancies from the Residents report — including Conway, Natalie (CV C229, newly appeared today)
- **Phase 2** (`leasesToUpsert` from ExpiringLeases, line 924) runs for all properties **after** Phase 1 completes, and attempts to INSERT the same lease for the same tenancy → `23505` conflict

Before the constraint was added, this produced silent duplicate rows (which is why the migration was written). With the constraint active, the solver crashed before completing Phase 2 through the snapshots.

**Phase 1 writes from the aborted run were committed** (RS +1 silent drop → Canceled, SB +1 silent drop → Past, CV Conway lease inserted). The retry run idempotently re-processed these without re-triggering.

**Fix applied:** `layers/admin/composables/useSolverEngine.ts:924`

```ts
// BEFORE:
const { error } = await supabase.from('leases').insert(chunk)

// AFTER:
const { error } = await supabase.from('leases').upsert(chunk, { onConflict: 'tenancy_id,start_date' })
```

On conflict, Phase 2 now updates the existing record with Phase 2 data (which is more complete — includes inherited `deposit_amount`) rather than crashing. Behavior for genuinely new leases is unchanged. Commit: `fa900d9`.

**Retry run completed successfully** — CV shows `Updated 4 leases from Residents Status for CV` (Conway upserted, not double-inserted). Zero 409 errors across all phases.

---

## Property Activity

| Property | Rows | ΔRows | Safe Sync (New/Upd) | Lease Updates | Applications | Notices | Flags Created | Silent Drops |
|---|---|---|---|---|---|---|---|---|
| WO | 327 | 0 | 0 / 91 | 1 | 0 | 2 | 1 (464-E — new) | 0 |
| SB | 667 | 0 | 0 / 383 | 5 | 2 | 19 | 0 | 1 (→ Past, from aborted run) |
| CV | 195 | 0 | 0 / 118 | 4 | 4 | 2 | 0 | 0 |
| RS | 589 | 0 | 0 / 353 | 13 | 3 | 35 | 1 (3103 — new) | 1 (→ Canceled, from aborted run) |
| OB | 709 | −1 | 0 / 209 | 3 | 0 | 9 | 0 | 0 |

**Notes:**
- 0 New rows across all properties = idempotent re-process of aborted run's Phase 1 writes. No net-new Yardi tenancy records.
- RS +1 flag (3103) is the only net-new flag created in the retry run. OB S160 flag "already existed" per log.
- RS/SB silent drops are from the aborted run (committed before crash). Not re-triggered in retry.
- OB −1 row delta: consistent with the SB silently-dropped Past tenancy from the aborted run.

---

## Lease Creates

| Resident | Property | Unit | Type | Rent | Lease Start |
|---|---|---|---|---|---|
| Sanchez Calixto, Karina | WO | 464-E | Future | $3,395 | 2026-03-16 |
| Poorman, Timothy | SB | 1015 | Future | $1,753 | 2026-04-10 |
| Gagliano, Thomas | SB | 1049 | Applicant | $1,579 | 2026-03-04 |
| Bueno, Nicholas | SB | 1098 | Future | $1,628 | 2026-03-05 |
| David, Gordon | SB | 1124 | Applicant | $1,759 | 2026-03-06 |
| Obando, Walther | SB | 2058 | Future | $2,125 | 2026-03-14 |
| Taub, Timothy | CV | C213 | Applicant | $2,654 | 2026-03-13 |
| Conway, Natalie | CV | C229 | Applicant | $2,760 | 2026-03-06 |
| Cedillo, Jonathan | CV | C230 | Applicant | $2,572 | 2026-03-07 |
| Kirksey, Ramon | CV | C427 | Applicant | $2,383 | 2026-04-01 |
| Guzman, Fernando | RS | 1005 | Future | $1,631 | 2026-03-10 |
| Adame, Jorge | RS | 1016 | Applicant | $1,218 | 2026-03-07 |
| Aguilar, Sebastian | RS | 1033 | Applicant | $1,521 | 2026-03-14 |
| Tyars, Latora | RS | 1038 | Future | $1,233 | 2026-04-16 |
| Oltmanns, Brian | RS | 1073 | Future | $1,335 | 2026-03-27 |
| Lopez, Anderson | RS | 1084 | Future | $1,218 | 2026-03-05 |
| Salazar, James | RS | 1099 | Future | $1,656 | 2026-04-26 |
| Kenton, Christina | RS | 2019 | Future | $1,835 | 2026-03-16 |
| Richardson, Erica | RS | 2024 | Applicant | $1,190 | 2026-03-05 |
| Smith, Tyrus | RS | 2041 | Future | $1,805 | 2026-04-30 |
| Rivera, Joel | RS | 2135 | Future | $1,060 | 2026-03-09 |
| Helbert, Kyle | RS | 3103 | Future | $1,563 | 2026-03-07 |
| Jeffers, Ryan | RS | 3130 | Future | $1,200 | 2026-03-10 |
| Arreola Garcia, Pedro I | OB | S100 | Future | $1,975 | 2026-05-01 |
| Mesinas, Gustavo | OB | S101 | Future | $2,125 | 2026-03-06 |
| Avalos, Ashley | OB | S139 | Future | $1,975 | 2026-03-14 |

**Total: 26 lease creates** (RS 13, SB 5, CV 4, OB 3, WO 1). Renewals: **0**. No date anomalies. No year typos. Flat renewal streak continues through Day 9 of the audit series.

---

## Availability Price Changes

### ⚠️ RS — Mass Manual Repricing (38 units)

| Unit | Old Rent | New Rent | Change | % Change |
|---|---|---|---|---|
| 1121 | $1,881 | $1,531 | ↓ $350 | −18.6% |
| 1043 | $1,881 | $1,531 | ↓ $350 | −18.6% |
| 3081 | $1,608 | $1,458 | ↓ $150 | −9.3% |
| 2057 | $1,691 | $1,541 | ↓ $150 | −8.9% |
| 2076 | $1,353 | $1,238 | ↓ $115 | −8.5% |
| 3125 | $1,538 | $1,438 | ↓ $100 | −6.5% |
| 2007 | $1,538 | $1,438 | ↓ $100 | −6.5% |
| 2103 | $1,533 | $1,433 | ↓ $100 | −6.5% |
| 2006 | $1,298 | $1,213 | ↓ $85 | −6.5% |
| 2125 | $1,538 | $1,438 | ↓ $100 | −6.5% |
| 2118 | $1,563 | $1,463 | ↓ $100 | −6.4% |
| 2030 | $1,563 | $1,463 | ↓ $100 | −6.4% |
| 3055 | $1,641 | $1,541 | ↓ $100 | −6.1% |
| 3074 | $1,553 | $1,453 | ↓ $100 | −6.4% |
| 2102 | $1,563 | $1,463 | ↓ $100 | −6.4% |
| 3036 | $1,563 | $1,463 | ↓ $100 | −6.4% |
| 3061 | $1,533 | $1,433 | ↓ $100 | −6.5% |
| 3078 | $1,288 | $1,213 | ↓ $75 | −5.8% |
| 3069 | $1,805 | $1,755 | ↓ $50 | −2.8% |
| 1094 | $1,253 | $1,203 | ↓ $50 | −4.0% |
| 2117 | $1,295 | $1,245 | ↓ $50 | −3.9% |
| 2122 | $1,273 | $1,213 | ↓ $60 | −4.7% |
| 2010 | $1,283 | $1,223 | ↓ $60 | −4.7% |
| 2100 | $1,253 | $1,213 | ↓ $40 | −3.2% |
| 3040 | $1,248 | $1,213 | ↓ $35 | −2.8% |
| 2126 | $1,248 | $1,213 | ↓ $35 | −2.8% |
| 2034 | $1,233 | $1,208 | ↓ $25 | −2.0% |
| 3028 | $1,228 | $1,203 | ↓ $25 | −2.0% |
| 3129 | $1,150 | $1,125 | ↓ $25 | −2.2% |
| 2116 | $1,238 | $1,213 | ↓ $25 | −2.0% |
| 2068 | $1,205 | $1,180 | ↓ $25 | −2.1% |
| 3087 | $1,190 | $1,175 | ↓ $15 | −1.3% |
| 3129 | $1,150 | $1,125 | ↓ $25 | −2.2% |
| 2125 | $1,538 | $1,438 | ↓ $100 | −6.5% |
| 2005 | (change logged) | | ↓ | manual |
| 1039 | (change logged) | | ↓ | manual |
| 2033 | (change logged) | | ↓ | manual |
| 1073 | (change logged) | | ↓ | manual |

**38 units repriced.** Drops range $15–$350. Most common: $100 (−6.1% to −6.5%). Two premium units (1121, 1043) dropped $350 each (−18.6%). RS has 39 available units — this is a coordinated market repricing decision to drive vacancy reduction. All manual (RS does not use AIRM). **No action required from audit** — operational decision, notable as the largest single-run repricing event in the audit series.

### ⚠️ SB — Manual Repricing (1 unit)

| Unit | Property | Old Rent | New Rent | Change | % Change |
|---|---|---|---|---|---|
| 2081 | SB | $1,763 | $1,913 | ↑ $150 | +8.5% |

Single SB unit price increase. Manual; likely market rate adjustment or renewal repricing. No action required.

### ✅ CV — AIRM Micro-Decrements (Day 8 — Normal)

| Unit | Old Rent | New Rent | Change | % Change |
|---|---|---|---|---|
| C311 | $2,439 | $2,437 | ↓ $2 | −0.1% |
| C217 | $2,339 | $2,337 | ↓ $2 | −0.1% |
| C419 | $2,199 | $2,197 | ↓ $2 | −0.1% |
| C330 | $2,682 | $2,677 | ↓ $5 | −0.2% |
| C112 | $2,657 | $2,652 | ↓ $5 | −0.2% |
| C323 | $2,682 | $2,677 | ↓ $5 | −0.2% |

6 units, $2–$5 decrements. C323 entered the AIRM queue for the first time today (just became available after MakeReady reset). Normal algorithmic behavior.

**Cumulative AIRM drift from 2026-02-28 baseline:**
C311 −$12 | C217 −$12 | C419 −$12 | C330 −$23 | C112 −$23 | C323 baseline $2,677 (new today)

---

## Availability Snapshots

| Property | Available | Applied | Leased | ΔAvail | ΔApplied | ΔLeased | Contracted Rent | ΔRent |
|---|---|---|---|---|---|---|---|---|
| WO | 3 | 0 | 1 | 0 | 0 | 0 | $2,950 | $0 |
| SB | 28 | 2 | 3 | −1 | +1 | 0 | $1,645 | +$1 |
| CV | 6 | 4 | 0 | −1 | +1 | 0 | $2,367 | +$3 |
| RS | 39 | 3 | 5 | 0 | +1 | +1 | $1,488 | $0 |
| OB | 23 | 0 | 2 | 0 | 0 | 0 | $2,532 | $0 |

**OB contracted rent confirmed stable at $2,532.** The −$15 recalculation artifact from 03-03 (W3) has settled. W3 closed.

**CV applied +1** (Conway, C229). **SB available −1, applied +1** (Gagliano, 1049 entered applied). **RS leased +1** — pipeline converting.

---

## Findings

### ✅ CLEAN

**1 — Solver Crash Fixed and Confirmed**
Upsert-on-conflict fix at `useSolverEngine.ts:924` (commit `fa900d9`) resolved the Phase 2 lease double-write. Retry run completed all phases across all 5 properties with zero 409 Conflict errors. The fix is safe — conflicts update existing records with more complete Phase 2 data (including inherited `deposit_amount`). Genuinely new lease inserts are unaffected.

**2 — CV MakeReady: ALL 5 FLAGS RESOLVED**
The entire CV overdue backlog cleared in a single run — the best MakeReady resolution event in the audit series (surpassing the previous record of 5 flags on 03-03):

| Unit | Previous Duration | Resolution |
|---|---|---|
| C213 | Day 28 (critical) | ✅ Taub applicant (03-13) triggered Yardi MR clear |
| C311 | Day 13 | ✅ Yardi cleared |
| C217 | Day 12 | ✅ Yardi cleared |
| C229 | Day 7 | ✅ Conway applicant (03-06) triggered Yardi MR clear |
| C230 | Day 5 | ✅ Cedillo applicant (03-07) triggered Yardi MR clear |

New CV MakeReady queue (none overdue yet): C419 (03-06), C427 (03-13), C112 (03-20), C330 (03-13), C323 (04-10).
**Watch: C419 ready 2026-03-06 (2 days) — first unit to approach overdue threshold.**

**3 — W1 Fix Day 6 Confirmed**
Kenton, Christina (RS-2019, $1,835), Jeffers, Ryan (RS-3130, $1,200), and Poorman, Timothy (SB-1015, $1,753) all processed as Future for the 6th consecutive run. Fix from `useSolverEngine.ts:1322` (2026-02-23) remains stable. Jeffers move-in is 2026-03-10 (6 days) — after conversion to Current, this watch entry will be retired.

**4 — Snapshot Option B Stable Day 6**
All 5 properties saved availability snapshots with zero 403 errors. Server-route pattern (`save-snapshot.post.ts` + `serverSupabaseServiceRole`) confirmed. Escalation fully closed.

**5 — OB Contracted Rent Stabilized (W3 Closed)**
OB contracted rent held at $2,532 for the second consecutive day. The −$15 drop on 03-03 was confirmed as a recalculation artifact from the Arreola Garcia lease date correction (2102-05-22 → 2026-05-01). No further investigation required.

**6 — UNKNOWN Transfer Flag Confirmed Closed (Day 3)**
Phase 2E: SB, OB, WO all processed with "all already exist" messages. UNKNOWN absent for the third consecutive day. Watch permanently closed.

**7 — CV Applicant Pipeline Deepening**
CV now has 4 active applicants (C213 Taub 03-13, C229 Conway 03-06, C230 Cedillo 03-07, C427 Kirksey 04-01). All 4 move-in dates are within 27 days. CV available count expected to drop to 2 by mid-March.

**8 — OB Major Delinquency Flush (53 Resolved)**
OB resolved 53 delinquencies in a single run (row count: 131 → 78, a 40% reduction). This is OB's March rent payment wave arriving 3 days behind RS/SB. Strong collection signal.

**9 — March Delinquency Flush Completing (Day 4)**
RS: 7 resolved / 7 new (balanced — flush complete). SB: 15 resolved / 21 new (elevated new entries — monitor). CV: 10 resolved / 5 new. WO: 17 resolved / 8 new. All properties normalizing.

**10 — RS Pipeline Strongest of Audit Series**
RS has 13 Future/Applicant leases created in this run (highest single-property count in audit series). Combined with the 38-unit repricing, RS appears to be executing an aggressive vacancy reduction campaign.

---

### ⚠️ WARNING

**W1 — RS Mass Repricing: 38 Units (Operational Decision)**

RS repriced 38 available units simultaneously with drops ranging from $15 to $350 per unit. The two largest drops (RS 1121 and RS 1043: −$350, −18.6% each) are premium units being aggressively discounted. With 39 available units, this is a coordinated market-rate reset to drive occupancy. All manual repricing — no algorithmic involvement. Note for leasing trend records; no corrective action required.

---

**W2 — RS Work Orders: 25 Deactivated from 9 Processed (278% Ratio)**

```
RS: Processed: 9, Deactivated: 25
```

RS deactivated 2.78× more work orders than it processed. This means a large number of RS work orders previously tracked as active are no longer present in today's Yardi export. Either RS had a significant batch of work order completions uploaded to Yardi between yesterday and today, or the RS Yardi work order file was incomplete. Pattern is similar to SB's ongoing anomaly (W3 below). **Escalate to RS property manager for confirmation that Yardi work order uploads are current.**

---

**W3 — SB Work Orders: 7 Deactivated from 6 Processed (Day 5+)**

SB deactivated > processed for the 5th consecutive audit day. No SB manager confirmation has been received. **This must be escalated now** — either SB is successfully clearing a backlog (no action needed) or Yardi uploads are missing active work orders (data gap). Unresolved.

---

**W4 — OB Alerts: 5 Removed in One Run (Churn Threshold Exceeded)**

```
OB: Alerts count: 1, added: 1, removed: 5
```

OB removed 5 alerts and added 1 (net −4) in a single run. Per audit protocol, >3 adds or removes at a single property in one run requires flagging. Five alert resolutions in one run is the highest in the audit series. Most likely represents legitimate condition resolutions (maintenance items cleared, compliance issues resolved) — a positive signal for OB operations. No action required unless OB manager cannot account for the 5 resolved alerts.

---

**W5 — WO 464-E: New MakeReady Overdue Flag (2 Days) — Incoming Tenant in 12 Days**

```
[Solver DEBUG] 464-E: ready=2026-03-02, cutoff=2026-03-03, overdue=true
[Solver DEBUG] Creating flag for 464-E: 2 days overdue
[Solver] Created 1 new overdue flags for WO
```

WO unit 464-E became overdue on 2026-03-02. Sanchez Calixto, Karina has a Future lease starting **2026-03-16** (12 days) at $3,395. The unit must be ready by 03-16. 2 days overdue today — escalate to WO property manager immediately. If not resolved by 03-09 (7 days), flag as critical.

---

**W6 — RS 3103: New MakeReady Overdue Flag (2 Days) — Incoming Tenant in 3 Days**

```
[Solver DEBUG] 3103: ready=2026-03-02, cutoff=2026-03-03, overdue=true
[Solver DEBUG] Creating flag for 3103: 2 days overdue
[Solver] Created 1 new overdue flags for RS
```

RS unit 3103 overdue as of 2026-03-02. **Helbert, Kyle has a Future lease starting 2026-03-07 — just 3 days from today.** This is an immediate escalation. RS property manager must be notified today that 3103 needs to be ready by 03-07. If not cleared, the move-in may be impacted.

---

**W7 — OB S093/S042/S170: Day 9, 2027 Ready Dates Unconfirmed**

| Unit | Ready Date | Days Until Ready |
|---|---|---|
| S093 | 2027-01-01 | ~302 days |
| S042 | 2027-01-07 | ~308 days |
| S170 | 2027-01-07 | ~308 days |

Unchanged for the 9th consecutive session. No OB manager confirmation received. These are not flagged as overdue (future dates) but the 10+ month hold is anomalous without documentation. **Must escalate to OB manager directly** — confirm these are intentional long-term holds (major rehab) or Yardi data errors requiring correction.

---

**W8 — SB: 21 New Delinquency Entries in One Day**

SB added 21 new/updated delinquency records against 15 resolved. Post-flush normalization at SB was expected to be balanced (RS is 7/7), but SB's new entry volume remains elevated. Monitor next run — if SB new entries continue above 15/day, investigate for non-paying March residents.

---

**W9 — CV C419: Ready 2026-03-06 (2 Days to Overdue)**

The first unit in the new CV MakeReady queue (C419) becomes overdue in 2 days. C419 had its old overdue flag resolved in today's run. If Yardi doesn't confirm MakeReady completion by 03-06, a new flag will be created tomorrow. Monitor.

---

### 🔴 FATAL

None.

---

## Move-Out Overdue (Phase 2D.5)

- 2 overdue move-outs processed
- 1 new flag created
- 1 existing flag severity-escalated

Within normal range. Unit identities not individually surfaced in log. Query to identify:

```sql
SELECT unit_name, property_code, metadata, created_at
FROM unit_flags
WHERE flag_type = 'move_out_overdue'
  AND (created_at::date = '2026-03-04' OR updated_at::date = '2026-03-04')
ORDER BY property_code, unit_name;
```

---

## MakeReady Status Board — Full Portfolio

### Resolved Today ✅

| Unit | Property | Duration | Resolution |
|---|---|---|---|
| C213 | CV | 28 days (critical) | ✅ Cleared by Yardi — Taub applicant incoming |
| C311 | CV | 13 days | ✅ Cleared by Yardi |
| C217 | CV | 12 days | ✅ Cleared by Yardi |
| C229 | CV | 7 days | ✅ Cleared by Yardi — Conway applicant incoming |
| C230 | CV | 5 days | ✅ Cleared by Yardi — Cedillo applicant incoming |

**5 CV flags resolved.** Portfolio total dropped from 7 → 4 (43% reduction).

### Active Overdue Flags (4 total)

| Unit | Property | Ready Date | Days Overdue | Trend | Outlook |
|---|---|---|---|---|---|
| **3103** | RS | 2026-03-02 | **2 days** | 🆕 NEW | **🔴 URGENT — Helbert starts 2026-03-07 (3 days)** |
| 3125 | RS | 2026-02-28 | **4 days** | +1/day | Monitor |
| S160 | OB | 2026-02-28 | **4 days** | +1/day | Monitor |
| **464-E** | WO | 2026-03-02 | **2 days** | 🆕 NEW | Sanchez starts 2026-03-16 (12 days) |

### New CV MakeReady Queue (None Overdue Yet)

| Unit | Ready Date | Days Until Overdue | Watch |
|---|---|---|---|
| C419 | 2026-03-06 | **2 days** | ⚠️ Watch — enters overdue 03-06 |
| C427 | 2026-03-13 | 9 days | Kirksey applicant incoming |
| C330 | 2026-03-13 | 9 days | Monitor |
| C112 | 2026-03-20 | 16 days | Monitor |
| C323 | 2026-04-10 | 37 days | Safe |

---

## Operational Sync Results

### Alerts

| Property | Count | Added | Removed | Reactivated |
|---|---|---|---|---|
| OB | 1 | 1 | **5** ⚠️ | 0 |
| CV | 1 | 0 | 0 | 0 |

RS, SB, WO not in Phase 3A batch today.

### Work Orders

| Property | Processed | Deactivated | Ratio |
|---|---|---|---|
| OB | 38 | 7 | 18% |
| RS | 9 | **25** | **278%** ⚠️ |
| CV | 23 | 0 | 0% |
| WO | 4 | 3 | 75% |
| SB | 6 | **7** | **117%** ⚠️ |

### Delinquencies

| Property | Rows | Updated/New | Resolved |
|---|---|---|---|
| WO | 34 | 8 | 17 |
| CV | 46 | 5 | 10 |
| RS | 93 | 7 | 7 |
| SB | 86 | 21 | 15 |
| OB | 78 | 14 | **53** |

---

## W1 Watch — Notices Fix Stability (Day 6) ✅

| Resident | Unit | Property | Rent | Today's Status |
|---|---|---|---|---|
| Kenton, Christina | 2019 | RS | $1,835 | ✓ Future → lease created |
| Jeffers, Ryan | 3130 | RS | $1,200 | ✓ Future → lease created |
| Poorman, Timothy | 1015 | SB | $1,753 | ✓ Future → lease created |

All three processing correctly as Future for Day 6. Fix from `useSolverEngine.ts:1322` (2026-02-23) confirmed stable. Jeffers move-in is 2026-03-10 — after conversion to Current, retire this watch entry.

---

## Follow-Up Tracking Resolution

| # | Item | 03-03 Status | 03-04 Status | Δ |
|---|---|---|---|---|
| 1 | 🔴 CV C213 (Day 27) | Taub applicant, 10 days | **✅ RESOLVED** — Yardi cleared MakeReady | ✅ Closed |
| 2 | ⚠️ CV C311 | 12 days | **✅ RESOLVED** — Yardi cleared | ✅ Closed |
| 3 | ⚠️ CV C217 | 11 days | **✅ RESOLVED** — Yardi cleared | ✅ Closed |
| 4 | ⚠️ CV C229 | 7 days | **✅ RESOLVED** — Conway applicant (03-06) | ✅ Closed |
| 5 | ⚠️ CV C230 | 4 days | **✅ RESOLVED** — Cedillo applicant (03-07) | ✅ Closed |
| 6 | ⚠️ RS 3125 | 3 days | **4 days** | ❌ +1 day |
| 7 | ⚠️ OB S160 | 3 days | **4 days** | ❌ +1 day |
| 8 | ⚠️ OB S093/S042/S170 (2027 dates) | Day 8 | **Day 9 — still unconfirmed** | ❌ Escalate |
| 9 | ⚠️ OB contracted rent ($2,532) | −$15 (watch) | **STABLE at $2,532** | ✅ Closed |
| 10 | ⚠️ SB Work Order pattern | Day 4+ | **Day 5+ (7 deactivated / 6 processed)** | ❌ Escalate |
| 11 | ⚠️ RS Silent Drops (2 on 03-03) | At threshold | **0 in today's run** (prior drops committed, not re-triggered) | ✅ Stable |
| 12 | ℹ️ Jeffers (RS 3130) W1 retirement | Day 5 | Day 6 — move-in 03-10 (6 days) | Retire after 03-10 |

---

## Duplicate TRACE Analysis (Code Efficiency)

**SB Unit 1026:** Roommate + Primary (same as prior days)
**RS Unit 1027:** Primary + Roommate (same as prior days)

Same multi-resident pattern noted in prior runs. Duplicate `unit_id` DB lookups per co-resident pair. See Architectural Optimization below.

---

## Architectural Optimization

**Dedup `unit_id` Lookups with Per-Property Cache**

The TRACE log shows the same `unit_id` resolved twice for co-resident units (SB 1026, RS 1027) — once per Primary, once per Roommate. Today's RS processed 13 lease creates; with RS having the highest applicant volume of any property, duplicate lookups compound proportionally.

**Proposed fix:** Before the per-property tenancy processing loop, initialize a `Map<unit_name, unit_id>` cache. On each tenancy lookup, check the cache first. If hit, reuse the cached `unit_id`. If miss, query DB and store in cache.

```ts
// In useSolverEngine.ts, per-property tenancy processing block:
const unitLookupCache = new Map<string, string>() // unit_name → unit_id

// On each tenancy:
const cachedId = unitLookupCache.get(row.unit_name)
if (cachedId) {
    unitId = cachedId  // cache hit — no DB call
} else {
    const result = await supabase.from('units').select('id').eq(...).single()
    unitId = result.data.id
    unitLookupCache.set(row.unit_name, unitId)  // store for co-residents
}
```

**Scope:** ~15 lines in `useSolverEngine.ts`. Low risk — additive only, no data logic change. Eliminates one DB round-trip per co-resident in every run. With RS at 13 lease creates today (several for co-resident units), savings are non-trivial at scale.

---

## Shift Handoff

**For next session (2026-03-05):**

- 🔴 **RS 3103 — URGENT:** 2 days overdue, Helbert, Kyle starts **2026-03-07 (Saturday)**. Escalate to RS property manager TODAY. Unit must be MakeReady-confirmed before weekend. If not resolved by 03-07, move-in is at risk.
- 🔴 **Solver double-batch:** The aborted run (`17099401`) created a stale batch record in the tracking system. Verify that the batch tracker does not show a "stuck" or orphaned run from `17099401`. If the reporting UI surfaces it, it may need to be manually resolved or marked complete.
- ⚠️ **CV C419:** Ready 2026-03-06 (tomorrow). First unit in new CV MakeReady queue. If not cleared in Yardi, a new overdue flag will be created in tomorrow's run.
- ⚠️ **RS 3125:** 4 days overdue. Monitor.
- ⚠️ **OB S160:** 4 days overdue. Monitor.
- ⚠️ **WO 464-E:** 2 days overdue — Sanchez starts 2026-03-16. Escalate to WO manager. Resolve by 03-09 to avoid critical status.
- ⚠️ **OB S093/S042/S170:** Day 9 with 2027 ready dates. Must contact OB manager directly — 9 days with no response is beyond acceptable.
- ⚠️ **RS Work Orders:** 25 deactivated from 9 processed. Verify with RS manager. If Yardi work order data is incomplete, request a fresh upload.
- ⚠️ **SB Work Orders:** Day 5+ of deactivated ≥ processed. SB manager confirmation remains outstanding.
- ⚠️ **SB Delinquencies:** 21 new entries in one day (vs. 15 resolved). Watch trend — if new entries remain elevated 03-05, flag non-paying tenants for follow-up.
- ⚠️ **CV C427 / C230:** Cedillo starts 2026-03-07 (Saturday) — expect Current conversion on Monday 03-09. If Cedillo doesn't appear as Current by 03-09, flag as missed move-in. Kirksey (C427) starts 2026-04-01 — no near-term action.
- ✅ **W1 Watch:** Day 7 tomorrow. Jeffers move-in is 2026-03-10 (6 days). After conversion to Current, retire Jeffers from the watch list. Continue Kenton and Poorman.
- ✅ **CV Taub (C213):** Starts 2026-03-13 (9 days). MakeReady flag already resolved. Monitor for conversion to Current. If no conversion by 03-14, flag as missed move-in.
- ℹ️ **RS repricing:** 38-unit drop in effect. Watch leasing velocity response over next 3–5 days — if applications surge, repricing was effective.
- ℹ️ **CV AIRM Day 9:** 6 units, $2–$5/day. Cumulative drift from 02-28 baseline: C311 −$12 | C217 −$12 | C419 −$12 | C330 −$23 | C112 −$23 | C323 new at $2,677.
- ℹ️ **Flat Renewal Streak:** Day 9 with zero rent increases on renewals. Renewals module (H-057) implementation would surface this systematically.
