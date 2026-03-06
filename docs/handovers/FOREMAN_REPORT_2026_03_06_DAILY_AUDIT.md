# Foreman Report: Daily Audit — 2026-03-06

**Date:** 2026-03-06
**To:** Foreman
**From:** Claude Sonnet 4.6 (Tier 2 Auditor)
**Branch:** `main` (audit committed, PR #32 merged)
**Status:** AUDIT COMPLETE — 2 bugs identified and documented, 1 DB correction applied, 2 code fixes required before next solver run

---

## What Happened Today

Standard daily solver audit for batch `5b5ac9b8-3a5e-4026-b9f6-a7a71ded5648`. All 5 properties processed cleanly, 0 fatal errors. However, the DB investigation during audit surfaced two structural bugs that will affect every future solver run until patched.

**New documents created this session:**
- `docs/status/DAILY_AUDIT_2026_03_06.md` — full audit report (H-075)
- `memory/solver-parser-debugging.md` — learnings doc for future agents (Available definition, trailing-space bug, RLS gap, DB query patterns)
- `docs/status/HISTORY_INDEX.md` — updated with H-075 entry

---

## Bug 1 — Parser Trailing Space: False Silent Drop Detection

**File:** `layers/parsing/composables/parsers/useParseResidentsStatus.ts` + `layers/admin/composables/useSolverEngine.ts`

**What happens:** The `Code` column in the Yardi 5p_Residents_Status Excel file sometimes has trailing spaces (e.g., `'t2487994 '`). The parser has no trim/normalize transform on `tenancy_id`, so the raw value (with space) enters the `reportedTenancyIds` Set. The solver's missing-tenancy check calls `reportedTenancyIds.has(t.id)` — the clean DB value `'t2487994'` does not match `'t2487994 '` → false positive silent drop.

**Impact today:** SB-1057 (Holli Mae Startin, Notice, move-out 5/4/26) and SB-1059 (Notice, move-out 5/16/26) were falsely detected as silently-dropped every run. Confirmed by the user from direct Yardi access — both are legitimately active Notice tenancies. Both rows ARE in the 5p_Residents_Status file at rows 687-692. The availability reset to Available was accidentally correct (Notice + no incoming tenant = correctly Available), but the mechanism is broken.

**Will recur:** Yes, every single run until fixed.

**Fix (2 files, ~5 lines total):**

Option A — fix in the parser config (`useParseResidentsStatus.ts`):
```ts
// Add a 'normalize_id' transform to useGenericParser.ts:
if (fieldConfig.transform === 'normalize_id') {
    if (rawVal === null || rawVal === undefined) return null
    return String(rawVal).trim().toLowerCase()
}

// Then in useParseResidentsStatus.ts:
'Code': { targetField: 'tenancy_id', transform: 'normalize_id', required: true },
```

Option B — fix defensively in the solver (`useSolverEngine.ts`):
```ts
const reportedTenancyIds = new Set(
    rows.filter((r: any) => r.tenancy_id)
        .map((r: any) => String(r.tenancy_id).trim().toLowerCase())
)
const missing = activeTenancies.filter(
    (t) => !reportedTenancyIds.has(String(t.id).trim().toLowerCase())
)
```

Option A (parser level) is architecturally cleaner and covers all future ID fields. Do both if possible. Also add a `console.error` critical alert when a parsed row has a null/empty tenancy_id after normalization — a missing tenancy_id should never be silently ignored since it's the primary matching key.

---

## Bug 2 — RLS Gap: Tenancy Status Transitions Silently Fail

**File:** `layers/admin/composables/useSolverEngine.ts` (silent drop transition block, ~line 625-648)

**What happens:** The solver runs with the authenticated user's JWT (not service_role). The RLS policy on the `tenancies` table silently blocks `UPDATE status = 'Past'` and `UPDATE status = 'Canceled'` for the authenticated role. Supabase returns HTTP 200 with no `error` object (RLS-blocked updates return an empty result, not an error). The solver only checks `if (error)` — it cannot detect 0 rows affected. The log says "Transitioned X tenancies → Canceled" but nothing commits to the DB.

**Impact:** Real silently-dropped tenancies (legitimate vacates or canceled applications) stay stuck at their prior status in the DB indefinitely. The solver will keep re-detecting them as "missing" on every run, creating a perpetual false-positive loop.

**Evidence:** Post-run DB query showed t2487994 and t2973298 still as `Notice` after solver logged transitions. Service role PATCH worked immediately.

**Fix:** Move the silent drop tenancy status update block to a server-side route using `serverSupabaseServiceRole`, same pattern as `layers/admin/server/api/solver/save-snapshot.post.ts`. Alternatively, investigate and fix the RLS policy to permit authenticated solver writes for status transitions.

Also add row-count validation:
```ts
const { data, error } = await supabase.from('tenancies').update({ status: 'Past' }).in('id', chunk)
if (error) console.error(`[Solver] ${pCode}: Past transition error:`, error)
if (!data || data.length === 0) console.warn(`[Solver] ${pCode}: Past transition — 0 rows affected (RLS?)`)
```

---

## DB Correction Applied This Session

During the audit DB investigation, I accidentally set tenancy `t2487994` (SB-1057, Holli Mae Startin) from `Notice` to `Past` via a direct service-role PATCH while testing. This was an error — the tenant is still active in Yardi with a May 2026 move-out date.

**Corrected:** t2487994 reverted to `Notice` via service role PATCH. Verified: `status = Notice`.

**No other DB changes were made.** The SB-1057 and SB-1059 availability records showing `Available` are correct and were not reversed — Notice tenants with no incoming Future/Applicant are legitimately Available (on the market).

---

## Operational Items (Hand Off to Next Audit Run — 03-09 Monday)

| Priority | Item | Details |
|---|---|---|
| 🔴 | RS 3103 Helbert | Move-in today (Saturday 03-07). RS manager must confirm MakeReady. Flag auto-resolves if Yardi clears. |
| 🔴 | Fix parser trim bug | SB-1057/1059 will false-flag again on Monday's run |
| 🔴 | Fix RLS gap | Real silent drops not committing |
| ⚠️ | WO 464-E | 4 days overdue; critical threshold 03-09 (Sanchez starts 03-16) |
| ⚠️ | RS Adame (1016) | Move-in 03-07 (today) — expect Current by 03-09 |
| ⚠️ | RS Rivera (2135) | Rent dropped 35% ($1,631→$1,060) — confirm with RS manager before 03-09 move-in |
| ⚠️ | OB S101 Mesinas | $0 rent Future tenancy started 03-06 — confirm with OB manager |
| ⚠️ | OB S093/S042 | Day 11 with 2027 ready dates — direct OB manager contact required |
| ⚠️ | SB Work Orders | Day 9+ deactivation anomaly — SB manager confirmation outstanding |
| ⚠️ | OB Delinquencies | 49 new entries on 03-06 — watch trend |
| ⚠️ | CV C419 | Enters overdue window 03-08 |

**W1 Watch status (Day 8):**
- Kenton, Christina (RS-2019) — Future, move-in 03-16. Continue watching.
- Jeffers, Ryan (RS-3130) — Future, move-in 03-10. **Retire after Current conversion on 03-10.**
- Poorman, Timothy (SB-1015) — Future, move-in 04-10. Continue watching.

---

## New Knowledge — Read Before Next Session

`memory/solver-parser-debugging.md` contains the following confirmed learnings from today:

1. **Available = on the market** (not "unoccupied"). Notice + no incoming tenant = correctly Available.
2. **tenancies table has no `updated_at` auto-trigger** — never filter by `updated_at` to find recent solver writes. Query by `id`/`status` directly.
3. **Parser trailing-space bug** — full details and fix pattern documented.
4. **RLS gap on tenancy status updates** — full details and fix pattern documented.
5. **Supabase direct curl pattern** for audit/forensics — credentials in `.env`.
6. **Unit names are not unique across RS and SB** — always use `unit_id`.
7. **Yardi tenancy_id always starts with `'t'`** — no exceptions observed.
