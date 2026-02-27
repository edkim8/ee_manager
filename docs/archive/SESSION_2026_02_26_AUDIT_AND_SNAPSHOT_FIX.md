# Session Log: Daily Audit + Availability Snapshot RLS Fix
**Date:** 2026-02-26
**Batch Audited:** `4ab52458-825a-4f9a-aa0a-f2fc8176f514`
**History IDs:** H-060 (Daily Audit), H-061 (Snapshot RLS Fix)

---

## Part 1 — Daily Solver Audit

### Run Summary
| Property | Rows | Lease Creates | Applications | Notices | Renewals |
|---|---|---|---|---|---|
| RS | 588 (-6) | 14 | 5 | 33 | 0 |
| SB | 663 (+4) | 6 | 1 | 17 | 1 (Esqueda, Sebastian — flat) |
| CV | 190 (0) | 1 | 1 | 2 | 0 |
| OB | 719 (0) | 4 | 3 | 7 | 0 |
| WO | 328 (+4) | 1 | 0 | 1 | 0 |

### Availability Pipeline
| Property | Available | Applied | Leased | Contracted Rent |
|---|---|---|---|---|
| RS | 35 (+4) | 5 (-3) | 3 | $1,490 (first capture) |
| SB | 25 (-1) | 1 (+1) | 4 (+1) | $1,642 (first capture) |
| CV | 8 (0) | 1 (0) | 0 | $2,362 (first capture) |
| OB | 19 (0) | 2 (0) | 0 | $2,530 (first capture) |
| WO | 2 (0) | 0 (0) | 1 (+1) | $2,945 (first capture) |

### Key Findings
- **W1 Fix Stable (Day 4):** Kenton/Jeffers/Poorman all processed as Future — zero auto-corrections
- **CV C213:** Day 5 — 22 days overdue. No Yardi response across 5 consecutive audit days
- **CV C311/C217:** 7 and 6 days overdue — escalating
- **RS 3 Silent Drops:** 3 canceled tenancies (application declines) removed from Yardi. Units reset to Available. Unit IDs unknown (logging gap)
- **OB S081:** New overdue MakeReady flag — 2 days overdue (ready=2026-02-24)
- **OB S093/S042/S170:** 2027 ready dates — Day 5, OB manager confirmation still outstanding
- **OB S099:** Yesterday's $250 spike confirmed one-time correction — watch closed
- **RS 6-unit Price Decline:** 6 units reduced $10–$25 by RS property manager — operational repricing
- **Flat Renewal Streak:** Day 4 — Esqueda, Sebastian (SB-2143, $1,624 flat). Pattern: 4 consecutive flat renewals across RS/SB
- **Delinquency Stall:** RS and CV both at 0 resolved (regression from yesterday's 1 each); OB only active property (1 resolved)
- **SB Work Orders:** 7 deactivated vs 6 processed — confirm intentional closures with SB manager
- **Contracted Rent First Capture:** `avg_contracted_rent` captured for the first time in all 5 snapshots

### New Audit Prompt Standing Rules Added
1. **Price Changes** — Always capture ALL price changes in every audit as a full table. Operational decisions, informational only. CV $1–$2 = AIRM normal; others = manual repricing.
2. **Silent Drops** — Standard term: always "Canceled." Cannot distinguish Canceled vs. Denied by design.

---

## Part 2 — Availability Snapshot RLS Fix (H-061)

### Root Cause Analysis

**Symptom:** All 5 properties hit `403 Forbidden` on `POST .../availability_snapshots` every daily run.
`fetch-retry.js` was recovering via connection-pool edge case, but not reliably.

**Root cause trace:**
1. `20260221000001_create_availability_snapshot_system.sql` — created `availability_snapshots` with RLS **disabled** (default). Browser-side Solver wrote freely via authenticated JWT.
2. `20260225000004_fix_security_definer_views.sql` Part 2 — enabled RLS on `availability_snapshots` and created only a `FOR SELECT TO authenticated` policy, under the incorrect assumption that the Solver writes via `service_role`.
3. **Actual architecture:** `useSolverEngine.ts` is a browser-side composable — all DB writes use the authenticated user's JWT, not `service_role`. After `00004` applied, INSERT was blocked → 403.

### Option A — Immediate Fix (migration `20260226000001`, commit `c2894ee`)
```sql
CREATE POLICY "authenticated_can_write_availability_snapshots"
  ON public.availability_snapshots
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```
- Applied via `supabase db push` immediately
- Restored effective pre-RLS write behavior for the authenticated Solver
- **Status: ACTIVE — remains as safety net**

### Option B — Server-Side Route (commit `a55c613`)
Moves snapshot writes from the browser to a Vercel serverless function using `service_role`,
fulfilling the original design intent stated in migration `20260225000004`.

**New file:** `layers/admin/server/api/solver/save-snapshot.post.ts`
- Validates `serverSupabaseUser` (401 if unauthenticated)
- Validates required fields (`property_code`, `snapshot_date`)
- Upserts via `serverSupabaseServiceRole(event)` — bypasses RLS entirely
- Returns `{ success: true, property_code, snapshot_date }` or throws 500

**Modified:** `layers/admin/composables/useSolverEngine.ts:2240`
```typescript
// BEFORE
await supabase.from('availability_snapshots').upsert({ ... }, { onConflict: '...' })

// AFTER
await $fetch('/api/solver/save-snapshot', { method: 'POST', body: { ... } })
```
All 16 fields identical. Same surrounding try/catch (non-fatal). Same `✓ Availability snapshot saved` log line.

**Status: DEPLOYED. Unconfirmed. First live run is tomorrow's daily upload.**

### Confirmation Checklist (for tomorrow's audit agent)
- [ ] Zero `403 Forbidden` errors on `availability_snapshots` in browser console
- [ ] All 5 properties: `✓ Availability snapshot saved` log lines present
- [ ] Analysis page `/office/availabilities/analysis` shows today's data

### After Confirmation — Cleanup
```sql
-- New migration to run after Option B is confirmed:
DROP POLICY "authenticated_can_write_availability_snapshots" ON public.availability_snapshots;
```

### Revert (if Option B fails)
Restore `layers/admin/composables/useSolverEngine.ts:2240–2260` to:
```typescript
await supabase.from('availability_snapshots').upsert({
    solver_run_id: result.runId,
    property_code: pCode,
    // ... (see git history for full block)
}, { onConflict: 'property_code,snapshot_date', ignoreDuplicates: true })
```
Option A policy remains active in DB — Solver resumes working on next run. No DB rollback needed.

### Architectural Significance
This is the first step in a Solver server-side migration path:
- **Today:** Snapshot writes → server (service_role)
- **Near-term:** Other privileged writes → server
- **Long-term:** Vercel Cron Job triggers Solver automatically, no browser tab required

---

## Part 3 — Documentation Updated

| Document | Change |
|---|---|
| `docs/status/DAILY_AUDIT_2026_02_26.md` | Full audit report — created |
| `docs/status/LATEST_UPDATE.md` | Updated with audit summary + Option B pending confirmation block |
| `docs/status/HISTORY_INDEX.md` | H-060 (audit) + H-061 (snapshot RLS fix) added |
| `docs/governance/DAILY_UPLOAD_REVIEW_PROMPT.md` | Two new standing rules + Option B snapshot check |
| `memory/MEMORY.md` | Restructured: 476 → 121 lines; today's entries added |
| `memory/solver-architecture.md` | New topic file — older detailed patterns migrated from MEMORY.md |

---

## Commits
| Commit | Description |
|---|---|
| `1202103` | audit: daily solver audit 2026-02-26 |
| `e429357` | docs: update LATEST_UPDATE.md for 2026-02-26 audit |
| `c2894ee` | fix: add authenticated write policy for availability_snapshots RLS (Option A) |
| `a55c613` | feat(solver): move availability snapshot writes to server-side API (Option B) |
| `c6f2296` | docs: document Option B pending confirmation and snapshot RLS cleanup steps |
| `943a438` | docs: update HISTORY_INDEX.md for H-060 and H-061 |
