# Latest Update — Transfer Flag Bug Fix & Solver Cleanup

**Date:** 2026-02-28
**Branch:** feat/mobile-ui

- **Bug Fix — Transfer Flag UNKNOWN Property**: Solver Phase 2E was logging property code as `UNKNOWN` for all transfer flag operations. Root cause: the generic staging grouping loop used `r.property_code`, which doesn't exist on `TransfersRow` (only `from_property_code` / `to_property_code` exist). Fixed with `r.from_property_code` fallback.
- **Refactor — Parallel Staging Inserts**: Sequential `for await` insert loop replaced with `Promise.all` — all property groups within a report type now insert concurrently.
- **Audit — 2026-02-28**: Daily audit completed, committed, and emailed. 9 clean / 3 warnings. Option B snapshot confirmed stable (Day 2). SB-3125 transfer (McShan, Toya: #2015 → #3125) processed correctly.

---

## Transfer Flag UNKNOWN Fix

**File:** `layers/admin/pages/admin/solver.vue:164`

`TransfersRow` has no top-level `property_code` field — it only exposes `from_property_code` and `to_property_code`. The generic staging grouping loop read `r.property_code`, which was always `undefined`, producing `'UNKNOWN'` as the staging record's `property_code`. The solver's actual flag creation logic was already correct (used per-row `from_property_code`/`to_property_code`), so no data was lost — only the staging record label and log output were wrong.

```typescript
// Before:
const pCode = r.property_code || 'UNKNOWN'

// After:
// TransfersRow has no top-level property_code — fall back to from_property_code.
// All other report types expose property_code directly.
const pCode = r.property_code || r.from_property_code || 'UNKNOWN'
```

Tomorrow's run should log `for SB` (or the relevant from-property) instead of `for UNKNOWN`.

---

## Unit Identification Rule (Architectural — 2026-02-28)

RS and SB share the same unit name format (leading digit = floor number, followed by 3-digit unit number). Unit name `3125` exists at both properties. **`unit_name` alone is never a unique identifier.**

Rule: always resolve `(property_code, unit_name) → unit_id` and use `unit_id` as the sole unique unit discriminator for any analytical or decision-making process. This applies to solver logic, audit reporting, and future apartment additions.

---

## Commits (2026-02-28)

| Commit | Description |
|---|---|
| `9dd9dce` | docs: daily audit 2026-02-28 (initial write) |
| `f7c9304` | docs: correct audit — RS-3125 misidentified as SB-3125 |
| `5ef3b56` | fix(solver): resolve UNKNOWN property code in transfer flag staging |
| `16ac608` | refactor(solver): parallelize staging inserts and document Transfers fallback |

---

## Files Changed

| File | Changes |
|---|---|
| `layers/admin/pages/admin/solver.vue` | `from_property_code` fallback added; sequential insert loop replaced with `Promise.all` |
| `docs/status/DAILY_AUDIT_2026_02_28.md` | Daily audit report (corrected post-write for RS/SB-3125 misidentification) |

---

## Previous Update (2026-02-27) — Context Impersonation Refinement & Dept-Based Navigation

- **Foundation - Auth Persistence**: Extended Supabase session cookies to 14 days in `nuxt.config.ts`.
- **Foundation - UI Components**:
  - `SimpleModal.vue`: Converted to a mobile-first "Bottom Sheet" with slide animations and large touch-targets.
  - `DashboardHero.vue`: Optimized layout for small screens, including responsive typography and metric grids.
- **Context Impersonation (Refined)**:
  - Role downshifting is now open to all appropriate roles (Manager, RPM, etc.).
  - Navigation now dynamically hides modules based on department (Maintenance, Leasing, etc.).
  - Admin menu auto-hides when impersonating non-Owner roles.

### Department-Based Menu Filtering

| Module | Visible to departments |
|---|---|
| Dashboard | Always visible |
| Assets | Always visible |
| Leasing | Management, Leasing (or no dept) |
| Residents | Management, Leasing (or no dept) |
| Operations | Management, Leasing, Maintenance (or no dept) |
| Owners | Invest (or no dept) — **also requires Owner/Asset role** |
| Admin | Super admin only (`is_super_admin === true` in patched context) |

### Who Can Access Which Menus

| Department | Dashboard | Assets | Leasing | Residents | Operations | Owners | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| None (default/super admin) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (if role) | ✓ (if SA) |
| Management | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Leasing | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Maintenance | ✓ | ✓ | — | — | ✓ | — | — |
| Invest | ✓ | ✓ | — | — | — | ✓ (if role) | — |

### Files Changed (2026-02-27)

| File | Changes |
|---|---|
| `layers/base/composables/usePropertyState.ts` | `availableDownshiftRoles` removed admin gate; `userContext` patches `is_super_admin`; `setOverride` opens to non-admins with anti-upshift guard; `canUseDevTools` added and exported |
| `layers/base/components/AppNavigation.vue` | `navigationItems` refactored with dept filtering; dev tools gates use `canUseDevTools` |
