# Solver Anomaly Log

> **Purpose:** Persistent institutional memory for the Daily Audit Agent.
> Tracks unusual events, recurring patterns, and acknowledged normals across solver runs.
>
> **Maintenance rules (enforced by Audit Agent at close of each session):**
> - `WATCHING` entries: update `Last Seen` when the pattern reappears; escalate to `RECURRING` if seen 3+ times.
> - `RECURRING` entries: never auto-pruned. Require explicit human resolution.
> - `RESOLVED` entries: pruned automatically after 45 days from `Date Resolved`.
> - `NORMAL` entries (acknowledged false positives): permanent until explicitly removed.

---

## Active Watch Items

| Date Flagged | Property | Unit(s) | Description | Status | Last Seen |
|---|---|---|---|---|---|
| 2026-02-23 | RS | RS-2019, RS-1015 | Silent-drop loop — Notices processor corrupts Future tenancy to Notice; Yardi restores next day. Fixed 2026-02-23 (restricted validStatuses). Monitor for regression. Jeffers (RS-3130) retired 2026-03-11 (confirmed Current). Kenton (RS-2019, starts 03-16) and Poorman (SB-1015, starts 04-10) continue. | WATCHING | 2026-03-12 |
| 2026-03-11 | CV | C230 | Cedillo, Jonathan — unit changed C330→C230 (03-11, −$206 rent), start date moved 04-01→03-24 (03-12). Three changes in 2 days (unit, rent, start date). CV manager must confirm all changes are intentional and final. | WATCHING | 2026-03-12 |
| 2026-03-12 | WO | 464-E | MakeReady overdue Day 10 — Sanchez Calixto starts 03-16 (4 days). No WO manager action in 10 consecutive runs. EMERGENCY. | WATCHING | 2026-03-12 |
| 2026-03-12 | OB | S054 | Sandoval, America — new Applicant (03-12), lease_start_date 2026-03-15, but S054 MakeReady ready=2026-03-28 (13 days after start). Conflict requires OB manager reconciliation. | WATCHING | 2026-03-12 |
| 2026-03-12 | OB | S150, S170 | MakeReady deferral pattern — S150 date pushed from 2026-03-06 (overdue) to 2026-04-22 (+46 days); S170 pushed from 2026-03-12 to 2026-03-18 (+6 days). Neither unit completed, both dates extended. No eviction context on either unit. OB manager should confirm these are legitimate timeline estimates. | WATCHING | 2026-03-12 |
| 2026-03-12 | RS | Multiple | Manual repricing campaign — 8 units with reductions $25–$125 on 03-12. First RS repricing event in audit series. RS has 37 available units and 5 active applications. Monitor for continuation. | WATCHING | 2026-03-12 |
| 2026-03-12 | RS | Unknown | First RS silent drop — 1 tenancy → Past on 03-12. Within threshold (1 per property). First occurrence for RS in audit series. Monitor for recurrence. | WATCHING | 2026-03-12 |
| 2026-03-11 | SB | 2025 | Hong, Jonathan — start date corrected 2026-02-19 → 2026-03-23 on 03-12. Simultaneously rent changed $1,578 → $1,478 (−$100). Start date fix appears intentional; rent change requires SB manager confirmation. | WATCHING | 2026-03-12 |

---

## Acknowledged Normals (Do Not Flag)

| Date Added | Property | Unit(s) | Description |
|---|---|---|---|
| 2026-02-01 | CV | All vacant units | AIRM revenue management tool produces $1–$2 micro-decrements daily on CV vacant units. This is automated repricing, not a bug. All other properties use manual repricing. |
| 2026-02-26 | OB | — | `parra, melissa` — lowercase first letter on resident name is a Yardi data entry issue, not a system error. Do not flag. |
| 2026-03-12 | OB | S093, S042 | MakeReady ready dates set to 2027-01-01 and 2027-01-07 respectively. Units are under active **eviction proceedings**; far-future ready dates reflect the uncertainty of the eviction timeline. Confirmed by OB manager 2026-03-12. Do not flag. |

---

## Recurring Patterns

*No active recurring entries.*

S093/S042 moved to Acknowledged Normals on 2026-03-12 after OB manager confirmed eviction-hold context.

---

## Resolved

| Date Flagged | Date Resolved | Property | Description |
|---|---|---|---|
| 2026-02-27 | 2026-02-27 | ALL | Availability snapshot 403 errors — fixed via Option B server route using serviceRole client (migration `20260227000001`). |
| 2026-03-06 | 2026-03-06 | RS | Trailing-space false silent-drop bug — `Code` column in residents_status was not normalized. Fixed via `normalize_id` transform on tenancy_id. |
| 2026-03-08 | 2026-03-10 | CV | CV C419 MakeReady overdue — ready date 2026-03-06, 4 days overdue as of 03-10. CV manager cleared unit in Yardi; flag auto-resolved in 03-11 run. |
| 2026-03-11 | 2026-03-12 | SB | Hong, Jonathan backdated Applicant tenancy — lease_start_date 2026-02-19 (20 days past). Corrected to 2026-03-23 in 03-12 run. Rent also changed $1,578→$1,478 (watch item remains open for rent confirmation). |
| 2026-03-11 | 2026-03-12 | SB | Consecutive silent drops (03-10 and 03-11). Did not extend to Day 3 on 03-12. Pattern resolved. |
| 2026-03-11 | 2026-03-12 | SB | Mass repricing campaign (9 units, $25–$175 on 03-11). Zero continuation on 03-12. Confirmed one-day event. |
| 2026-03-10 | 2026-03-12 | OB | S150 MakeReady overdue (5 days as of 03-11). Ready date extended to 2026-04-22 on 03-12 run. Overdue flag cleared. Deferral pattern noted under new active watch item (03-12). |
