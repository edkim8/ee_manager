# Schema Sync Dispatch - Quick Reference

**Date**: 2026-01-31  
**Task**: Fix 406 errors in Solver Engine (availability queries)  
**Builder**: Claude Code (Tier 2)

---

## The Command

Copy and run this in your terminal:

```bash
claude 'ACT AS: Tier 2 Builder (Goldfish) - Schema Sync Specialist

TASK: Supabase Schema Sync and Type Verification

CONTEXT FILES (READ THESE FIRST):
- docs/handoff/MESSAGE_TO_FOREMAN.md (TASK SPECIFICATION)
- types/supabase.ts (TYPE DEFINITIONS TO VERIFY)

OBJECTIVE:
Fix 406 errors on availabilities table queries by syncing schema between:
1. Live Supabase database
2. Migration files
3. TypeScript types

INVESTIGATION:
Query failing: GET /rest/v1/availabilities?status=in.(Applied,Leased) → 406

HYPOTHESIS:
Migration shows `status TEXT` but database has `availability_status ENUM`

STEPS:
1. Inspect live database: `npx supabase inspect db`
2. Check if availability_status ENUM exists
3. Compare migration files vs live schema
4. Regenerate types if needed: `npx supabase gen types typescript`
5. Fix discrepancies
6. Verify 406 errors resolved

EXPECTED FIX:
- types/supabase.ts line 639: `status: string` → should reference ENUM
- types/supabase.ts line 788: `availability_status` missing "Applied" | "Occupied"

FINAL STEP (MANDATORY):
Create docs/status/LATEST_UPDATE.md with findings and fixes.'
```

---

## What Claude Will Do

1. ✅ Inspect Supabase database schema
2. ✅ Compare with migrations and types
3. ✅ Fix schema mismatches
4. ✅ Verify 406 errors resolved
5. ✅ Document findings in LATEST_UPDATE.md

---

## Issue Summary

**Problem**: 406 errors when querying `availabilities.status`  
**Cause**: Schema mismatch (TEXT vs ENUM)  
**Impact**: Availability updates failing in Solver Phase 2D  
**Priority**: Medium (95% of Solver working)
