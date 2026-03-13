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
| 2026-02-23 | RS | RS-2019, RS-1015 | Silent-drop loop — Notices processor corrupts Future tenancy to Notice; Yardi restores next day. Fixed 2026-02-23 (restricted validStatuses). Monitor for regression. Jeffers (RS-3130) retired 2026-03-11 (confirmed Current). Kenton (RS-2019, starts 03-16) and Poorman (SB-1015, starts 04-10) continue. | WATCHING | 2026-03-13 |
| 2026-03-11 | CV | C230 | Cedillo, Jonathan — unit changed C330→C230 (03-11, −$206 rent), start date moved 04-01→03-24 (03-12). Three changes in 2 days (unit, rent, start date). CV manager must confirm all changes are intentional and final. | WATCHING | 2026-03-13 |
| 2026-03-12 | WO | 464-E | MakeReady overdue Day 11 (03-13) — Sanchez Calixto is an **internal WO transfer** currently at 458-C. Vacates 458-C 03-15 (Saturday). Starts 464-E 03-16 (Monday). No WO manager action in 11 consecutive runs. If not resolved in 03-16 run, move-in has physically failed. EMERGENCY. | WATCHING | 2026-03-13 |
| 2026-03-12 | OB | S054 | Sandoval, America — lease_start_date 2026-03-15. MakeReady ready=2026-03-28 (13 days after start). Day 2 unresolved. If still unresolved in 03-16 run with start date passed, escalate to FATAL. | WATCHING | 2026-03-13 |
| 2026-03-12 | OB | S150, S170 | MakeReady deferral pattern — S150 date pushed to 2026-04-22 (+46 days); S170 pushed to 2026-03-18 (+6 days, approaching). Neither unit completed, both dates extended. No eviction context. S170 ready 03-18 — if not cleared by 03-18, new overdue flag imminent. OB manager should confirm these are legitimate timeline estimates. | WATCHING | 2026-03-13 |
| 2026-03-11 | SB | 2025 | Hong, Jonathan — start date corrected 2026-02-19 → 2026-03-23 on 03-12. Simultaneously rent changed $1,578 → $1,478 (−$100). Start date fix appears intentional; rent change requires SB manager confirmation. | WATCHING | 2026-03-13 |
| 2026-03-12 | RS | Multiple | RS silent drops — first RS drop was 03-12, second on 03-13 (tenancy t3420752). Two consecutive drops is an emerging pattern. If 3rd consecutive drop on 03-16, escalate to RECURRING and run unit identity query. Unit identities not surfaced in payload. | WATCHING | 2026-03-13 |
| 2026-03-13 | SB | Unknown | SB silent drop pattern — 3 drops in 4 days (03-10, 03-11, 03-13). Not strictly consecutive but persistent. Tenancy t2933859 on 03-13. May be canceled applications from pre-repricing pipeline clearing. Monitor 03-16. | WATCHING | 2026-03-13 |
| 2026-03-13 | ALL | — | Work Orders showing 0 open across all 5 properties. Was 79+ yesterday. Possible causes: (A) mass deactivation event, (B) 5p_Work_Orders file excluded from batch, (C) audit export query date-filter bug. MakeReady flags unaffected (separate system). Investigate before 03-16 run. | WATCHING | 2026-03-13 |
| 2026-03-13 | CV | C213 | Taub, Timothy — lease_start_date 2026-03-12. Still processing as Applicant in 03-13 run (Day 2 delayed conversion). One day lag is within Yardi tolerance. If still Applicant in 03-16 run, flag for CV manager. | WATCHING | 2026-03-13 |

---

## Acknowledged Normals (Do Not Flag)

| Date Added | Property | Unit(s) | Description |
|---|---|---|---|
| 2026-02-01 | CV | All vacant units | AIRM revenue management tool produces $1–$2 micro-decrements daily on CV vacant units. This is automated repricing, not a bug. All other properties use manual repricing. |
| 2026-02-26 | OB | — | `parra, melissa` — lowercase first letter on resident name is a Yardi data entry issue, not a system error. Do not flag. |
| 2026-03-12 | OB | S093, S042 | MakeReady ready dates set to 2027-01-01 and 2027-01-07 respectively. Units are under active **eviction proceedings**; far-future ready dates reflect the uncertainty of the eviction timeline. Confirmed by OB manager 2026-03-12. Do not flag. `notice_given` events for these units with 12-31-2026 dates are also normal. |

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
| 2026-03-11 | 2026-03-12 | SB | Mass repricing campaign (9 units, $25–$175 on 03-11). Zero continuation on 03-12. Confirmed one-day event. ROI confirmed on 03-13: Byjoe ($1,403) and Manion ($1,388) signed at repriced rates. |
| 2026-03-10 | 2026-03-12 | OB | S150 MakeReady overdue (5 days as of 03-11). Ready date extended to 2026-04-22 on 03-12 run. Overdue flag cleared. Deferral pattern noted under active watch item (03-12). |
| 2026-03-12 | 2026-03-13 | OB | S139 MakeReady zero-cushion — Avalos starts 03-14, ready=03-14. MakeReady confirmed cleared in 03-13 run (not in active flag set). |
| 2026-03-12 | 2026-03-13 | RS | Richardson, Erica (2034) — lease_start_date 03-12 (started same day as audit). Converted to Current in 03-13 run; absent from applications phase. Resolved. |
| 2026-03-12 | 2026-03-13 | RS | Manual repricing campaign — 8 units (−$25 to −$125 on 03-12). Zero continuation on 03-13. Confirmed one-day event. ROI confirmed: Burket (2116, $1,188) and O'Neill (3087, $1,175) signed at repriced rates. |
