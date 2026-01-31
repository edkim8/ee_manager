# Message to Solver Agent: Phase 2D (Applications) - Implementation Plan Ready

**From**: Foreman (Antigravity)  
**To**: Solver Agent  
**Date**: 2026-01-31  
**Subject**: Phase 2D (Applications) Implementation Plan - Ready for Your Work

---

## What I Did (Foreman)

I created a **comprehensive implementation plan** for Phase 2D (Applications) based on the user's requirements. **I did NOT implement the code** - that's your job!

### Documents I Created

1. **`step_2d_applications_plan.md`** (in brain/bf391703.../artifacts)
   - Complete implementation plan
   - Data flow diagrams
   - Edge case handling
   - Testing strategy
   - Success criteria

2. **Updated `task.md`**
   - Added Phase 2D checklist with 9 sub-tasks
   - Tracks your implementation progress

---

## Your Implementation Tasks

### 1. Database Migration
**File to create**: `/supabase/migrations/20260131000002_add_screening_result_to_applications.sql`

```sql
ALTER TABLE public.applications 
ADD COLUMN screening_result TEXT;

CREATE INDEX idx_applications_overdue 
ON public.applications(application_date, screening_result) 
WHERE screening_result IS NULL;
```

### 2. Solver Engine Implementation
**File to modify**: `/layers/admin/composables/useSolverEngine.ts`

**Add new function**: `processApplications(propertyCode: string, rows: any[])`

**Key Logic**:
- Unit resolution: `property_code` + `unit_name` → `unit_id` (reuse existing pattern)
- Find availability: `WHERE unit_id AND status IN ('Applicant', 'Future')`
- Update availability: `SET leasing_agent = agent`
- Save application: Upsert to `applications` table
- Overdue detection: `application_date > 7 days AND screening_result IS NULL`
- Create flag: `application_overdue` (warning: 8-14 days, error: 14+ days)

### 3. Flag Metadata Structure
```json
{
  "application_date": "2026-01-15",
  "days_overdue": 16,
  "applicant_name": "John Doe",
  "unit_name": "C107",
  "agent": "Jane Smith"
}
```

---

## How to Document When Complete

### 1. Create Completion Report
**File**: `STEP_2D_COMPLETION_REPORT.md` (in your brain directory)

**Include**:
- Work completed summary
- Issues resolved (if any)
- Testing results with actual data
- Files modified
- Handoff notes for Foreman

**Example structure** (follow Step 2A and 2C reports):
```markdown
# Step 2D (Applications) - Completion Report

## Executive Summary
[What you built]

## Work Completed
[Database changes, code changes]

## Issues Resolved
[Any bugs you fixed]

## Testing Results
[Actual test data and results]

## Handoff Notes for Foreman
[What the Foreman should document in governance]
```

### 2. Update SOLVER_LOGIC_EXPLAINED.md
**File**: `/layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md`

**Add new section** (after Phase 2C):
```markdown
## 6. Phase 2D: Applications (Leasing Pipeline) - COMPLETE ✅

### Overview
[Explain the logic]

### Key Achievements
[Unit resolution, availability updates, overdue detection]

### Verification Results
[Test results]

### Troubleshooting
[Any issues you encountered and fixed]
```

### 3. Update UNIT_FLAGS_GUIDE.md
**File**: `/docs/architecture/UNIT_FLAGS_GUIDE.md`

**Add to "Current Flag Types" section**:
```markdown
### 2. `application_overdue`
**Purpose**: Alert when application screening is overdue (>7 days without result)
**Severity**: `warning` (8-14 days), `error` (14+ days)
**Metadata**:
{
  "application_date": "2026-01-15",
  "days_overdue": 16,
  "applicant_name": "John Doe",
  "unit_name": "C107",
  "agent": "Jane Smith"
}

**Created By**: Solver Engine (Step 2D: Applications)
**Resolved When**: Screening result added to application
```

### 4. Mark Tasks Complete
**File**: `task.md` (in your brain directory)

Mark each sub-task as `[x]` when done:
```markdown
- [x] Create migration to add `screening_result` column
- [x] Implement `processApplications` function
- [x] Add unit resolution logic
...etc
```

---

## Testing Guidance

### Sample Test Data
Upload `5p_Applications.xlsx` with:
- Mix of applications with/without screening results
- Mix of recent (<7 days) and overdue (>7 days)
- Multiple properties

### Verification Queries
```sql
-- Check applications saved
SELECT * FROM applications 
WHERE property_code = 'CV'
ORDER BY application_date DESC;

-- Check overdue flags
SELECT 
  uf.severity,
  u.unit_name,
  uf.metadata->>'applicant_name' as applicant,
  uf.metadata->>'days_overdue' as days_overdue
FROM unit_flags uf
JOIN units u ON u.id = uf.unit_id
WHERE uf.flag_type = 'application_overdue'
  AND uf.resolved_at IS NULL;

-- Check availabilities updated
SELECT unit_name, leasing_agent, status
FROM availabilities
WHERE leasing_agent IS NOT NULL;
```

---

## Important Notes

1. **Reuse Existing Patterns**: Unit resolution, flag creation - copy from Step 2A/2C
2. **Use `ignoreDuplicates: true`**: For flag inserts (partial unique index)
3. **Handle Edge Cases**: Orphan units, no matching availability, etc.
4. **Debug Logging**: Add console logs for troubleshooting
5. **Idempotency**: Re-running should be safe

---

## What Foreman Will Do After You're Done

Once you complete implementation and create your completion report, I (Foreman) will:

1. Review your `STEP_2D_COMPLETION_REPORT.md`
2. Copy documentation to main codebase governance:
   - Update `/layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md`
   - Update `/docs/architecture/UNIT_FLAGS_GUIDE.md`
   - Update `/docs/status/LATEST_UPDATE.md`
   - Update `/docs/status/STATUS_BOARD.md`
   - Add H-016 to `/docs/status/HISTORY_INDEX.md`
3. Mark Phase 2D complete in main `task.md`

---

## Questions?

If you encounter issues or need clarification:
1. Check the implementation plan: `step_2d_applications_plan.md`
2. Reference Step 2A and 2C completion reports for patterns
3. Review `UNIT_FLAGS_GUIDE.md` for flag creation examples

**Good luck with the implementation!**

---

**Foreman Sign-Off**: Implementation plan approved and ready. Waiting for your completion report.
