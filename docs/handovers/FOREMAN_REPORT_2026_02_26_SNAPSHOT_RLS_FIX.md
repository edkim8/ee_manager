# Foreman Report: Daily Audit + Availability Snapshot RLS Fix
**Date:** 2026-02-26
**To:** Foreman
**From:** Claude Sonnet 4.6 (Tier 2 Data Architect / Builder)
**Status:** ⚠️ Option B Deployed — Awaiting Confirmation on Tomorrow's Run

---

## Executive Summary

Two workstreams completed today:

1. **Daily Solver Audit** (H-060) — Batch `4ab52458` processed cleanly. No fatal errors. 8 warnings (4 persistent, 4 new). CV C213 now at 22 days overdue (Day 5). All-5-property 403 errors on availability snapshots identified and resolved. Two new standing audit rules added to the daily prompt.

2. **Availability Snapshot RLS Fix** (H-061) — Root cause of 403 errors identified and fixed with a two-layer approach. Option A (DB policy) is live and confirmed. Option B (server-side route using `service_role`) is deployed but awaiting confirmation from tomorrow's morning run before the Option A safety net can be removed.

---

## What Foreman Must Do Tomorrow

**This is the only required action before running the Solver:**

When tomorrow's audit agent evaluates the snapshot section of the log, it will check the **Option B Confirmation Checklist** documented in `docs/status/LATEST_UPDATE.md`:

- [ ] Zero `403 Forbidden` errors on `availability_snapshots`
- [ ] All 5 properties log `✓ Availability snapshot saved`
- [ ] Analysis page `/office/availabilities/analysis` shows today's data

**If all three pass → Option B confirmed.** The audit agent will note the cleanup migration to run:
```sql
DROP POLICY "authenticated_can_write_availability_snapshots" ON public.availability_snapshots;
```
Create a new migration file, apply via `supabase db push`, commit + push.

**If any fail → Option B failed.** Revert `useSolverEngine.ts:2240–2260` to the original
`supabase.from('availability_snapshots').upsert(...)` call (see git history commit `a55c613` for the before state).
Option A policy stays active — Solver resumes immediately with no DB changes.

---

## What Was Built (H-061)

### The Problem
Migration `20260225000004` enabled RLS on `availability_snapshots` and created only a SELECT policy for
authenticated users, under the assumption that the Solver writes via `service_role`. This assumption was
wrong — `useSolverEngine.ts` is a browser-side composable and writes via the authenticated JWT. Result:
403 Forbidden on every snapshot POST, recovered only by an unreliable connection-pool retry.

### Option A — DB Policy (commit `c2894ee`, migration `20260226000001`)
Immediate fix. Added `FOR ALL TO authenticated` write policy. Applied to production DB via `supabase db push`.
**Still active as safety net.**

### Option B — Server Route (commit `a55c613`)
**New file:** `layers/admin/server/api/solver/save-snapshot.post.ts`
- Authenticated users only (401 guard)
- Writes via `serverSupabaseServiceRole` — bypasses RLS
- Validates `property_code` + `snapshot_date`, upserts all 16 snapshot fields

**Modified:** `layers/admin/composables/useSolverEngine.ts:2240`
- `supabase.from('availability_snapshots').upsert(...)` → `$fetch('/api/solver/save-snapshot', { method: 'POST', body: {...} })`
- Same fields, same try/catch, same log line — drop-in replacement

**On Vercel:** The new route deploys as a standard Nuxt serverless function. No new infrastructure,
no new environment variables (SUPABASE_SERVICE_ROLE_KEY is already set). Cold start adds ~1.5s
worst case across 5 properties — negligible in a multi-minute Solver run.

### Architectural Significance
This is Step 1 of a longer path: as privileged writes move server-side, the Solver progressively
decouples from the browser. End state is Vercel Cron Job at 7 AM daily — no human tab required.

---

## What Was Audited (H-060)

### Persistent Warnings (carry forward daily)
| Item | Status | Days |
|---|---|---|
| 🔴 CV C213 MakeReady | 22 days overdue | Day 5 — no Yardi response |
| ⚠️ CV C311 MakeReady | 7 days overdue | Escalating |
| ⚠️ CV C217 MakeReady | 6 days overdue | Escalating |
| ⚠️ OB S093/S042/S170 | 2027 ready dates | Day 5 — OB manager unconfirmed |
| ⚠️ OB Silent Drop (2026-02-25) | Unit unidentified | DB query still needed |

### New Warnings (from today)
| Item | Details |
|---|---|
| ⚠️ RS 3 Canceled Tenancies | Application declines removed from Yardi. 3 units reset to Available. Unit IDs unknown — DB query recommended |
| ⚠️ OB S081 | New overdue MakeReady flag — 2 days (ready=2026-02-24) |
| ⚠️ SB Work Orders | 7 deactivated vs 6 processed — confirm intentional closures with SB manager |
| ⚠️ Flat Renewal Streak | Day 4: Esqueda, Sebastian (SB-2143, $1,624 flat). 4 consecutive flat renewals RS+SB |
| ⚠️ RS Price Repricing | 6 units -$10 to -$25. Operational decision, informational |

### New Data Captured Today
- `avg_contracted_rent` first captured: RS $1,490 / SB $1,642 / CV $2,362 / OB $2,530 / WO $2,945
  (Migration `20260225000003` added column; trend series begins from today's snapshot)

---

## Prompt Updates

Two new standing rules added to `docs/governance/DAILY_UPLOAD_REVIEW_PROMPT.md`:

1. **Price Changes** — Always report ALL availability price changes as a table in every audit. Not bugs — operational repricing decisions. CV $1–$2 = AIRM normal; all other properties = manual.

2. **Silent Drops** — Standard term is always "Canceled." Cannot distinguish Canceled vs. Denied by design. Flag if > 1 at single property in one run.

---

## Files Changed

```
layers/
└── admin/
    ├── composables/useSolverEngine.ts          ← line 2240: supabase.upsert → $fetch('/api/solver/save-snapshot')
    └── server/api/solver/
        └── save-snapshot.post.ts               ← NEW: service_role snapshot write endpoint

supabase/migrations/
└── 20260226000001_fix_availability_snapshots_rls_write.sql  ← NEW: Option A write policy

docs/
├── status/
│   ├── DAILY_AUDIT_2026_02_26.md               ← NEW: today's audit report
│   ├── LATEST_UPDATE.md                         ← updated: Option B pending confirmation block
│   └── HISTORY_INDEX.md                         ← H-060 + H-061 added
├── governance/
│   └── DAILY_UPLOAD_REVIEW_PROMPT.md            ← two new standing rules + Option B check
├── archive/
│   └── SESSION_2026_02_26_AUDIT_AND_SNAPSHOT_FIX.md  ← NEW: full session log
└── handovers/
    └── FOREMAN_REPORT_2026_02_26_SNAPSHOT_RLS_FIX.md ← this file

memory/
├── MEMORY.md                                    ← restructured: 476 → 121 lines; today's entries
└── solver-architecture.md                       ← NEW: older detailed patterns migrated here
```

---

## Commits (all on `main`)
| Commit | Message |
|---|---|
| `1202103` | audit: daily solver audit 2026-02-26 |
| `e429357` | docs: update LATEST_UPDATE.md for 2026-02-26 audit |
| `c2894ee` | fix: add authenticated write policy for availability_snapshots RLS (Option A) |
| `a55c613` | feat(solver): move availability snapshot writes to server-side API (Option B) |
| `c6f2296` | docs: document Option B pending confirmation and snapshot RLS cleanup steps |
| `943a438` | docs: update HISTORY_INDEX.md for H-060 and H-061 |

---

## Risk Assessment

**Option A (active):** Zero risk. Restores effective pre-migration write behavior with RLS now properly enabled.

**Option B (pending):** Low risk. Change is isolated to 18 lines in a non-fatal try/catch block. Option A
is the full fallback — if Option B fails, one code revert + zero DB changes = fully restored.

**CV C213:** Operational risk, not technical. 22 days with no Yardi update. If physical unit status
has not been escalated to CV property manager, this is now overdue on the escalation itself.

---

## Documentation Index

| Document | Purpose | Location |
|---|---|---|
| Daily Audit | Full audit findings for 2026-02-26 | `docs/status/DAILY_AUDIT_2026_02_26.md` |
| Session Log | Full technical session record | `docs/archive/SESSION_2026_02_26_AUDIT_AND_SNAPSHOT_FIX.md` |
| Latest Update | Current system state | `docs/status/LATEST_UPDATE.md` |
| History Index | H-060 + H-061 entries | `docs/status/HISTORY_INDEX.md` |
| Daily Prompt | Updated standing rules | `docs/governance/DAILY_UPLOAD_REVIEW_PROMPT.md` |
| Memory | Restructured, today's entries | `memory/MEMORY.md` |
| Solver Architecture | Detailed patterns (topic file) | `memory/solver-architecture.md` |
| This Report | Foreman handoff | `docs/handovers/FOREMAN_REPORT_2026_02_26_SNAPSHOT_RLS_FIX.md` |
