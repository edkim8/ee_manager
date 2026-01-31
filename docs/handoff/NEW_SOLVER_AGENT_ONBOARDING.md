# Welcome to the Solver Engine - New Agent Onboarding

**Date**: 2026-01-31  
**From**: Foreman (Antigravity)  
**To**: New Solver Agent  
**Purpose**: Get you up to speed on the Solver Engine and complete remaining work

---

## Your Mission

You are taking over the **Solver Engine** - the core data synthesis system that processes Yardi property management reports and creates clean, normalized data for the application.

**Your immediate task**: Get up to speed with the existing Solver implementation and complete 2 remaining optional files.

---

## What is the Solver Engine?

The Solver Engine is **critical infrastructure** that:
1. Processes 8 different Yardi Excel reports
2. Synthesizes data across multiple sources
3. Creates normalized database records (tenancies, residents, leases, availabilities, applications)
4. Detects issues and creates alerts via the `unit_flags` system

**Why it matters**: This is the reason we restarted the previous app. Getting this right is essential.

---

## Current Status: 5 Phases Complete ✅

### Phase 1: Anchor (Tenancies & Residents) ✅
- **What**: Creates tenancy records and links residents
- **Key Pattern**: "Strict Primary" - only Primary residents update tenancy data
- **Status**: Complete and tested

### Phase 2: Financials (Leases) ✅
- **What**: Processes lease data with renewal detection
- **Key Pattern**: 3-Criteria Renewal Detection (prevents duplicate tenancies)
- **Status**: Complete with historical preservation

### Phase 2A: Intent (Notices) ✅
- **What**: Updates move-out dates from Notices report
- **Key Pattern**: Status auto-fix (Future/Applicant → Notice)
- **Status**: Complete with dual table updates

### Phase 2C: MakeReady ✅
- **What**: Processes makeready dates and creates overdue flags
- **Key Innovation**: Introduced `unit_flags` system (core infrastructure)
- **Status**: Complete with 5 flags created in testing

### Phase 2D: Applications ✅
- **What**: Saves application data and creates overdue flags
- **Key Achievement**: Fixed 5 critical bugs, improved schema design
- **Status**: Complete with 4/4 applications saved

---

## Critical Infrastructure: unit_flags System

**This is game-changing infrastructure you MUST understand.**

### What is it?
A flexible, extensible system for tracking unit-level issues across ALL modules.

### Why it matters?
- No schema changes needed to add new alert types
- Rich metadata storage (JSONB)
- Historical tracking (soft delete)
- Severity levels (info, warning, error)

### Current Flag Types:
1. `makeready_overdue` - MakeReady past due date
2. `application_overdue` - Application screening pending >7 days

### Your responsibility:
**Always use unit_flags for unit-level alerts.** Don't add boolean columns to core tables.

**Read this**: `/docs/architecture/UNIT_FLAGS_GUIDE.md` (291 lines)

---

## Essential Documents to Read

### 1. Core Logic (MUST READ FIRST)
**File**: `/layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md` (520 lines)

**What you'll learn**:
- All 5 phases explained with code examples
- Troubleshooting sections with actual bugs fixed
- Edge case handling
- Verification results

**Time to read**: 30-45 minutes

### 2. Unit Flags Guide (MUST READ SECOND)
**File**: `/docs/architecture/UNIT_FLAGS_GUIDE.md` (291 lines)

**What you'll learn**:
- Architecture and design decisions
- How to create, query, and resolve flags
- Future flag type recommendations
- Best practices for AI agents

**Time to read**: 20-30 minutes

### 3. Implementation Code (REFERENCE)
**File**: `/layers/admin/composables/useSolverEngine.ts` (1143 lines)

**What you'll learn**:
- Actual implementation of all 5 phases
- Helper functions (mapTenancyStatus, parseDate, isRenewal)
- Safe Sync patterns
- Error handling

**Time to read**: Skim first, reference as needed

### 4. Database Schema (REFERENCE)
**Files**:
- `/supabase/migrations/20260128000000_solver_schema.sql` (289 lines)
- `/supabase/migrations/20260131000000_create_unit_flags.sql` (37 lines)
- `/supabase/migrations/20260131000002_add_screening_result_to_applications.sql` (30 lines)

**What you'll learn**:
- All tables, indexes, views
- ENUMs and constraints
- RLS policies

**Time to read**: 15-20 minutes

---

## Key Patterns You Must Follow

### 1. Unit Resolution (Used in ALL phases)
```typescript
// Composite key lookup: property_code + unit_name → unit_id
const unitId = resolveUnitId(propertyCode, unitName)
```

### 2. Safe Sync Pattern
```typescript
// Check which records exist, then INSERT new or UPDATE existing
// NEVER blindly overwrite data
const existingIds = new Set(existingData?.map(r => r.id) || [])
const newRecords = records.filter(r => !existingIds.has(r.id))
const existingRecords = records.filter(r => existingIds.has(r.id))
```

### 3. Flag Creation
```typescript
// Always use ignoreDuplicates for partial unique index
await supabase
  .from('unit_flags')
  .insert([flag], { ignoreDuplicates: true })
```

### 4. Batch Processing
```typescript
// Always chunk large arrays (1000 records per chunk)
for (let i = 0; i < records.length; i += 1000) {
  const chunk = records.slice(i, i + 1000)
  await supabase.from('table').insert(chunk)
}
```

---

## Your Immediate Tasks

### Task 1: Get Up to Speed (30-60 minutes)
1. Read `SOLVER_LOGIC_EXPLAINED.md` (focus on Phases 1, 2, 2A, 2C, 2D)
2. Read `UNIT_FLAGS_GUIDE.md` (understand the architecture)
3. Skim `useSolverEngine.ts` (see the patterns in action)
4. Review database schema files (understand the tables)

### Task 2: Complete Remaining Optional Files
**User will provide details on which 2 optional files need work.**

These are likely:
- Additional Yardi reports (Transfers, etc.)
- Additional flag types
- Additional processing logic

**Approach**:
1. Follow established patterns (unit resolution, Safe Sync, etc.)
2. Use unit_flags for any alerts
3. Add comprehensive documentation to `SOLVER_LOGIC_EXPLAINED.md`
4. Test with real data
5. Create completion report

---

## Testing Guidance

### How to Test Your Work
1. Upload sample Excel file via the parsing playground
2. Run the Solver Engine batch process
3. Verify data in database tables
4. Check console logs for errors/warnings
5. Verify flags created correctly

### Verification Queries
```sql
-- Check tenancies
SELECT * FROM tenancies WHERE property_code = 'CV' ORDER BY created_at DESC;

-- Check flags
SELECT 
  uf.severity,
  u.unit_name,
  uf.flag_type,
  uf.metadata
FROM unit_flags uf
JOIN units u ON u.id = uf.unit_id
WHERE uf.resolved_at IS NULL;

-- Check applications
SELECT * FROM applications ORDER BY application_date DESC;
```

---

## Known Issues & Limitations

### 1. Flag Auto-Resolution Disabled
**Issue**: Bulk flag resolution causes 400 errors with large arrays  
**Location**: Lines 971-993 in `useSolverEngine.ts` (commented out)  
**Impact**: Flags must be manually resolved  
**Workaround**: Implement different approach if needed

### 2. Browser Cache Issues
**Issue**: 406 errors when old code cached  
**Workaround**: Hard refresh (Cmd+Shift+R)  
**Impact**: Temporary, resolves after cache clear

---

## Communication Protocol

### When You Complete Work
Create a completion report following this template:

**File**: `STEP_[NAME]_COMPLETION_REPORT.md` (in your brain directory)

**Include**:
1. Executive Summary (what you built)
2. Work Completed (database changes, code changes)
3. Issues Resolved (any bugs you fixed)
4. Testing Results (actual test data and results)
5. Handoff Notes for Foreman (what needs to be documented)

**Examples**: See `STEP_2A_COMPLETION_REPORT.md`, `STEP_2C_COMPLETION_REPORT.md`, `STEP_2D_COMPLETION_REPORT.md` in the previous Solver agent's brain directory.

### Documentation Updates
After completing work, update:
1. `SOLVER_LOGIC_EXPLAINED.md` - Add your phase/logic
2. `UNIT_FLAGS_GUIDE.md` - If you added new flag types
3. `task.md` - Mark items complete

The Foreman will handle updating governance files (STATUS_BOARD, HISTORY_INDEX, etc.).

---

## Questions to Ask Yourself

Before you start coding:
- [ ] Have I read `SOLVER_LOGIC_EXPLAINED.md`?
- [ ] Do I understand the unit_flags system?
- [ ] Do I know which patterns to follow?
- [ ] Have I reviewed similar phases for reference?

Before you submit work:
- [ ] Did I follow established patterns?
- [ ] Did I use unit_flags for alerts?
- [ ] Did I test with real data?
- [ ] Did I document everything?
- [ ] Did I create a completion report?

---

## Success Criteria

You'll know you're successful when:
1. ✅ You can explain the Solver Engine architecture
2. ✅ You can identify which pattern to use for a given task
3. ✅ Your code follows the same style as existing phases
4. ✅ Your documentation is as comprehensive as previous phases
5. ✅ Your tests verify all edge cases

---

## Resources

### Documentation
- `/layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md` - Core logic
- `/docs/architecture/UNIT_FLAGS_GUIDE.md` - Flag system
- `/docs/handoff/SOLVER_DOCUMENTATION_AUDIT.md` - Audit report (proof everything is documented)

### Code
- `/layers/admin/composables/useSolverEngine.ts` - Main implementation
- `/layers/parsing/composables/parsers/` - Parser implementations

### Database
- `/supabase/migrations/` - All schema migrations
- `/types/supabase.ts` - TypeScript types

### Previous Work
- Brain directory: `/Users/edward/.gemini/antigravity/brain/444c3f7b-1833-497f-95bc-a2ea0e57a7bc/`
- Completion reports: `STEP_2A_COMPLETION_REPORT.md`, `STEP_2C_COMPLETION_REPORT.md`, `STEP_2D_COMPLETION_REPORT.md`

---

## Final Notes

### The Solver Engine is Critical
This is the foundation of the entire application. The previous app failed because this wasn't done right. Take your time, follow the patterns, and document everything.

### The unit_flags System is Revolutionary
This is core infrastructure that will be used by ALL future modules. Understand it deeply and use it correctly.

### You're Not Starting from Scratch
5 phases are complete with excellent documentation. Learn from them, follow their patterns, and maintain the same quality.

---

## Ready to Start?

1. **First**: Read `SOLVER_LOGIC_EXPLAINED.md` (30-45 min)
2. **Second**: Read `UNIT_FLAGS_GUIDE.md` (20-30 min)
3. **Third**: Tell the user you're ready and ask about the 2 optional files

**Good luck! The Foreman is here to help if you need guidance.**

---

**Foreman Sign-Off**: This onboarding document contains everything you need to succeed.  
**Date**: 2026-01-31
