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
| 2026-02-23 | RS | RS-2019, RS-1015 | Silent-drop loop — Notices processor corrupts Future tenancy to Notice; Yardi restores next day. Fixed 2026-02-23 (restricted validStatuses). Monitor for regression. Jeffers (RS-3130) retired 2026-03-11 (confirmed Current). Kenton (RS-2019, starts 03-16) and Poorman (SB-1015, starts 04-10) continue. | WATCHING | 2026-03-11 |
| 2026-03-10 | OB | S150 | MakeReady overdue — ready date 2026-03-06, now 5 days overdue. No incoming applicant. OB manager response required. | WATCHING | 2026-03-11 |
| 2026-03-11 | SB | 2025 | Hong, Jonathan — Applicant tenancy with backdated lease_start_date 2026-02-19 (20 days in the past as of 03-11). Likely data entry error (intended 2026-03-19). SB manager must confirm actual move-in date and correct Yardi. | WATCHING | 2026-03-11 |
| 2026-03-11 | CV | C230, C330 | Cedillo, Jonathan unit reassignment: C330 ($2,581.35) → C230 ($2,375) between 03-10 and 03-11 runs. $206 rent reduction. CV manager must confirm reassignment and new rate are intentional. | WATCHING | 2026-03-11 |
| 2026-03-11 | SB | Multiple | Consecutive silent drops — 1 → Past on 03-10 and again on 03-11. Both within the 1-per-property threshold, but 2 consecutive days is a pattern. Verify unit identities via DB query. Escalate if Day 3 occurs. | WATCHING | 2026-03-11 |
| 2026-03-11 | SB | Multiple | Mass repricing campaign — 9 units with reductions $25–$175 on 03-11. SB has 31 available units, 1 active application. Monitor for continuation. If 9+ units reprice again tomorrow, confirm as ongoing campaign. | WATCHING | 2026-03-11 |

---

## Acknowledged Normals (Do Not Flag)

| Date Added | Property | Unit(s) | Description |
|---|---|---|---|
| 2026-02-01 | CV | All vacant units | AIRM revenue management tool produces $1–$2 micro-decrements daily on CV vacant units. This is automated repricing, not a bug. All other properties use manual repricing. |
| 2026-02-26 | OB | — | `parra, melissa` — lowercase first letter on resident name is a Yardi data entry issue, not a system error. Do not flag. |

---

## Recurring Patterns

| First Seen | Property | Unit(s) | Description | Frequency | Notes |
|---|---|---|---|---|---|
| 2026-02-24 | OB | S093, S042 | MakeReady ready dates set to 2027-01-01 and 2027-01-07 respectively (~300 days out). S170 was corrected 03-06 (proof OB responds when directly contacted). S093 and S042 have 17 consecutive audit days without manager acknowledgment. Direct OB manager contact by phone or in person required. | Daily (every run) | Escalated from WATCHING to RECURRING on 03-11 (day 17 — exceeds 3+ appearance threshold). Require explicit human resolution to close. |

---

## Resolved

| Date Flagged | Date Resolved | Property | Description |
|---|---|---|---|
| 2026-02-27 | 2026-02-27 | ALL | Availability snapshot 403 errors — fixed via Option B server route using serviceRole client (migration `20260227000001`). |
| 2026-03-06 | 2026-03-06 | RS | Trailing-space false silent-drop bug — `Code` column in residents_status was not normalized. Fixed via `normalize_id` transform on tenancy_id. |
| 2026-03-08 | 2026-03-10 | CV | CV C419 MakeReady overdue — ready date 2026-03-06, 4 days overdue as of 03-10. CV manager cleared unit in Yardi; flag auto-resolved in 03-11 run. |
