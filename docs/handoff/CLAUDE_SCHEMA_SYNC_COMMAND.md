# Golden Command: Schema Sync Task for Claude Code

**Date**: 2026-01-31  
**From**: Foreman (Antigravity)  
**To**: User (Edward)  
**Purpose**: Terminal command to dispatch Claude Code for schema sync

---

## The Golden Command

```bash
claude 'ACT AS: Tier 2 Builder (Goldfish) - Schema Sync Specialist

TASK: Supabase Schema Sync and Type Verification

CONTEXT FILES (READ THESE FIRST):
- docs/architecture/SYSTEM_MAP.md (READ ONLY)
- docs/status/HISTORY_INDEX.md (READ ONLY)
- docs/KNOWLEDGE_BASE.md (CRITICALLY IMPORTANT)
- docs/handoff/MESSAGE_TO_FOREMAN.md (TASK SPECIFICATION)
- types/supabase.ts (TYPE DEFINITIONS TO VERIFY)

OBJECTIVE:
Compare and sync three sources of truth:
1. Supabase database schema (live database via CLI)
2. Migration files in /supabase/migrations/
3. TypeScript types in /types/supabase.ts

SPECIFIC INVESTIGATION:
The Solver Engine is getting 406 errors when querying availabilities table:
```
GET /rest/v1/availabilities?select=id&unit_id=eq.<uuid>&status=in.(Applied,Leased)
→ 406 (Not Acceptable)
```

ROOT CAUSE HYPOTHESIS:
Schema mismatch - migration shows `status TEXT` but user confirms `availability_status ENUM` exists in database.

STEPS:
1. **Inspect Live Database Schema**:
   - Run: `npx supabase inspect db`
   - Check if `availability_status` ENUM exists
   - Verify `availabilities.status` column type (TEXT vs ENUM)
   - List all ENUMs and their values

2. **Compare Migration Files**:
   - Review: /supabase/migrations/20260128000000_solver_schema.sql
   - Review: /supabase/migrations/20260130000000_alter_availabilities_uuid_pk.sql
   - Check if migrations match live database

3. **Verify TypeScript Types**:
   - Check /types/supabase.ts line 639 (availabilities.status)
   - Check /types/supabase.ts line 788 (availability_status ENUM)
   - Verify ENUM values match database

4. **Identify Discrepancies**:
   - Document any mismatches between:
     * Database schema vs Migration files
     * Database schema vs TypeScript types
     * Migration files vs TypeScript types

5. **Fix Schema Sync**:
   - If database has ENUM but migration has TEXT: Update migration file
   - If types are wrong: Regenerate types with `npx supabase gen types typescript`
   - Document all changes made

6. **Verify Fix**:
   - Confirm 406 errors are resolved
   - Test availability queries work correctly

CRITICAL CONSTRAINTS:
1. **DO NOT EDIT ADMIN FILES**: (HISTORY_INDEX.md, STATUS_BOARD.md)
2. **NO LEGACY SYNTAX**: Use Nuxt 4/Supabase best practices
3. **VERIFY BEFORE CHANGING**: Inspect database first, then make changes

EXPECTED FINDINGS:
- availability_status ENUM exists with values: "Available", "Leased", "Applied", "Occupied"
- availabilities.status column should reference this ENUM (not TEXT)
- types/supabase.ts line 639 shows `status: string | null` (should be ENUM type)
- types/supabase.ts line 788 shows `availability_status: "available" | "leased"` (missing "Applied" | "Occupied")

FINAL STEP (MANDATORY):
Overwrite `docs/status/LATEST_UPDATE.md` with Field Report containing:
- List of schema discrepancies found
- Changes made to fix sync
- Verification that 406 errors are resolved
- Technical details of ENUM vs TEXT issue
**DO NOT** just chat. Write the file to disk.'
```

---

## Usage Instructions

1. **Copy the entire command above** (everything between the triple backticks)
2. **Paste into terminal** in the project root directory
3. **Press Enter** to dispatch Claude Code

---

## Expected Outcome

Claude Code will:
1. ✅ Inspect live Supabase database schema
2. ✅ Compare with migration files and TypeScript types
3. ✅ Fix schema mismatches (likely regenerate types)
4. ✅ Verify 406 errors are resolved
5. ✅ Create LATEST_UPDATE.md with findings

---

## Context for Foreman

**Issue**: Solver Agent discovered schema mismatch causing 406 errors on availability queries
**Root Cause**: `availabilities.status` column type mismatch (TEXT in migration vs ENUM in database)
**Impact**: Medium priority - 95% of Solver working, only availability updates affected
**Builder**: Claude Code (Tier 2 - Complex debugging and schema work)
