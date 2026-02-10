# Move-Out Status Detection Analysis

**Date**: 2026-02-10
**Issue**: Residents in "Notice" status not transitioning to "Past" after move-out date passes
**Severity**: 🔴 **CRITICAL** - Causes data integrity issues and repeated lease history

---

## 🔍 Current System Behavior

### **How Status Transitions Currently Work**

```typescript
// useSolverEngine.ts Line 20-30
const mapTenancyStatus = (rowStatus: string | null) => {
    const s = (rowStatus || '').toLowerCase()
    if (s.includes('current')) return 'Current'
    if (s.includes('past')) return 'Past'      // ❌ Only from Yardi report
    if (s.includes('future')) return 'Future'
    if (s.includes('notice')) return 'Notice'  // ✅ Set from Notices report
    if (s.includes('eviction')) return 'Eviction'
    if (s.includes('applicant')) return 'Applicant'
    if (s.includes('denied')) return 'Denied'
    if (s.includes('cancel')) return 'Canceled'
    return 'Current' // Fallback
}
```

**Key Problem**: This function **ONLY reads status from Yardi reports**. It NEVER calculates status based on dates.

---

## 📊 Status Transition Flow (CURRENT)

### **Phase 1A: Residents Status Report**
```
Yardi Status → mapTenancyStatus() → Database
  "Current"  →    'Current'       → tenancies.status = 'Current'
  "Future"   →    'Future'        → tenancies.status = 'Future'
```

### **Phase 2D: Notices Report**
```typescript
// Lines 1190-1227: Process Notices
for (const row of noticesRows) {
    const tenancy = tenancyMap.get(unitId)

    // Auto-fix status to "Notice" if not already
    if (tenancy.status !== 'Notice') {
        finalStatus = 'Notice'
        warnings.push(`Auto-fixed: ${tenancy.status} → Notice`)
    }

    // Update tenancy
    await supabase.from('tenancies').upsert({
        id: tenancy.id,
        status: 'Notice',
        move_out_date: parseDate(row.move_out_date)  // ✅ Date is set
    })
}
```

**What Happens**: Status set to "Notice", `move_out_date` is recorded

### **Phase 2E: Expiring Leases (Renewals)**
```typescript
// Lines 743-748: When renewal detected
if (isRenewal) {
    toDeactivate.push({
        id: existingLease.id,
        is_active: false,
        lease_status: 'Past'  // ✅ LEASE archived
    })
    // ❌ But TENANCY status NOT updated!
}
```

**What Happens**: Old lease marked as "Past", but **tenancy status stays "Notice"**

---

## 🚨 THE MISSING LOGIC

### **What's NOT Happening**

There is **NO automatic transition** from "Notice" → "Past" when `move_out_date` passes!

```typescript
// ❌ THIS CODE DOES NOT EXIST ANYWHERE:
const today = new Date()
const moveOutDate = new Date(tenancy.move_out_date)

if (tenancy.status === 'Notice' && moveOutDate < today) {
    // Transition to Past
    await supabase.from('tenancies').update({
        status: 'Past'
    }).eq('id', tenancy.id)
}
```

---

## 🔄 Why Lease History Repeats 15+ Times

### **Root Cause: Duplicate Detection Failure**

The renewal detection logic checks:
```typescript
// Line 741: Check if this is a renewal
if (isRenewal(
    newLease.start_date,
    newLease.end_date,
    existingLease.start_date,
    existingLease.end_date
)) {
    // Mark old lease as Past
    // Create new lease
}
```

**Problem**: If a tenancy is stuck in "Notice" status indefinitely:
1. Expiring Leases report keeps showing the same lease
2. Every day, Solver processes the same lease again
3. Renewal detection fails because dates haven't changed
4. New lease record gets created (or updated) repeatedly
5. Old lease gets marked as "Past" repeatedly

**Result**: Same lease shows up 15+ times in lease history

---

## 🎯 Expected Behavior vs Actual Behavior

### **Scenario: Resident Gives Notice**

**Timeline**:
- **Day 1 (2026-01-15)**: Resident gives 30-day notice
  - Move-out date: 2026-02-15
  - Status should be: **Notice**

- **Day 30 (2026-02-15)**: Move-out date arrives
  - Resident moves out
  - Status should transition: **Notice → Past**

- **Day 31+ (2026-02-16+)**: After move-out
  - Status should be: **Past**
  - Unit should be Available

### **What Actually Happens**:

| Day | Yardi Status | DB Status | Issue |
|-----|--------------|-----------|-------|
| 1 | "Notice" | Notice ✅ | Correct |
| 30 | "Notice" | Notice ❌ | Should be Past |
| 31 | "Notice" | Notice ❌ | Should be Past |
| 60 | "Notice" | Notice ❌ | Should be Past |
| 90 | "Notice" | Notice ❌ | **STILL Notice!** |

**Why**: Yardi keeps sending "Notice" status because the tenancy record still exists in their system. We need to **calculate** the transition, not wait for Yardi to tell us.

---

## 📋 Data Integrity Impact

### **1. Incorrect Status Display**

**Residents Page**:
```
Unit 2008 - Status: Notice (Move-out: 2026-01-15)
  ↑ This resident moved out 26 days ago!
```

### **2. Repeated Lease History**

**Lease History Table**:
```
ID    | Tenancy    | Start      | End        | Status  | is_active
------|------------|------------|------------|---------|----------
abc123| t3380367   | 2025-02-21 | 2026-02-20 | Past    | false
def456| t3380367   | 2025-02-21 | 2026-02-20 | Past    | false
ghi789| t3380367   | 2025-02-21 | 2026-02-20 | Past    | false
... (15 more duplicate rows)
```

### **3. Availability Confusion**

**Availabilities Page**:
```
Unit 2008
  Status: Notice (but resident already moved out)
  Future Tenancy: Linked to moved-out resident
  ↑ Should show "Available" or linked to new tenant
```

---

## 🛠️ Proposed Solution Options

### **Option 1: Date-Based Status Transition (Recommended)**

Add automatic status calculation during Solver processing:

```typescript
// After processing Notices report (Phase 2D)
// Add new Phase 2D.5: Transition Expired Notices

const today = new Date().toISOString().split('T')[0]

const { data: expiredNotices } = await supabase
  .from('tenancies')
  .select('id, move_out_date, status')
  .eq('status', 'Notice')
  .lt('move_out_date', today)  // move_out_date < today

if (expiredNotices && expiredNotices.length > 0) {
  await supabase
    .from('tenancies')
    .update({ status: 'Past' })
    .in('id', expiredNotices.map(t => t.id))

  console.log(`[Solver] Transitioned ${expiredNotices.length} notices to Past`)
}
```

**Pros**:
- ✅ Automatic, runs daily
- ✅ No Yardi changes needed
- ✅ Prevents status getting stuck

**Cons**:
- ⚠️ Adds one extra query per Solver run

---

### **Option 2: Transition During Renewal Detection**

When a lease is marked as "Past", also update the tenancy:

```typescript
// Line 743: When renewal detected
if (isRenewal) {
    toDeactivate.push({
        id: existingLease.id,
        is_active: false,
        lease_status: 'Past'
    })

    // NEW: Also update tenancy status
    await supabase
        .from('tenancies')
        .update({ status: 'Past' })
        .eq('id', existingLease.tenancy_id)
}
```

**Pros**:
- ✅ Fixes status when renewal happens
- ✅ Minimal code change

**Cons**:
- ❌ Only works for renewals
- ❌ Doesn't handle residents who move out without renewing

---

### **Option 3: Yardi Report Change (Not Recommended)**

Wait for Yardi to send "Past" status in Residents Status report.

**Pros**:
- ✅ No code changes

**Cons**:
- ❌ Depends on Yardi's reporting logic
- ❌ Delays can be weeks or months
- ❌ No control over when it happens

---

## 🔧 Recommended Implementation

### **Phase 2D.5: Expired Notice Transition**

**Location**: `useSolverEngine.ts` after line 1308 (after Notices processing)

**Code**:
```typescript
// Phase 2D.5: Transition Expired Notices to Past
console.log('[Solver] Phase 2D.5: Checking for expired notices...')

const today = new Date().toISOString().split('T')[0]

// Find all Notice tenancies where move_out_date has passed
const { data: expiredNotices, error: expiredError } = await supabase
    .from('tenancies')
    .select('id, property_code, move_out_date')
    .eq('status', 'Notice')
    .not('move_out_date', 'is', null)
    .lt('move_out_date', today)

if (expiredError) {
    console.error('[Solver] Expired Notice Query Error:', expiredError)
} else if (expiredNotices && expiredNotices.length > 0) {
    console.log(`[Solver] Found ${expiredNotices.length} expired notices to transition`)

    // Update to Past status
    const { error: updateError } = await supabase
        .from('tenancies')
        .update({ status: 'Past' })
        .in('id', expiredNotices.map(t => t.id))

    if (updateError) {
        console.error('[Solver] Expired Notice Update Error:', updateError)
    } else {
        console.log(`[Solver] ✓ Transitioned ${expiredNotices.length} notices to Past`)

        // Track in solver summary
        expiredNotices.forEach(notice => {
            tracker.trackStatusAutoFix(
                notice.property_code,
                `Tenancy ${notice.id}`,
                'Notice → Past (Move-out date passed)'
            )
        })
    }
}

console.log('[Solver] Phase 2D.5 Complete: Expired notices processed')
```

---

## 📊 Testing Plan

### **Test Case 1: Expired Notice**

**Setup**:
1. Create tenancy with status "Notice"
2. Set `move_out_date` to yesterday (2026-02-09)

**Expected Result**:
- After Solver run, status should be "Past"

### **Test Case 2: Future Notice**

**Setup**:
1. Create tenancy with status "Notice"
2. Set `move_out_date` to tomorrow (2026-02-11)

**Expected Result**:
- After Solver run, status should REMAIN "Notice"

### **Test Case 3: No Move-Out Date**

**Setup**:
1. Create tenancy with status "Notice"
2. `move_out_date` is NULL

**Expected Result**:
- After Solver run, status should REMAIN "Notice"
- Should NOT error

---

## 🎯 Success Criteria

✅ **Status Transition**: Notice → Past happens automatically when move_out_date passes
✅ **No Duplicates**: Lease history shows only unique lease records
✅ **Accurate Counts**: Resident counts reflect actual current residents
✅ **Availability Accuracy**: Units show as Available after residents move out

---

## 📌 Related Issues

1. **Repeated Lease History**: Fixed by preventing duplicate lease creation once tenancy is "Past"
2. **Stale Availabilities**: Will auto-update when tenancy transitions to Past
3. **Incorrect Resident Counts**: Will reflect actual current residents

---

## ✅ IMPLEMENTED SOLUTION

**Date**: 2026-02-10
**Status**: ✅ **COMPLETE**

### **Implementation Details**

#### **Phase 2D.5: Move Out Overdue Check**

**Location**: `useSolverEngine.ts` lines 1313-1483 (after Notices processing)

**What It Does**:
1. Queries all tenancies with status = 'Notice' and non-null move_out_date
2. Filters for those where move_out_date < today
3. Calculates days overdue
4. Creates or updates "Move Out Overdue" flags with appropriate severity:
   - **1-3 days overdue**: severity = `warning`
   - **4+ days overdue**: severity = `error`

**Code**:
```typescript
// Check all Notice tenancies where move_out_date has passed
const { data: noticeWithDates } = await supabase
    .from('tenancies')
    .select('id, unit_id, property_code, move_out_date, units(unit_name)')
    .eq('status', 'Notice')
    .not('move_out_date', 'is', null)

const overdueTenancies = noticeWithDates.filter(t => {
    const moveOutDate = new Date(t.move_out_date)
    return moveOutDate < today
})

// Create/update flags with severity based on days overdue
```

---

#### **Past Status Transition Handler**

**Location**: `useSolverEngine.ts` lines 405-453 (during Residents Status processing)

**What It Does**:
1. Detects when tenancy status changes to 'Past'
2. Removes any "Move Out Overdue" flags for that unit
3. Logs early move-out if actual move-out < planned move_out_date
4. Tracks status transition for reporting

**Code**:
```typescript
// Detect transition to 'Past' status
if (oldTenancy && newTenancy.status === 'Past' && oldTenancy.status !== 'Past') {
    console.log(`Status Change: ${oldTenancy.status} → Past`)

    // Remove overdue flag
    unitsToRemoveOverdueFlag.push(newTenancy.unit_id)

    // Check for early move-out (log only)
    if (newTenancy.move_out_date && newTenancy.move_out_date > today) {
        console.log(`Early Move Out: Planned ${plannedDate}, Actual ${today}`)
    }
}
```

---

### **User-Specified Parameters (Confirmed)**

✅ **Overdue Flag Timing**: Immediately the next day after move_out_date (no grace period)
✅ **Early Move Out**: Log only (no flag creation)
✅ **Severity Levels**:
  - 1-3 days overdue: `warning`
  - 4+ days overdue: `error`

---

### **Expected Behavior After Implementation**

#### **Scenario 1: On-Time Move Out** ✅
```
Day 1: Notice given (move_out_date: 2026-02-15)
  → Status: Notice
  → No flags

Day 30 (2026-02-15): Resident moves out
  → Yardi sends status = 'Past'
  → Status: Past
  → No flags created

Day 31+: Unit available for new tenant
```

#### **Scenario 2: Late Move Out** ⏰
```
Day 1: Notice given (move_out_date: 2026-02-15)
  → Status: Notice
  → No flags

Day 31 (2026-02-16): Move-out date passed, still Notice
  → Solver creates "Move Out Overdue" flag (severity: warning, 1 day overdue)

Day 34 (2026-02-19): Still Notice
  → Solver updates flag (severity: error, 4 days overdue)

Day 45 (2026-03-01): Resident finally moves out
  → Yardi sends status = 'Past'
  → Status: Past
  → "Move Out Overdue" flag removed

Day 46+: Unit available
```

#### **Scenario 3: Early Move Out** 🏃
```
Day 1: Notice given (move_out_date: 2026-02-15)
  → Status: Notice
  → No flags

Day 20 (2026-02-05): Resident moves out early
  → Yardi sends status = 'Past'
  → Status: Past
  → Console log: "Early Move Out: Planned 2026-02-15, Actual 2026-02-05"
  → No flag created (per user spec)

Day 21+: Unit available
```

---

### **Files Modified**

1. **`layers/admin/composables/useSolverEngine.ts`**
   - Lines 405-453: Past status transition handler
   - Lines 1313-1483: Move out overdue check (Phase 2D.5)

---

### **Testing Checklist**

- [ ] Test on-time move-out (no flags created)
- [ ] Test 1-day overdue (warning flag created)
- [ ] Test 4-day overdue (error flag created)
- [ ] Test flag removal when status changes to Past
- [ ] Test early move-out logging
- [ ] Verify repeated lease history issue is resolved
- [ ] Check resident counts are accurate after Past transition

---

**Implementation Complete**: Ready for testing! 🚀
