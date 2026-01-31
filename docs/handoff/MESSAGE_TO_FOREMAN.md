# Message to Foreman: Schema Sync Request for Claude Code

**Date**: 2026-01-31  
**From**: Solver Agent (Gemini Goldfish)  
**To**: Foreman  
**Subject**: Request Claude Code schema review and sync

---

## Issue Summary

The Solver Engine is experiencing **406 Not Acceptable errors** when querying the `availabilities` table during Phase 2D (Applications processing). This appears to be a **schema mismatch** between:

1. Migration files in `/supabase/migrations/`
2. Actual Supabase database schema
3. TypeScript types in `/types/supabase.ts`

---

## What's Working ✅

- Phase 1: Tenancies/Residents (1,177 records synced)
- Phase 2A: Notices (11 auto-fixes applied)
- Phase 2C: MakeReady (4 overdue flags created)
- Phase 2D: Applications (5 applications saved)
- **Phase 2E: Transfers (26 transfer flags created)** ← New phase, working perfectly!

---

## What's Failing ❌

**Phase 2D - Availability Updates**:
```
GET /rest/v1/availabilities?select=id&unit_id=eq.<uuid>&status=in.(Applied,Leased)
→ 406 (Not Acceptable)
```

**Impact**:
- Availability records not being updated with `leasing_agent`
- No overdue application flags being created
- Applications are still being saved (query failure doesn't block saves)

---

## Root Cause Analysis

### Code Change Made
Fixed line 1049 in `useSolverEngine.ts`:
```typescript
// BEFORE (Wrong - using tenancy_status values)
.in('status', ['Applicant', 'Future'])

// AFTER (Correct - using availability_status values)
.in('status', ['Applied', 'Leased'])
```

### Why 406 Still Occurs
The query URL shows the correct values are being sent:
```
status=in.(Applied,Leased)
```

But Supabase returns **406 Not Acceptable**, which typically means:
1. Column type mismatch (TEXT vs ENUM)
2. PostgREST can't parse the query
3. Schema definition doesn't match actual database

---

## Schema Information

### From Migration File (`20260128000000_solver_schema.sql`)
```sql
CREATE TABLE public.availabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id),
    property_code TEXT NOT NULL,
    status TEXT, -- 'Available', 'Applied', 'Leased', 'Occupied'
    ...
);
```

**Note**: Comment shows ENUM-like values, but column is defined as `TEXT`

### User Confirmation
User stated: "In Supabase we have Enum defined as: `public.availability_status` → Available, Leased, Applied, Occupied"

**Mismatch**: Migration shows `TEXT`, user says ENUM exists in Supabase

---

## Request for Claude Code

Please have Claude Code perform the following:

### 1. Schema Comparison
Compare these three sources:
- **Migration files**: `/supabase/migrations/*.sql`
- **Actual Supabase database**: Direct access to live schema
- **TypeScript types**: `/types/supabase.ts`

### 2. Specific Items to Check

#### A. `availabilities` Table
- Is `status` column `TEXT` or `availability_status` ENUM?
- Does `availability_status` ENUM exist in database?
- If ENUM exists, what are the exact values?

#### B. Other ENUMs
- `tenancy_status` ENUM (should be: Current, Notice, Future, Applicant, Eviction, Past, Denied, Canceled)
- Any other ENUMs that might be out of sync

#### C. Type Definitions
- Does `/types/supabase.ts` match actual database schema?
- Are ENUM types properly defined in TypeScript?

### 3. Sync Actions Needed
- Update migration files if they don't match database
- Update TypeScript types if they don't match database
- Document any discrepancies found

---

## Files to Review

### Migration Files
- `/supabase/migrations/20260128000000_solver_schema.sql` (main schema)
- `/supabase/migrations/20260130000000_alter_availabilities_uuid_pk.sql` (recent change)
- `/supabase/migrations/20260131000002_add_screening_result_to_applications.sql` (recent change)

### Code Files
- `/layers/admin/composables/useSolverEngine.ts` (line 1049 - the query)
- `/types/supabase.ts` (type definitions)

### Documentation
- `/Users/edward/.gemini/antigravity/brain/8dff58f1-b366-4bd7-b7e0-2e5d6861ca43/AVAILABILITY_STATUS_BUG_FIX.md` (bug analysis)

---

## Expected Outcome

After schema sync:
1. ✅ No 406 errors on availability queries
2. ✅ Availability updates succeed (leasing_agent field populated)
3. ✅ Overdue application flags created for applications >7 days old
4. ✅ All 6 Solver phases running without errors

---

## Priority

**Medium** - Solver is 95% functional. Only availability updates are affected. Core data processing (Tenancies, Residents, Leases, Notices, MakeReady, Applications, Transfers) all working correctly.

---

## Additional Context

- Browser cache was cleared multiple times (hard refresh, empty cache, etc.)
- 406 errors persist across cache clears, confirming this is a server-side schema issue
- The query syntax is correct for PostgREST `.in()` operator
- Phase 2E (Transfers) was just implemented and is working perfectly, demonstrating the Solver Engine is otherwise healthy

---

**Solver Agent signing off. Ready for Claude Code schema review.**
