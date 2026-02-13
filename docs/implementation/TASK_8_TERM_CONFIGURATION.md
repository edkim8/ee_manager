# Task #8: Term Configuration System

**Date**: 2026-02-11
**Status**: ✅ **COMPLETE**

---

## 📋 **Summary**

Implemented a comprehensive term configuration system that allows users to configure:
- **Primary lease term** (required) with optional renewal goal
- **Up to 3 alternative terms** with percentage offsets and goals
- **Early bird discount** with due date for time-sensitive offers
- **Term goals** (renewal count targets by term length)

All configuration is stored in the `renewal_worksheets` table and can be used for Mail Merger export and renewal offer customization.

---

## ✅ **Features Implemented**

### **1. Term Configuration Modal**

**UI Components:**
- Primary term section (required, defaults to 12 months)
- Three alternative term sections (optional)
  - Each has: Term length (months), Offset percentage, Renewal goal
- Early acceptance discount section
  - Dollar amount and valid-until date
- Term goals tracking
  - JSON object storing goals by term length
  - E.g., `{"12": 20, "10": 5}` means 20 renewals for 12-month, 5 for 10-month

**Design Pattern:**
- Uses SimpleModal (V2 pattern, avoiding UModal prop stripping issues)
- Form-based submission with validation
- Grid layout for alternative terms (3 columns: term, offset, goal)
- Disabled state when worksheet is finalized

### **2. Configuration Button in Detail Page**

**Location:** Configuration panel below header
**Button Features:**
- Calendar icon
- "Configure Terms" label
- Displays current primary term below button
- Shows count of configured term options
- Disabled when worksheet finalized

**Example Display:**
```
Primary Term: 12 months (3 term options configured)
```

### **3. State Management**

**New State Variables:**
```typescript
const showTermConfigModal = ref(false)
const termConfig = ref({
  primary_term: 12,
  first_term: null as number | null,
  first_term_offset: null as number | null,
  second_term: null as number | null,
  second_term_offset: null as number | null,
  third_term: null as number | null,
  third_term_offset: null as number | null,
  early_discount: null as number | null,
  early_discount_date: null as string | null,
  term_goals: {} as Record<string, number>
})
```

**Watchers:**
- Loads term configuration from worksheet on mount
- Updates local state when worksheet data changes

### **4. Database Integration**

**Table:** `renewal_worksheets`

**Fields Used:**
- `primary_term` (INTEGER) - Required, defaults to 12
- `first_term` (INTEGER, NULLABLE) - First alternative term length
- `first_term_offset` (NUMERIC, NULLABLE) - % adjustment (e.g., -2.5 for discount)
- `second_term` (INTEGER, NULLABLE) - Second alternative term length
- `second_term_offset` (NUMERIC, NULLABLE) - % adjustment
- `third_term` (INTEGER, NULLABLE) - Third alternative term length
- `third_term_offset` (NUMERIC, NULLABLE) - % adjustment
- `early_discount` (NUMERIC, NULLABLE) - Dollar amount (e.g., 100)
- `early_discount_date` (DATE, NULLABLE) - Valid until date
- `term_goals` (JSONB, NULLABLE) - Goals by term: `{"12": 20, "10": 5}`

**Save Function:**
```typescript
async function saveTermConfig() {
  if (!worksheet.value) return

  try {
    const { error } = await supabase
      .from('renewal_worksheets')
      .update({
        primary_term: termConfig.value.primary_term,
        first_term: termConfig.value.first_term,
        first_term_offset: termConfig.value.first_term_offset,
        second_term: termConfig.value.second_term,
        second_term_offset: termConfig.value.second_term_offset,
        third_term: termConfig.value.third_term,
        third_term_offset: termConfig.value.third_term_offset,
        early_discount: termConfig.value.early_discount,
        early_discount_date: termConfig.value.early_discount_date,
        term_goals: termConfig.value.term_goals,
        updated_at: new Date().toISOString()
      })
      .eq('id', worksheetId)

    if (error) throw error

    // Update local worksheet state
    // ... (sync all fields to worksheet.value)

    showTermConfigModal.value = false
    console.log('[Renewals] Term configuration saved')
  } catch (error) {
    console.error('[Renewals] Term config save error:', error)
  }
}
```

---

## 🎨 **UI/UX Details**

### **Configuration Button Display**

**States:**
- **Draft Mode:** Button enabled, clickable
- **Finalized Mode:** Button disabled (grayed out)
- **No Terms Configured:** Shows only primary term
- **Terms Configured:** Shows primary term + count of alternatives

### **Modal Layout**

**Sections (Top to Bottom):**

1. **Info Banner** (Blue)
   - Explains purpose of term configuration
   - Mentions 3 alternative terms limit

2. **Primary Lease Term** (Required)
   - Term length input (1-24 months)
   - Renewal goal input (optional)

3. **Alternative Lease Terms** (3 sections)
   - Each in gray background box
   - Label: "Alternative #1", "Alternative #2", "Alternative #3"
   - 3 inputs per alternative:
     - **Term (months):** Number input, 1-24 range
     - **Offset %:** Decimal input, can be negative (discount) or positive (premium)
     - **Goal:** Number input, disabled if term not set
   - Helper text: "Negative = discount" / "Positive = premium"

4. **Early Acceptance Discount**
   - Dollar amount input
   - Valid until date picker
   - Helper text explaining purpose

5. **Action Buttons**
   - Cancel (ghost variant)
   - Save Configuration (primary button with check icon)

### **User Workflow**

1. User opens worksheet detail page
2. Clicks "Configure Terms" button in configuration panel
3. Modal opens with current configuration (or defaults)
4. User configures:
   - Primary term (e.g., 12 months)
   - Alternative terms (e.g., 10 months at -2.5%, 14 months at +1%)
   - Goals for each term (e.g., 20 renewals for 12-month)
   - Optional early bird discount (e.g., $100 if signed before lease end - 60 days)
5. User clicks "Save Configuration"
6. Modal closes, database updated
7. Configuration button shows updated count

---

## 📊 **Example Configuration**

### **Scenario: Standard 12-Month with Flexibility**

**Primary Term:**
- 12 months
- Goal: 20 renewals

**Alternative #1:**
- 10 months (shorter commitment)
- Offset: -2.5% (discount to encourage)
- Goal: 5 renewals

**Alternative #2:**
- 14 months (longer commitment)
- Offset: +1.5% (premium for longer term)
- Goal: 8 renewals

**Alternative #3:**
- 18 months (longest commitment)
- Offset: +2.5% (higher premium)
- Goal: 2 renewals

**Early Discount:**
- $100 off
- Valid until: 60 days before lease expires

**Result:** 4 term options (1 primary + 3 alternatives) with clear pricing structure and leasing goals.

---

## 🔧 **Technical Details**

### **Files Modified**

1. **`layers/ops/pages/office/renewals/[id].vue`** (~180 lines added)

   **State Added:**
   ```typescript
   // Term configuration modal state
   const showTermConfigModal = ref(false)
   const termConfig = ref({
     primary_term: 12,
     first_term: null,
     first_term_offset: null,
     second_term: null,
     second_term_offset: null,
     third_term: null,
     third_term_offset: null,
     early_discount: null,
     early_discount_date: null,
     term_goals: {}
   })
   ```

   **Functions Added:**
   - `openTermConfigModal()` - Opens modal
   - `saveTermConfig()` - Saves configuration to database
   - `updateTermGoal(termLength, goal)` - Updates/removes goal for a term

   **Watcher Added:**
   - Loads term config from worksheet when data arrives
   - Updates `termConfig` ref with all 10 fields

   **Template Changes:**
   - Configuration button added below MTM Fee input
   - Term configuration modal added (180 lines of template code)
   - Modal uses SimpleModal component (V2 pattern)

### **Key Implementation Details**

**Term Goals Management:**
```typescript
function updateTermGoal(termLength: number, goal: number | null) {
  if (goal === null || goal === 0) {
    // Remove goal if null or 0
    delete termConfig.value.term_goals[termLength.toString()]
  } else {
    // Set goal
    termConfig.value.term_goals[termLength.toString()] = goal
  }
}
```

**Why:** Goals are stored as JSON with term length as key. We need to dynamically add/remove goals as users configure terms.

**Watch Pattern:**
```typescript
watch(worksheet, (newWorksheet) => {
  if (newWorksheet) {
    termConfig.value = {
      primary_term: newWorksheet.primary_term || 12,
      // ... load all 10 fields
      term_goals: newWorksheet.term_goals || {}
    }
  }
}, { immediate: true })
```

**Why:** Loads term settings when worksheet data arrives. The `immediate: true` ensures it runs on mount if worksheet is already loaded.

---

## ✅ **Testing Checklist**

- [x] Configuration button appears in detail page
- [x] Button shows primary term when configured
- [x] Button shows term options count when alternatives configured
- [x] Button disabled when worksheet finalized
- [x] Modal opens on button click
- [x] Primary term defaults to 12 months
- [x] Primary term goal input works
- [x] All 3 alternative term sections render
- [x] Term offset accepts negative values (discounts)
- [x] Term offset accepts positive values (premiums)
- [x] Goal inputs disabled when term not set
- [x] Goal inputs enabled when term set
- [x] Early discount inputs work correctly
- [x] Date picker works for early discount date
- [x] Save button updates database
- [x] Modal closes after save
- [x] Configuration persists across page refreshes
- [x] Configuration button updates after save
- [x] No TypeScript compilation errors
- [x] SimpleModal pattern used (no UModal)
- [x] Watcher loads data on mount

---

## 🎯 **Impact**

### **Before Task #8:**
❌ No way to configure multiple term options
❌ Fixed 12-month term assumption
❌ No early bird discount support
❌ No renewal goals tracking
❌ Mail Merger export missing term flexibility

### **After Task #8:**
✅ Primary term + 3 alternatives configurable
✅ Percentage-based pricing adjustments (discounts/premiums)
✅ Early bird discount with time limit
✅ Renewal goals by term length (JSON storage)
✅ Clear UI for bulk term configuration
✅ Configuration persists in database
✅ Ready for Mail Merger integration (future enhancement)

---

## 📊 **Code Changes Summary**

- **Files Modified**: 1
  - `layers/ops/pages/office/renewals/[id].vue` (~180 lines added)
- **New Components**: 0 (used existing SimpleModal)
- **Database Changes**: 0 (fields already existed in schema)
- **Lines Added**: ~180 lines (state, functions, watcher, modal template, button)

**Total:** 1 file modified, ~180 lines added, 0 new components, 0 migrations

---

## 🚀 **Future Enhancements**

**Potential Improvements (Not in Current Scope):**

1. **Mail Merger Integration**
   - Include all term options in Excel export
   - Add columns for each alternative term pricing
   - Include early bird discount in offer letters

2. **Term-Based Analytics**
   - Track actual vs. goal renewals by term
   - Show term preference distribution
   - Alert when goals not being met

3. **Percentage Preview**
   - Show calculated rent for each term in modal
   - Preview pricing before saving
   - Compare term options side-by-side

4. **Bulk Term Application**
   - Apply term configuration to multiple worksheets at once
   - Copy term settings from existing worksheet
   - Template system for common term structures

5. **Term-Based Filtering**
   - Filter worksheet items by accepted term length
   - Show distribution of accepted term lengths
   - Compare term acceptance rates across floor plans

---

## 📝 **User Documentation**

### **Configuring Lease Terms**

1. Open a renewal worksheet detail page
2. Locate the configuration panel below the header
3. Click "Configure Terms" button (calendar icon)
4. Set your primary lease term (e.g., 12 months)
5. Optionally add up to 3 alternative terms:
   - **Shorter terms:** Use negative offset % (e.g., -2.5% for discount)
   - **Longer terms:** Use positive offset % (e.g., +1.5% for premium)
6. Set renewal goals for each term (optional)
7. Configure early acceptance discount if desired:
   - Dollar amount (e.g., $100)
   - Valid until date (e.g., 60 days before lease expires)
8. Click "Save Configuration"

**Tip:** Use term goals to track your leasing targets. For example, if you want 80% of renewals on 12-month terms, set your goal accordingly.

### **Understanding Offset Percentages**

- **Negative offset** (e.g., -2.5%): **Discount** the rent to encourage this term
- **Positive offset** (e.g., +1.5%): **Premium** added for this term
- **Zero offset** (e.g., 0%): Same rent as primary term

**Example:**
- Primary term: 12 months at $1,000/month
- Alternative #1: 10 months at -2.5% = $975/month
- Alternative #2: 14 months at +1.5% = $1,015/month

### **Term Goals**

Set renewal count targets for each term to track leasing performance:
- **Primary term:** Target your most preferred lease length
- **Alternative terms:** Set goals for flexibility options

**Example:**
- 12 months: Goal 20 renewals (80% of total)
- 10 months: Goal 3 renewals (12%)
- 14 months: Goal 2 renewals (8%)

---

## 🎉 **Completion Status**

**Implementation Complete**: 2026-02-11
**Build Status**: ✅ No compilation errors in modified file
**Integration**: Live on renewals detail page
**Remaining Tasks**: 0 out of 11 total tasks

---

## 🏆 **All Renewals Module Tasks Complete**

1. ✅ Task #1: Fix date range timezone bug
2. ✅ Task #2: Implement Option A rent selection UI
3. ✅ Task #3: Debug and fix population logic
4. ✅ Task #4: Implement Yardi confirmation hook
5. ✅ Task #5: Build LeaseExpirationDashboard component
6. ✅ Task #6: Create enhanced worksheet summary cards
7. ✅ Task #7: Add simple comment system
8. ✅ **Task #8: Implement term configuration system** (THIS TASK)
9. ✅ Task #9: Implement Finalize workflow
10. ✅ Task #10: Build Mail Merger Excel export
11. ✅ Task #11: Configure GenericDataTable export

**Module Status:** 🎉 **100% COMPLETE** 🎉

---

**End of Implementation Document**
