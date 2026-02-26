# Field Report - February 26, 2026

## Overview
Performed the Daily Solver Audit (Batch `4ab52458`) for 2026-02-26. No fatal errors. 8 warnings (4 persistent, 4 new). Key new issues: availability snapshot 403 errors (RLS policy gap — root cause identified and fix documented), 3 RS silently-dropped tenancies (canceled applications), and a new OB S081 overdue MakeReady flag. Daily audit prompt updated with two new standing rules.

## Technical Changes

### 📅 Daily Audit & Solver Health
- **W1 Fix Verified (Day 4):** Kenton/Jeffers/Poorman processed as Future tenancies — zero `Future → Notice` auto-corrections. Fix from 2026-02-23 confirmed stable.
- **CV C213 Escalation:** Now **22 days** overdue — 5 consecutive audit days with no Yardi response. Physical escalation to CV property manager is overdue itself.
- **CV C311/C217:** 7 and 6 days overdue respectively — escalating daily.
- **Snapshot 403 Errors (NEW):** All 5 properties hit 403 Forbidden on availability snapshot POST. Root cause: migration `20260225000004` enabled RLS on `availability_snapshots` with only a SELECT policy — Solver writes as authenticated JWT (not service_role). Retries succeed via connection-pool edge case. Fix: add `authenticated_can_write_availability_snapshots` FOR ALL policy. Migration ready to apply.
- **RS 3 Silent Drops (NEW):** 3 canceled tenancies (application declines) removed from Yardi. Units reset to Available. Unit IDs not in log — DB query needed to confirm.
- **OB S081 (NEW):** New overdue MakeReady flag — 2 days overdue (ready=2026-02-24).
- **RS Price Repricing:** 6 units reduced $10–$25 by RS property manager. Operational decision — informational.
- **OB S099 Watch Closed:** Yesterday's $250 spike confirmed as one-time correction. No change today.
- **OB S093/S042/S170:** 2027 ready dates — Day 5 unconfirmed by OB manager.
- **CV AIRM:** Day 5 — 5 units with -$2 micro-decrements. Normal.
- **Flat Renewal Streak:** 4 consecutive days across RS/SB. All $0 increase. Pattern worth surfacing to managers.
- **Contracted Rent First Capture:** `avg_contracted_rent` now saved in all 5 snapshots for first time (RS $1,490 / SB $1,642 / CV $2,362 / OB $2,530 / WO $2,945).

### 📋 Daily Audit Prompt Updates (`docs/governance/DAILY_UPLOAD_REVIEW_PROMPT.md`)
- **Price Changes:** New standing rule — always capture ALL availability price changes in every audit report as a table. Operational decisions, not bugs.
- **Silent Drops:** New standing rule — standard term is always "Canceled." Cannot distinguish Canceled vs. Denied by design. Flag if > 1 at any single property.

## Verification Result
- [x] Verified Daily Audit email delivery (ekim@lehbros.com, elliot.hess@gmail.com).
- [x] Verified W1 fix stable — Day 4 clean run.
- [x] Audit committed and pushed to main (`1202103`).
