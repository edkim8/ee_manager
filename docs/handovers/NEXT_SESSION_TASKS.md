# Next Session Tasks - Solver Refinements

**Date Created:** 2026-02-06
**Priority:** Medium
**Estimated Time:** 1-2 hours

---

## 🎯 **Outstanding Issues**

### **Issue 1: Unit Flags - 409 Conflict (Duplicate Creation)**

**Error:**
```
POST .../unit_flags 409 (Conflict)
```

**Location:** `layers/admin/composables/useSolverEngine.ts` - MakeReady phase (around line 1289)

**Problem:**
- Solver is trying to INSERT unit flags for overdue units
- Flags already exist from previous run
- Unique constraint violation on `(unit_id, flag_type)` where active = true

**Solution Approach:**
1. **Option A (Recommended):** Use UPSERT instead of INSERT
   ```typescript
   .upsert(flagData, {
       onConflict: 'unit_id,flag_type',
       ignoreDuplicates: false // Update existing
   })
   ```

2. **Option B:** Check for existing flags before insert
   ```typescript
   const { data: existing } = await supabase
       .from('unit_flags')
       .select('id')
       .eq('unit_id', unitId)
       .eq('flag_type', 'makeready_overdue')
       .eq('active', true)
       .single()

   if (!existing) {
       // Insert new flag
   }
   ```

**Files to Review:**
- `layers/admin/composables/useSolverEngine.ts` (MakeReady phase)
- `supabase/migrations/*unit_flags*.sql` (check unique constraints)

---

### **Issue 2: Availabilities Status Query - 406 Not Acceptable**

**Error:**
```
GET .../availabilities?select=id&unit_id=eq.<uuid>&status=in.(Applied,Leased) 406 (Not Acceptable)
```

**Location:** `layers/admin/composables/useSolverEngine.ts` - Applications phase (around line 1381)

**Problem:**
- Query is filtering on `status` column
- 406 error suggests column doesn't exist or wrong name
- Likely should be `operational_status` instead of `status`

**Investigation Steps:**
1. Check availabilities table schema:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'availabilities'
   AND column_name LIKE '%status%';
   ```

2. Check if it's a view issue:
   ```sql
   -- Availabilities might be a view
   SELECT * FROM view_table_availabilities LIMIT 1;
   ```

**Solution:**
Update the query to use correct column name (likely `operational_status`):
```typescript
.eq('operational_status', 'Applied') // or
.in('operational_status', ['Applied', 'Leased'])
```

**Files to Review:**
- `layers/admin/composables/useSolverEngine.ts` (Applications phase)
- `supabase/migrations/20260128000000_solver_schema.sql` (availabilities table def)
- `types/supabase.ts` (check availabilities columns)

---

### **Issue 3: Email Output Content Improvements**

**Current State:**
- Report generation works (`useSolverReportGenerator.ts`)
- Markdown format is functional
- Output in logs shows basic summary

**Requested Improvements:**
1. **Enhance email content formatting**
   - Better visual hierarchy
   - Add property-level summaries
   - Include key metrics dashboard
   - Add actionable items section

2. **Add missing details**
   - Total revenue impact
   - Vacancy rates
   - Leasing velocity
   - Critical flags summary

3. **Improve readability**
   - Use tables for key metrics
   - Add color coding (if HTML email)
   - Section dividers
   - Executive summary at top

**Files to Review:**
- `layers/admin/composables/useSolverReportGenerator.ts`
- `layers/admin/pages/admin/notifications.vue` (email sending UI)
- `/api/admin/notifications/send-summary` (email API)

---

## 📋 **Context from Previous Session**

### **Completed Work:**
1. ✅ **Fixed Property Scoping Bug** - Alerts, Work Orders, Delinquencies now property-scoped
2. ✅ **Fixed Amenities System** - Case-insensitive types, query syntax corrected
3. ✅ **Added Missing Enum Values** - 'alerts', 'work_orders', 'delinquencies' to `import_report_type`
4. ✅ **Updated Pricing Views** - Separated Premium/Discount amenities

### **Key Learnings:**
- Property-scoped syncs must filter database queries to specific properties
- Supabase client is sensitive to query formatting (no spaces in relationship syntax)
- Always use case-insensitive comparisons for enum-like text fields
- Verify foreign key relationships for PostgREST joins to work

---

## 🔧 **Recommended Approach**

### **Session Structure:**
1. **Quick Wins (30 min):**
   - Fix unit_flags upsert
   - Fix availabilities status column name

2. **Email Improvements (45 min):**
   - Enhance report generator output
   - Add metrics dashboard
   - Test email formatting

3. **Testing (15 min):**
   - Run full Solver with all 11 files
   - Verify no 409/406 errors
   - Check email output quality

---

## 📊 **Success Criteria**

- [ ] No 409 Conflict errors on unit_flags
- [ ] No 406 Not Acceptable errors on availabilities
- [ ] Email report includes enhanced metrics
- [ ] All properties process without errors
- [ ] Report is readable and actionable

---

## 🔍 **Debugging Tips**

### **For 409 Errors:**
```sql
-- Check unique constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'unit_flags'::regclass;
```

### **For 406 Errors:**
```sql
-- Check column names
\d availabilities
-- or
SELECT column_name FROM information_schema.columns
WHERE table_name = 'availabilities';
```

### **For Email Testing:**
- Use MailerSend sandbox mode
- Test with single property first
- Check markdown rendering in email client

---

**Files Modified in Previous Session:**
- `layers/admin/composables/useSolverEngine.ts`
- `layers/parsing/composables/useAlertsSync.ts`
- `layers/parsing/composables/useWorkOrdersSync.ts`
- `layers/parsing/composables/useDelinquenciesSync.ts`
- `layers/parsing/composables/useAmenitiesSync.ts`
- `layers/ops/utils/pricing-engine.ts`
- `supabase/migrations/20260206000003_add_ops_report_types.sql`
- `supabase/migrations/20260206000004_fix_amenities_pricing_case_insensitive.sql`
- `types/supabase.ts`

---

**Agent Handoff Notes:**
- User prefers fixing issues incrementally with verification at each step
- Database queries should be tested in SQL editor first before code changes
- Always provide before/after comparisons for code changes
- Document all fixes in status files
