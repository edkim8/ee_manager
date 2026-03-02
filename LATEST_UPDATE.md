# Latest Update — 2026-03-02

## Fix: `view_table_units` Canceled Tenancy Status Bug

**Branch:** `fix/canceled-tenancy-unit-status`
**Migration:** `supabase/migrations/20260302000001_fix_view_table_units_canceled_status.sql`

---

### Problem

When the solver cancels an `Applicant` or `Future` tenancy, it sets `tenancies.status = 'Canceled'`.
The `latest_tenancies` CTE in `view_table_units` selected the most-recent row by `created_at DESC`
with no status filter — so the freshly-canceled row won. The unit appeared as **Canceled** in the
Unit Search UI (H-065) instead of reverting to the physical occupant's tenancy (`Current`, `Notice`,
etc.).

This was discovered during H-065 Universal Unit Search QA, where units with canceled applications
surfaced "Canceled" as an active tenancy status filter option.

---

### Root Cause

```sql
-- BEFORE (broken)
latest_tenancies AS (
  SELECT DISTINCT ON (tenancies.unit_id) ...
  FROM tenancies
  ORDER BY tenancies.unit_id, tenancies.created_at DESC  -- no status filter
)
```

The `DISTINCT ON` / `ORDER BY created_at DESC` pattern picks the single most-recently-created row
per unit. Canceled rows are written by the solver at run-time, making them the newest row — they
always win.

---

### Fix

```sql
-- AFTER (fixed)
latest_tenancies AS (
  SELECT DISTINCT ON (tenancies.unit_id) ...
  FROM tenancies
  WHERE tenancies.status != 'Canceled'::tenancy_status   -- ← one-line fix
  ORDER BY tenancies.unit_id, tenancies.created_at DESC
)
```

Canceled rows are now invisible to the view. The `DISTINCT ON` then picks the most-recent
non-canceled tenancy per unit. If no non-canceled tenancy exists, the `LEFT JOIN` returns `NULL`
and `COALESCE(lt.status, 'Past'::tenancy_status)` safely falls back to `'Past'` — same as before.

---

### Constraints Respected

| Constraint | Status |
|---|---|
| `tenancies` table data untouched | ✅ View-only change |
| `security_invoker = true` preserved | ✅ `ALTER VIEW ... SET (security_invoker = true)` re-applied after `CREATE OR REPLACE` |
| `GRANT SELECT TO authenticated` preserved | ✅ Re-applied at end of migration |
| All columns and joins unchanged | ✅ Diff is one `WHERE` clause |

---

### Verification Steps

After applying the migration:
1. Query `view_table_units` directly for a unit known to have a Canceled tenancy — confirm
   `tenancy_status` shows the physical occupant's status, not `Canceled`.
2. Open `/assets/units` (Universal Unit Search) — confirm `Canceled` is no longer present as a
   `tenancy_status` facet option.
3. Confirm units that are genuinely vacant (no tenancies at all) still show `Past`.
