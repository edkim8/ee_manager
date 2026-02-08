# Handoff: Daily Upload Testing & Verification

**Date Created:** 2026-02-06
**Status:** 🔴 PENDING TESTING - Ready for tomorrow's upload
**Assigned To:** Next Claude Agent
**Priority:** HIGH - First real-world test of price change tracking

---

## 🎯 Your Mission

Test the newly implemented **Price Change Tracking** feature with tomorrow's daily Yardi reports upload and verify all tracking code works correctly.

### Success Criteria:
- ✅ Solver runs without errors
- ✅ Price changes are detected (if any rent changes exist)
- ✅ Executive Summary appears in report
- ✅ Markdown tables render correctly
- ✅ No regression in existing functionality

---

## 📦 What Was Implemented (Session 2026-02-06)

### Feature: Availability Price Change Tracking

**Files Modified:**
1. `layers/admin/composables/useSolverTracking.ts` (4 sections)
2. `layers/admin/composables/useSolverEngine.ts` (2 sections)
3. `layers/admin/composables/useSolverReportGenerator.ts` (4 sections)

**What It Does:**
- Detects when `rent_offered` changes during Availabilities phase
- Tracks old rent → new rent with change amount and percentage
- Displays in Executive Summary with markdown tables
- Shows visual indicators (🟢 increases, 🔴 decreases)

**Threshold:** Only tracks changes ≥ $1 (prevents rounding noise)

---

## 📋 Step-by-Step Testing Protocol

### Pre-Upload Checklist

1. **Verify Current Branch**
   ```bash
   git status
   # Should show: feat/add-constants-modal or main (after merge)
   ```

2. **Check Server is Running**
   ```bash
   npm run dev
   # Should be accessible at http://localhost:3000
   ```

3. **Open Key Pages**
   - Admin Solver: `http://localhost:3000/admin/solver`
   - Browser Console: F12 → Console tab (watch for errors)

---

### Upload Testing (Tomorrow Morning)

#### Phase 1: Upload Daily Reports

1. **Navigate to Solver Page**
   - Go to `/admin/solver`
   - Click "Upload Reports" or equivalent

2. **Upload All 11 Daily Reports**
   Required reports:
   - ✅ Residents Status
   - ✅ Availabilities (CRITICAL - contains rent data)
   - ✅ MakeReady
   - ✅ Applications
   - ✅ Transfers
   - ✅ Leases
   - ✅ Notices
   - ✅ Alerts
   - ✅ Work Orders
   - ✅ Delinquencies
   - ✅ Amenities (Audit or List)

3. **Monitor Console During Upload**
   Watch for:
   - ❌ **ERRORS** - Any 409, 406, 400, or 500 errors → STOP, report issue
   - ✅ **SUCCESS** - `[Solver] Processing Availabilities...` logs
   - 🔍 **TRACKING** - Look for any tracking-related logs

---

#### Phase 2: Verify Price Change Detection

**After Availabilities Phase Completes:**

1. **Check Console Logs**
   ```
   Expected logs:
   [Solver] Processing Availabilities SB (X rows)
   [Solver] Availabilities Synced: X records

   If price changes exist:
   (No specific log currently - tracking is silent)
   ```

2. **Review Generated Report**
   - Report should be displayed in UI or console
   - Look for new sections (see below)

---

#### Phase 3: Report Verification

**Check for New Executive Summary Section:**

```markdown
## 📊 Executive Summary - Daily Changes

### ✅ New Tenancies
| Resident | Unit | Property | Status | Move-In | Source |
|----------|------|----------|--------|---------|--------|
...

### 🔄 Lease Renewals
| Resident | Unit | Property | Old Rent | New Rent | Change |
|----------|------|----------|----------|----------|--------|
...

### 📋 Notices Given
| Resident | Unit | Property | Move-Out Date | Status |
|----------|------|----------|---------------|--------|
...

### 📝 New Applications
| Applicant | Unit | Property | Application Date | Screening |
|-----------|------|----------|------------------|-----------|
...

### 💰 Availability Price Changes  ← NEW SECTION
| Unit | Property | Old Rent | New Rent | Change | % Change |
|------|----------|----------|----------|--------|----------|
| **101** | SB | $1,200 | $1,250 | 🟢 ↑ $50 | 4.2% |
...
```

**What to Verify:**

1. **Overview Section**
   - Should include: `- **Price Changes:** X`
   - X = number of units with rent changes
   - If 0, that's OK (no changes today)

2. **Executive Summary Tables**
   - ✅ All existing tables still appear (tenancies, renewals, notices, applications)
   - ✅ NEW: Price Changes table (only if changes exist)
   - ✅ Markdown table formatting is correct
   - ✅ Visual indicators display (🟢 🔴 ↑ ↓)

3. **Per-Property Sections**
   - Check each property (SB, OB, RS, etc.)
   - Look for new "💰 Price Changes" section
   - Format: `- **Unit 101** - $1,200 → $1,250 (↑ $50 / 4.2%)`

---

#### Phase 4: Data Validation

**Verify Accuracy of Price Changes:**

1. **Cross-Check Against Yardi Report**
   - Open the Availabilities CSV/Excel file
   - Find units listed in price changes
   - Compare old rent (from yesterday's database) vs new rent (today's file)
   - **Expected:** Changes should be accurate

2. **Check Database Records**
   ```sql
   -- Check solver_events table
   SELECT
       property_code,
       event_type,
       details->>'unit_name' as unit,
       details->>'old_rent' as old_rent,
       details->>'new_rent' as new_rent,
       details->>'change_amount' as change_amount
   FROM solver_events
   WHERE event_type = 'price_change'
       AND created_at >= CURRENT_DATE
   ORDER BY property_code, (details->>'unit_name');
   ```

3. **Verify Threshold**
   - Changes < $1 should NOT appear in report
   - Changes ≥ $1 should appear

---

## 🚨 Troubleshooting Guide

### Issue: No Price Changes Detected (but rents DID change)

**Diagnosis Steps:**
1. Check if Availabilities report was uploaded
2. Verify units exist in database from yesterday
3. Check console for errors during Availabilities phase

**Possible Causes:**
- First-time upload (no previous rent to compare)
- All changes were < $1 threshold
- Tracking code not executing

**Debug:**
```javascript
// Add temporary console.log in useSolverEngine.ts line ~960
console.log('[DEBUG] Old rent:', oldRent, 'New rent:', newRent, 'Diff:', Math.abs(newRent - oldRent))
```

---

### Issue: Price Changes Detected (but shouldn't be)

**Diagnosis:**
1. Verify the old rent in database matches expectations
2. Check for data quality issues in Yardi report
3. Review threshold logic

**Fix:**
- Adjust threshold if needed (currently $1)
- Check for currency formatting issues

---

### Issue: Report Missing Executive Summary

**Diagnosis:**
1. Check if `useSolverReportGenerator.ts` changes are deployed
2. Verify no syntax errors in report generator

**Quick Check:**
```bash
# Search for Executive Summary code
grep -n "Executive Summary" layers/admin/composables/useSolverReportGenerator.ts
# Should show line ~77
```

---

### Issue: Console Errors During Upload

**Common Errors:**

**409 Conflict (Unit Flags)**
- **Status:** Should be FIXED (2026-02-06 session)
- **If occurs:** Check `useSolverEngine.ts` flag creation logic
- **Rollback:** Previous commit has error suppression

**406 Not Acceptable (Availabilities)**
- **Status:** Should be FIXED (2026-02-06 session)
- **If occurs:** Check Applications phase availability query
- **Rollback:** Revert to client-side filtering pattern

**400 Bad Request (New)**
- **Likely cause:** Tracking code syntax error
- **Action:** Check browser console for full error
- **Rollback:** Remove tracking code (search for markers)

---

### Issue: Markdown Tables Not Rendering

**Browser Rendering:**
- Markdown in browser console is raw text (normal)
- Copy to markdown viewer to see tables

**Email Rendering:**
- Test in actual email client
- Some clients may not support markdown tables
- Consider HTML email (future enhancement)

---

## 📊 Expected Results

### Scenario 1: Price Changes Exist

**Overview:**
```
- **Price Changes:** 3
```

**Executive Summary:**
```markdown
### 💰 Availability Price Changes
| Unit | Property | Old Rent | New Rent | Change | % Change |
|------|----------|----------|----------|--------|----------|
| **101** | SB | $1,200 | $1,250 | 🟢 ↑ $50 | 4.2% |
| **205** | OB | $1,800 | $1,750 | 🔴 ↓ $50 | -2.8% |
| **302** | RS | $1,500 | $1,550 | 🟢 ↑ $50 | 3.3% |
```

**Per-Property:**
```markdown
## Property: SB

### 💰 Price Changes
- **101** - $1,200 → $1,250 (↑ $50 / 4.2%)
```

---

### Scenario 2: No Price Changes

**Overview:**
```
- **Price Changes:** 0
```

**Executive Summary:**
- Price Changes section may not appear (empty)
- OR shows "No price changes detected"

**Per-Property:**
- No "💰 Price Changes" section

**This is NORMAL if:**
- First upload (no baseline)
- Rents are stable
- Changes < $1 threshold

---

## 🔍 Code Isolation Markers

**If you need to disable tracking temporarily:**

```bash
# Find all tracking code
grep -n "TRACKING CODE\|TRACKING ENHANCEMENTS" layers/admin/composables/*.ts
```

**Output shows:**
- `useSolverTracking.ts`: Lines with interface and method additions
- `useSolverEngine.ts`: Lines 928-945 (fetch) and 950-975 (detection)
- `useSolverReportGenerator.ts`: Lines with report sections

**To disable:**
- Comment out sections between markers
- Or revert to previous commit

---

## 📚 Reference Documentation

**Read These First:**
1. `docs/status/LATEST_UPDATE.md` - Complete implementation details
2. `docs/handovers/HANDOFF_2026_02_06_PRICE_TRACKING.md` - Feature guide

**Architecture:**
3. `docs/architecture/SOLVER_TRACKING_ARCHITECTURE.md` - Event types

**Patterns:**
4. `~/.claude/memory/MEMORY.md` - Tracking Code Isolation Pattern

**Previous Sessions:**
5. `docs/handovers/FOREMAN_BRIEFING_2026_02_06.md` - Session context
6. `docs/handovers/SESSION_2026_02_06_SOLVER_FINAL_POLISH.md` - Bug fixes

---

## ✅ Testing Checklist

Use this checklist during testing:

### Pre-Upload
- [ ] Git status checked - on correct branch
- [ ] Server running on localhost:3000
- [ ] Browser console open and monitoring
- [ ] /admin/solver page loaded

### During Upload
- [ ] All 11 reports uploaded successfully
- [ ] No 409 Conflict errors (unit flags)
- [ ] No 406 Not Acceptable errors (availabilities)
- [ ] No 400/500 errors (new tracking code)
- [ ] Solver completes without crashes

### Report Verification
- [ ] Overview shows Price Changes count
- [ ] Executive Summary section appears
- [ ] All existing tables still present (tenancies, renewals, etc.)
- [ ] Price Changes table formatted correctly (if changes exist)
- [ ] Visual indicators display (🟢 🔴 ↑ ↓)
- [ ] Per-property sections include price changes
- [ ] Markdown syntax is valid

### Data Validation
- [ ] Price changes match Yardi report data
- [ ] Old rents match previous database values
- [ ] Change calculations are accurate
- [ ] Threshold working (no changes < $1)
- [ ] solver_events table has price_change records

### Regression Testing
- [ ] Existing reports still work
- [ ] No data corruption in other tables
- [ ] Previous solver runs still viewable
- [ ] All other tracking events still recorded

---

## 🎯 What to Report Back

### If Successful ✅

**Create a brief report:**

```markdown
# Testing Report - Price Change Tracking

**Date:** [YYYY-MM-DD]
**Status:** ✅ SUCCESS

## Results:
- Solver ran successfully
- Price changes detected: X units
- Report formatted correctly
- No errors encountered

## Sample Output:
[Paste Executive Summary section]

## Next Steps:
- Feature is production-ready
- Proceed with Soft Delete tracking (if approved)
```

---

### If Issues Found ❌

**Create a detailed bug report:**

```markdown
# Testing Report - Price Change Tracking

**Date:** [YYYY-MM-DD]
**Status:** ❌ ISSUES FOUND

## Issue Summary:
[Brief description]

## Steps to Reproduce:
1. [Step 1]
2. [Step 2]

## Expected Behavior:
[What should happen]

## Actual Behavior:
[What actually happened]

## Console Errors:
[Copy full error messages]

## Screenshots:
[If applicable]

## Attempted Fixes:
[What you tried]

## Recommendation:
[Rollback / Fix / Further investigation needed]
```

---

## 🚀 Next Steps (After Successful Test)

### Immediate:
1. **Document results** - Create testing report
2. **Commit message** - Update LATEST_UPDATE.md with test results
3. **User notification** - Inform user of test outcome

### If Successful - Next Features to Implement:

**High Priority (Easiest Wins):**

1. **Soft Delete Tracking**
   - Track when availabilities deactivated (unit leased)
   - Track when alerts/work orders deactivated
   - Similar pattern to price changes
   - Estimated: 1-2 hours

2. **Property Activity Scoring**
   - Calculate: 🔥 High / 📊 Medium / 📉 Low
   - Based on total event count
   - Add to property summary table
   - Estimated: 1 hour

**Medium Priority:**

3. **Update Details Tracking**
   - Field-by-field change tracking
   - More complex - requires comparison logic
   - Estimated: 3-4 hours

4. **Vacancy Metrics**
   - Query unit counts per property
   - Calculate occupancy percentage
   - Estimated: 2-3 hours

---

## 🔗 Quick Links

**Code Files:**
- [useSolverTracking.ts](../../layers/admin/composables/useSolverTracking.ts)
- [useSolverEngine.ts](../../layers/admin/composables/useSolverEngine.ts)
- [useSolverReportGenerator.ts](../../layers/admin/composables/useSolverReportGenerator.ts)

**Documentation:**
- [LATEST_UPDATE.md](../status/LATEST_UPDATE.md)
- [HANDOFF_2026_02_06_PRICE_TRACKING.md](HANDOFF_2026_02_06_PRICE_TRACKING.md)
- [MEMORY.md](~/.claude/memory/MEMORY.md)

**Database:**
- Table: `solver_events` (event_type = 'price_change')
- Table: `solver_runs` (summary JSONB includes priceChanges)

---

## 💬 Support

**If you get stuck:**

1. **Search documentation:**
   ```bash
   grep -r "price change\|priceChange" docs/
   ```

2. **Check code comments:**
   ```bash
   grep -n "TRACKING CODE" layers/admin/composables/*.ts
   ```

3. **Review previous sessions:**
   - Read LATEST_UPDATE.md for context
   - Check HANDOFF_2026_02_06_PRICE_TRACKING.md for patterns

4. **Debugging tips:**
   - Add console.log to tracking code
   - Check Network tab for API errors
   - Verify database records directly

---

## ⚠️ Critical Reminders

1. **DO NOT** modify core business logic - only tracking code
2. **DO** use the established marker pattern for any new code
3. **DO** test thoroughly before marking as complete
4. **DO** document any changes or findings
5. **DO NOT** push to production without successful test

---

**Status:** Ready for tomorrow's testing
**Last Updated:** 2026-02-06
**Next Agent:** Please update this document with test results

---

**Good luck! You've got comprehensive documentation and clear success criteria. 🚀**
