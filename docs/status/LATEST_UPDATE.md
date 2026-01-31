# Schema Sync Status Update

**Date**: 2026-01-31
**Task**: Supabase Schema Sync and Type Verification
**Status**: COMPLETE

---

## Summary

Successfully synced TypeScript types with live Supabase database and resolved 406 errors on availabilities table queries.

### Verification Result
```
Query: GET /rest/v1/availabilities?status=in.(Applied,Leased)
Before: 406 Not Acceptable
After:  200 OK
```

---

## Investigation Summary

### Original Issue
- 406 errors on `availabilities` table queries: `GET /rest/v1/availabilities?status=in.(Applied,Leased)`

### Root Cause Analysis
The 406 error was caused by schema synchronization issues between:
1. TypeScript types (`types/supabase.ts`)
2. Live Supabase database
3. Local migration files

The `availabilities.status` column is correctly defined as `TEXT` (not ENUM). The primary issues were:
- Outdated ENUM definitions in TypeScript types
- Missing views in the database
- Inconsistent view naming conventions
- Nullable `is_active` column that should have a default

---

## Schema Comparison Results

### 1. `availability_status` ENUM - FIXED
| Source | Values |
|--------|--------|
| **Before** (types/supabase.ts) | `"available" \| "leased"` (lowercase, 2 values) |
| **After** (Live DB & types) | `"Available" \| "Leased" \| "Applied" \| "Occupied"` (PascalCase, 4 values) |

### 2. `applications` table - FIXED
| Column | Before | After |
|--------|--------|-------|
| `status` | Present | Removed (intentionally removed from DB) |
| `is_overdue` | Present | Removed (intentionally removed from DB) |
| `screening_result` | Missing | Added |

### 3. Views - FIXED
| View | Before | After |
|------|--------|-------|
| `view_availabilities_metrics` | In types only | Now in both DB and types |
| `leases_view` | In DB only | Renamed to `view_leases` (consistent `view_` prefix) |
| `view_leases` | Missing | Added to both DB and types |

### 4. `availabilities.is_active` - FIXED
| Aspect | Before | After |
|--------|--------|-------|
| Nullability | `boolean \| null` | `boolean` (NOT NULL) |
| Default | None | `DEFAULT true` |

---

## Changes Made

### Files Modified

1. **types/supabase.ts**
   - Fixed `availability_status` ENUM: `"available" | "leased"` → `"Available" | "Leased" | "Applied" | "Occupied"`
   - Updated `applications` table: removed `status`, `is_overdue`; added `screening_result`
   - Added `view_leases` to Views section
   - Fixed duplicate closing brace syntax error (line 462-463)

### Files Created

2. **supabase/migrations/20260131000003_schema_sync_views_and_constraints.sql**
   - Renames `leases_view` → `view_leases` (consistent naming)
   - Creates/updates `view_availabilities_metrics`
   - Fixes `availabilities.is_active`: `SET DEFAULT true`, `SET NOT NULL`

3. **docs/status/LATEST_UPDATE.md**
   - This documentation file

---

## Migration History

All migrations are now in sync between local and remote:

| Migration | Description | Status |
|-----------|-------------|--------|
| 20260120054010 | Create profiles table | Applied |
| 20260120060000 | User property access | Applied |
| 20260128000000 | Solver schema | Applied |
| 20260130000000 | Alter availabilities UUID PK | Applied |
| 20260131000000 | Create unit flags | Applied |
| 20260131000002 | Add screening result to applications | Applied |
| 20260131000003 | Schema sync views and constraints | Applied |

---

## Files Changed Summary

```
Modified:
  types/supabase.ts

Created:
  supabase/migrations/20260131000003_schema_sync_views_and_constraints.sql
  docs/status/LATEST_UPDATE.md
```

---

## Verification Commands

```bash
# Check migration status
npx supabase migration list

# Regenerate types from live DB (to verify sync)
npx supabase gen types typescript --linked

# Test the previously failing query
curl -s 'https://yeuzutjkxapfltvjcejz.supabase.co/rest/v1/availabilities?status=in.(Applied,Leased)' \
  --header 'apikey: <YOUR_KEY>' \
  --header 'Authorization: Bearer <YOUR_KEY>'
# Expected: 200 OK
```
