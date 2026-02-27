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

### 🔧 Snapshot RLS Fix — Two-Layer Approach (PENDING CONFIRMATION)

**IMPORTANT FOR TOMORROW'S AUDIT AGENT — READ THIS BEFORE EVALUATING SNAPSHOTS.**

Two fixes were applied in sequence today. Both are currently active. Do NOT remove either until Option B is confirmed by tomorrow's live run.

**Option A — Applied first** (`20260226000001_fix_availability_snapshots_rls_write.sql`, commit `c2894ee`):
- Adds `authenticated_can_write_availability_snapshots` FOR ALL policy on `availability_snapshots`
- Status: **ACTIVE** — stays in place as safety net until Option B is confirmed

**Option B — Applied second** (`layers/admin/server/api/solver/save-snapshot.post.ts`, commit `a55c613`):
- Moves snapshot writes from browser-side `useSolverEngine.ts` to a server API route using `service_role`
- `useSolverEngine.ts:2240` now calls `$fetch('/api/solver/save-snapshot', ...)` instead of `supabase.from(...).upsert(...)`
- Status: **DEPLOYED BUT UNCONFIRMED** — first live run is tomorrow morning

**Option B Confirmation Checklist (check during tomorrow's audit):**
- [ ] Zero `403 Forbidden` errors in the browser console for `availability_snapshots`
- [ ] All 5 properties show `✓ Availability snapshot saved` log lines
- [ ] Analysis page at `/office/availabilities/analysis` shows today's data correctly

**After confirmation — cleanup step:**
Run a new migration to drop the now-redundant Option A policy:
```sql
DROP POLICY "authenticated_can_write_availability_snapshots" ON public.availability_snapshots;
```
Do NOT run this until the confirmation checklist is fully passed.

**If Option B fails:**
Revert `useSolverEngine.ts:2240–2260` to the original `supabase.from('availability_snapshots').upsert(...)` call.
Option A policy remains active — Solver resumes working immediately on the next run.

## Verification Result
- [x] Verified Daily Audit email delivery (ekim@lehbros.com, elliot.hess@gmail.com).
- [x] Verified W1 fix stable — Day 4 clean run.
- [x] Audit committed and pushed to main (`1202103`).
- [x] Option A migration applied and pushed (`c2894ee`).
- [x] Option B implemented and pushed (`a55c613`) — awaiting tomorrow's run for confirmation.

## 🔑 Owners Module Refinement & PDF Pipeline (H-062)
- **Entity Interests Engine**: Implemented full M2M stake management. New API routes (`GET`, `POST`, `PATCH`, `DELETE`) and UI components for managing granular equity splits.
- **PDF Generation Pipeline**: Established a production-ready Chrome headless pattern. Documented in `memory/pdf-generation.md` for future agents.
- **Ownership Reference**: Produced `docs/owners/OWNERSHIP_REFERENCE.pdf` capturing the live ownership hierarchy across all properties.
- **Database Hardening**:
  - `20260225000003`: Capture average contracted rent in snapshots.
  - `20260225000004`: Security definer views for multi-tenant isolation.
  - `20260225000006`: Entity-to-Entity recursive ownership support.
  - `20260225000007`: High-precision equity splits (NUMERIC 15,4).
- **Memory Initialization**: Bootstrapped `memory/` directory to store long-lived architectural patterns (Solver, PDF, and general Project Memory).

