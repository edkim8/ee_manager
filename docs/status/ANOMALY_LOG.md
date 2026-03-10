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
| 2026-02-23 | RS | RS-2019, RS-3130, RS-1015 | Silent-drop loop — Notices processor corrupts Future tenancy to Notice; Yardi restores next day. Fixed 2026-02-23 (restricted validStatuses). Monitor for regression. | WATCHING | 2026-03-10 |

---

## Acknowledged Normals (Do Not Flag)

| Date Added | Property | Unit(s) | Description |
|---|---|---|---|
| 2026-02-01 | CV | All vacant units | AIRM revenue management tool produces $1–$2 micro-decrements daily on CV vacant units. This is automated repricing, not a bug. All other properties use manual repricing. |
| 2026-02-26 | OB | — | `parra, melissa` — lowercase first letter on resident name is a Yardi data entry issue, not a system error. Do not flag. |

---

## Recurring Patterns

| First Seen | Property | Description | Frequency | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Resolved

| Date Flagged | Date Resolved | Property | Description |
|---|---|---|---|
| 2026-02-27 | 2026-02-27 | ALL | Availability snapshot 403 errors — fixed via Option B server route using serviceRole client (migration `20260227000001`). |
| 2026-03-06 | 2026-03-06 | RS | Trailing-space false silent-drop bug — `Code` column in residents_status was not normalized. Fixed via `normalize_id` transform on tenancy_id. |
