# Latest Update — 2026-03-02

## Fix: `view_table_units` Tenancy Status Fallback (Canceled + Denied)

**Branch:** `fix/canceled-tenancy-unit-status`
**Migrations:** `20260302000001`, `20260302000002`
**UI Files:** `layers/ops/pages/assets/units/search.vue`, `index.vue`
**Status:** All migrations applied to production. Branch ready for PR.

---

## Summary for Foreman

During QA of the H-065 Universal Unit Search page, we found that `view_table_units` — the view
backing both the Units table and the Advanced Search page — had a silent bug in its
`latest_tenancies` CTE. When the solver cancels an Applicant or Future tenancy, it writes a new
row with `status = 'Canceled'`. Because the CTE selected the most-recently-created tenancy row per
unit with no status filter, that Canceled row always won. Units appeared as "Canceled" in the UI
instead of showing their physical occupant's status.

Further QA revealed a second issue: one SB unit was showing `Denied` — a legacy status that
predates the solver's adoption of `Canceled` as the unified term for both canceled and denied
applications. It had the exact same root cause.

A third issue was also discovered: `Applicant` and `Eviction` are valid, live tenancy statuses
present in the data but were missing from the Advanced Search filter options.

All three issues are now resolved.

---

## Changes Made

### Migration 1 — `20260302000001_fix_view_table_units_canceled_status.sql`

**Problem:** `view_table_units` surfaced `Canceled` as an active unit status.

**Root cause:**
```sql
-- BEFORE (broken) — no status guard
latest_tenancies AS (
  SELECT DISTINCT ON (tenancies.unit_id) ...
  FROM tenancies
  ORDER BY tenancies.unit_id, tenancies.created_at DESC
)
```

**Fix:**
```sql
-- AFTER — exclude Canceled rows
latest_tenancies AS (
  SELECT DISTINCT ON (tenancies.unit_id) ...
  FROM tenancies
  WHERE tenancies.status != 'Canceled'::tenancy_status
  ORDER BY tenancies.unit_id, tenancies.created_at DESC
)
```

**Result:** 0 units showing `Canceled` across all 5 properties after push.

---

### Migration 2 — `20260302000002_fix_view_table_units_denied_status.sql`

**Problem:** 1 SB unit was showing `Denied` — a legacy status from before the solver unified
Canceled and Denied into a single term. Same root cause as above.

**Fix:** Extended the exclusion to cover both statuses:
```sql
WHERE tenancies.status NOT IN ('Canceled'::tenancy_status, 'Denied'::tenancy_status)
```

**Result:** `Denied` gone. The unit resolved to `Current` (it had an active underlying tenancy).
SB total reconciled to 392 units.

Both migrations:
- Re-apply `ALTER VIEW ... SET (security_invoker = true)` after `CREATE OR REPLACE` (required — `CREATE OR REPLACE` resets view options)
- Re-apply `GRANT SELECT ON view_table_units TO authenticated`
- Do NOT touch the `tenancies` table data

---

### UI Fix — `search.vue` + `index.vue`

**Problem:** `Applicant` and `Eviction` are real tenancy statuses in production data but were
absent from the Tenancy Status filter in the Advanced Search sidebar and had no badge colors in
either the search page or the main units table.

**Fix:**
- `tenancyStatusOptions` in `search.vue`: added `'Applicant'` and `'Eviction'`
- `tenancyStatusColors` in both files: `Applicant → 'warning'` (yellow), `Eviction → 'error'` (red)

---

## Final Production Status Count (post all migrations)

| Property | Current | Notice | Future | Applicant | Eviction | Past | Total |
|---|---|---|---|---|---|---|---|
| CV | 113 | 1 | — | 3 | — | 5 | 122 |
| OB | 198 | 4 | 3 | — | 3 | 15 | 223 |
| RS | 305 | 32 | 6 | 2 | — | 12 | 357 |
| SB | 359 | 18 | 3 | — | — | 12 | 392 |
| WO | 89 | 1 | — | — | — | 2 | 92 |

No `Canceled` or `Denied` rows remain in `view_table_units`.

---

## Commits on Branch

| Hash | Message |
|---|---|
| `96e76cc` | `fix(view_table_units): exclude Canceled tenancies from latest_tenancies CTE` |
| `f30ef84` | `fix(units): exclude Denied from view CTE; add Applicant+Eviction filters` |
