# Renewals Worksheet Detail Page - Complete Specification

**Date:** 2026-02-12
**Status:** 🔴 CRITICAL ISSUE - Infinite Loop in Composable
**For:** Next agent - complete rewrite needed

---

## 🚨 Current Critical Issue

**Problem:** "Maximum recursive updates exceeded" infinite loop on page load.

**Root Cause:** Watching and modifying the same reactive ref (`items`) creates circular dependency, regardless of watch options (`deep`, `immediate`, shallow, etc.).

**Multiple Failed Attempts:**
1. ❌ Single watcher with both items + config (infinite loop)
2. ❌ Split into two watchers (config + items shallow watch) (infinite loop)
3. ❌ Added guards/flags (`isProcessing`, `lastProcessedValues`) (infinite loop)
4. ❌ Disabled auto-save watcher in page (infinite loop)
5. ❌ Expose `initialize()` method, page watches items (STILL infinite loop)

**Current State:** Page cannot load. Continuous infinite loop preventing any functionality.

---

## 📋 Complete Requirements

### **Business Context**
Interactive worksheet for managing lease renewals with configurable rent calculation models.

### **Core Functionality**

#### **1. Configuration Values (Live in Memory)**
These values are stored in the database but live in component memory during editing:
- **LTL %** (Lease-to-Lease): What % of gap between current and market rent to close (e.g., 25%)
- **Max Increase %**: Cap on rent increases (e.g., 5%)
- **MTM Fee**: Month-to-month premium fee (e.g., $300)

**Save Behavior:**
- ✅ Config saved to DB when user clicks "Save Worksheet" button
- ❌ NO auto-save watchers on config changes
- ✅ Config loaded from DB once on initial page load
- ✅ Changes live in memory until user saves

#### **2. Worksheet Items (Renewal Opportunities)**
Each item represents a lease expiring soon and needing a renewal offer:
- `id` - Item ID
- `worksheet_id` - Parent worksheet
- `unit_id` - Unit reference
- `current_rent` - Current lease rent
- `market_rent` - Current market rate
- `final_rent` - Calculated offered rent
- `rent_offer_source` - Which calculation method ('ltl_percent', 'max_percent', 'manual')
- `custom_rent` - If manual, the custom increase amount (DELTA, not final rent)
- `comment` - User comment
- `approved` - Approval checkbox
- `renewal_type` - 'standard' or 'mtm'
- `status` - Current status ('pending', 'offered', 'manually_accepted', etc.)

#### **3. Display Columns (Always Calculated)**
These columns are ALWAYS shown, regardless of which rent option is selected:

**LTL % Column:**
- Formula: `current_rent + ((market_rent - current_rent) * (ltl_percent / 100))`
- UNCAPPED - Shows raw calculation without max limit
- Example: Current $1000, Market $1200, LTL 25% → Shows $1050

**Max % Column:**
- Formula: `current_rent * (1 + max_rent_increase_percent / 100)`
- Shows maximum allowed rent
- Example: Current $1000, Max 5% → Shows $1050

**LTL Gap:**
- Formula: `market_rent - current_rent`
- Shows gap to market

#### **4. Rent Selection Options**
User clicks one of these options for each renewal:

**Option 1: LTL %**
- Uses LTL calculation, CAPPED by Max %
- Formula: `final_rent = min(ltl_rent, max_rent)`
- Green border when selected

**Option 2: Max %**
- Uses Max % calculation
- Formula: `final_rent = current_rent * (1 + max_rent_increase_percent / 100)`
- Green border when selected

**Option 3: Manual**
- User enters custom increase amount (DELTA, not final rent)
- Formula: `final_rent = current_rent + custom_rent`
- `custom_rent` is the INCREASE amount, not the final rent value
- Example: Current $1000, user enters $75 → Final rent $1075
- Green border when selected

**Final Rent:**
- NO decimals - all rents are integers
- Always check if `final_rent >= max_rent` (show warning regardless of option selected)

#### **5. Reactivity Requirements** ⚠️ CRITICAL

**Must Update Immediately (No Refresh Required):**
1. ✅ Config changes (LTL%, Max%) → LTL% and Max% columns recalculate
2. ✅ Clicking rent option → Green border appears immediately
3. ✅ Adding/saving comment → Icon turns green immediately
4. ✅ Max cap warning → Shows whenever `final_rent >= max_rent` (any option)
5. ✅ Approval checkbox → Updates immediately
6. ✅ Changing custom rent → Final rent recalculates immediately

**Vue 3 Reactivity Rule:**
- ✅ **MUST create NEW arrays/objects** for Vue to detect changes
- ❌ **NEVER modify in place** (Vue doesn't detect reliably)

```typescript
// ✅ CORRECT - Vue detects change
items.value = items.value.map(item => {
  if (item.id !== targetId) return item
  return { ...item, someField: newValue }
})

// ❌ WRONG - Vue doesn't detect change
const item = items.value.find(i => i.id === targetId)
item.someField = newValue
```

---

## 🏗️ Architecture

### **File Structure**
```
/layers/ops/pages/office/renewals/[id].vue          - Detail page component
/layers/ops/composables/useRenewalsWorksheet.ts     - Business logic composable
/Reference_code/renewals/useRenewalsWorksheet.ts    - LEGACY REFERENCE CODE (WORKING!)
/docs/specs/RENEWALS_WORKSHEET_SPEC.md              - Original spec (incomplete)
```

### **Data Flow**
```
1. Page loads items from Supabase via useAsyncData
2. Page loads config from worksheet database (once on mount)
3. Page passes items + config refs to composable
4. Composable calculates display fields (ltl_rent, max_rent, final_rent, etc.)
5. User changes config → Composable recalculates all items
6. User clicks rent option → Composable updates that item
7. User saves worksheet → Page saves config to database
```

### **Current Implementation**

**Page Component (`[id].vue`):**
```typescript
// Load items from database
const { data: items } = await useAsyncData(...)

// Config values in memory
const ltl_percent = ref(25)
const max_rent_increase_percent = ref(5)
const mtm_fee = ref(300)

// Pass to composable
const {
  standardRenewals,
  mtmRenewals,
  updateRentSource,
  updateComment,
  // ...
} = useRenewalsWorksheet(items, ltl_percent, max_rent_increase_percent, mtm_fee)

// ⚠️ ISSUE: How to trigger calculation when items load?
// ⚠️ ISSUE: How to trigger recalculation when config changes?
// ⚠️ ISSUE: Watchers create infinite loops!
```

**Composable (`useRenewalsWorksheet.ts`):**
```typescript
export function useRenewalsWorksheet(
  items: Ref<RenewalItemUI[]>,
  ltl_percent: Ref<number>,
  max_rent_increase_percent: Ref<number>,
  mtm_fee: Ref<number>
) {
  // ⚠️ PROBLEM: Need to calculate when items load from server
  // ⚠️ PROBLEM: Need to recalculate when config changes
  // ⚠️ PROBLEM: Watching items and modifying items creates infinite loop

  function initializeDisplayFields() {
    // Creates NEW array with calculated fields
    items.value = items.value.map(item => {
      // Calculate ltl_rent, max_rent, final_rent, etc.
      return { ...item, ltl_rent, max_rent, final_rent, ... }
    })
  }

  // ❌ INFINITE LOOP: Watching items and modifying items
  watch(items, () => initializeDisplayFields())

  // ❌ INFINITE LOOP: Even with shallow watch
  watch(items, () => initializeDisplayFields(), { immediate: true })

  // ❌ INFINITE LOOP: Even with split watchers
  watch([ltl_percent, max_rent_increase_percent], () => initializeDisplayFields())
  watch(items, () => initializeDisplayFields(), { immediate: true })

  return { standardRenewals, mtmRenewals, updateRentSource, ... }
}
```

---

## 🎯 Legacy Reference Code (WORKING PATTERN)

**File:** `/Reference_code/renewals/useRenewalsWorksheet.ts`

**Key Differences from Current Implementation:**

### **1. Separate Input/Output Refs**
```typescript
// ✅ LEGACY PATTERN - Separate input and output
export function useRenewalsWorksheet(
  sourceData: Ref<RenewalListItem[]>,  // INPUT (never modified)
  renewalModel: Ref<AppConstant[]>,
  maxRentPercent: Ref<number>,
  mtmFee: Ref<number>
) {
  // OUTPUT refs (modified, but not watched)
  const standardRenewals = ref<RenewalListItem[]>([])
  const mtmRenewals = ref<RenewalListItem[]>([])

  // Watch INPUT, modify OUTPUT
  watch(
    [sourceData, renewalModel, maxRentPercent, mtmFee],
    ([newSourceData, newModel]) => {
      if (!newSourceData || !newModel || newModel.length === 0) {
        standardRenewals.value = []
        mtmRenewals.value = []
        return
      }

      // Process source data and store in output refs
      const allItems = newSourceData.map(calculateWorksheetRow)
      standardRenewals.value = allItems.filter(i => i.renewal_type === 'standard')
      mtmRenewals.value = allItems.filter(i => i.renewal_type === 'mtm')
    },
    { deep: true, immediate: true }
  )

  return { standardRenewals, mtmRenewals, ... }
}
```

**Why This Works:**
- Watches `sourceData` (input)
- Modifies `standardRenewals` and `mtmRenewals` (output)
- No circular dependency!
- `sourceData` is never modified, so watcher doesn't loop

### **2. User Action Handlers**
```typescript
function updateWorksheetItem(leaseId: number, updates: Partial<RenewalListItem>) {
  const updateList = (list: Ref<RenewalListItem[]>) => {
    const index = list.value.findIndex(l => l.lease_id === leaseId)
    if (index !== -1) {
      const updatedLease = { ...list.value[index], ...updates }
      list.value[index] = calculateWorksheetRow(updatedLease)
      isWorksheetDirty.value = true
    }
  }

  updateList(standardRenewals)
  updateList(mtmRenewals)
}
```

**Note:** Legacy modifies items in place (`list.value[index] = ...`), which is less reliable for Vue reactivity. Should use map pattern instead.

---

## 🚫 What NOT to Do (Failed Approaches)

### **1. Don't Watch What You Modify**
```typescript
// ❌ INFINITE LOOP
watch(items, () => {
  items.value = items.value.map(...) // Triggers watcher again!
})
```

### **2. Shallow Watch Doesn't Help**
```typescript
// ❌ STILL INFINITE LOOP
// Setting items.value = new array changes the reference
// This triggers even a shallow watch!
watch(items, () => {
  items.value = items.value.map(...)
}, { immediate: true }) // No deep: true, but still loops!
```

### **3. Don't Add Bandaid Guards**
```typescript
// ❌ BANDAID - Hides the problem
const isProcessing = ref(false)
watch(items, () => {
  if (isProcessing.value) return
  isProcessing.value = true
  items.value = items.value.map(...)
  nextTick(() => { isProcessing.value = false })
})
```

### **4. Don't Use Auto-Save Watchers**
```typescript
// ❌ CAN CAUSE LOOPS
watch([ltl_percent, max_rent_increase_percent], async () => {
  await saveToDatabase() // Can trigger reloads, watchers, loops
})
```

---

## ✅ Recommended Solution Approaches

### **Option 1: Separate Input/Output Refs (Like Legacy)**
Follow the legacy pattern exactly:
- Accept `sourceItems` as input (never modify)
- Create `calculatedItems` as output (modify freely)
- Watch `sourceItems` + config, update `calculatedItems`
- Return `calculatedItems` for display

**Pros:**
- Proven pattern from legacy code
- No circular dependencies
- Clean separation of concerns

**Cons:**
- Requires refactoring page component to use separate refs

### **Option 2: Computed Instead of Watch**
Use computed properties instead of watchers:
```typescript
const calculatedItems = computed(() => {
  if (!items.value || !items.value.length) return []
  return items.value.map(item => calculateDisplayFields(item))
})
```

**Pros:**
- Vue handles dependencies automatically
- No manual watchers needed
- No infinite loop risk

**Cons:**
- Computed is read-only
- User actions need separate handlers

### **Option 3: watchEffect with Smart Dependencies**
```typescript
watchEffect(() => {
  if (!items.value || !items.value.length) return

  // Access dependencies (triggers tracking)
  const ltl = ltl_percent.value
  const max = max_rent_increase_percent.value

  // Calculate without modifying items
  // Store results separately
})
```

**Pros:**
- Automatic dependency tracking
- No infinite loop if done correctly

**Cons:**
- Tricky to implement correctly
- Still need to avoid modifying watched refs

---

## 📊 Data Structures

### **RenewalItemUI Interface**
```typescript
interface RenewalItemUI extends RenewalWorksheetItem {
  // Database fields
  id: string
  worksheet_id: string
  unit_id: string
  current_rent: number
  market_rent: number | null
  final_rent: number | null
  rent_offer_source: 'ltl_percent' | 'max_percent' | 'manual'
  custom_rent: number | null  // DELTA (increase), not final rent
  comment: string | null
  approved: boolean
  renewal_type: 'standard' | 'mtm'
  status: 'pending' | 'offered' | 'manually_accepted' | 'manually_declined' | 'accepted' | 'declined' | 'expired'

  // Computed display fields (calculated in composable)
  rent_increase?: number
  rent_increase_percent?: number
  ltl_gap?: number
  ltl_rent?: number           // UNCAPPED LTL% calculation for display
  max_rent?: number           // Max % calculation for display
  is_manual_pending?: boolean
  is_capped_by_max?: boolean  // Warning flag
}
```

### **Config State**
```typescript
// Lives in page component memory (not worksheet database initially)
const ltl_percent = ref(25)                    // Default 25%
const max_rent_increase_percent = ref(5)       // Default 5%
const mtm_fee = ref(300)                       // Default $300

// Loaded from worksheet DB on mount (once)
watch(worksheet, (newWorksheet) => {
  if (newWorksheet && !configInitialized.value) {
    ltl_percent.value = newWorksheet.ltl_percent || 25
    max_rent_increase_percent.value = newWorksheet.max_rent_increase_percent || 5
    mtm_fee.value = newWorksheet.mtm_fee || 300
    configInitialized.value = true
  }
}, { immediate: true })

// Saved to DB when user clicks "Save Worksheet"
async function saveWorksheet() {
  await supabase.from('renewal_worksheets').update({
    ltl_percent: ltl_percent.value,
    max_rent_increase_percent: max_rent_increase_percent.value,
    mtm_fee: mtm_fee.value
  }).eq('id', worksheetId)
}
```

---

## 🧪 Testing Requirements

### **Manual Testing Checklist**
- [ ] Page loads without infinite loop error
- [ ] Config values load from database on initial mount
- [ ] Changing LTL% updates LTL% column immediately
- [ ] Changing Max% updates Max% column immediately
- [ ] Clicking "LTL%" option shows green border immediately
- [ ] Clicking "Max%" option shows green border immediately
- [ ] Clicking "Manual" shows input field immediately
- [ ] Entering custom rent (delta) calculates final rent correctly
- [ ] Adding comment shows green icon immediately
- [ ] Max cap warning shows when final_rent >= max_rent (any option)
- [ ] All rents display as integers (no decimals)
- [ ] Approval checkbox updates immediately
- [ ] Saving worksheet persists config to database
- [ ] Refreshing page loads saved config values

### **Expected Behavior**
- Page loads in < 2 seconds
- No console errors or warnings
- All interactions feel instant (< 100ms)
- No unexpected rerenders
- No infinite loops or "Maximum recursive updates exceeded" errors

---

## 🔧 Technical Constraints

### **Framework Versions**
- Nuxt: 4.2.2
- Vue: 3.5.27
- Vite: 7.3.1

### **Database**
- Supabase PostgreSQL
- Tables: `renewal_worksheets`, `renewal_worksheet_items`
- RLS policies enabled

### **Reactivity System**
- Vue 3 Composition API
- `ref()` for primitive values
- `ref()` for arrays/objects
- Must create NEW objects/arrays for Vue to detect changes

---

## 📝 Success Criteria

**Definition of Done:**
1. ✅ Page loads without infinite loop
2. ✅ All reactivity requirements met (immediate updates)
3. ✅ Config save/load works correctly
4. ✅ No console errors or warnings
5. ✅ All manual tests pass
6. ✅ Code is clean and maintainable (no bandaids)
7. ✅ Pattern is sustainable (can be extended for new features)

---

## 💡 Recommendations for Next Agent

1. **Start with Legacy Pattern**
   - Read `/Reference_code/renewals/useRenewalsWorksheet.ts` carefully
   - Follow the separate input/output refs pattern
   - Don't try to be clever - copy what works

2. **Consider Computed Properties**
   - May be simpler than watchers for read-only calculations
   - Pair with separate update handlers for user actions

3. **Test Early and Often**
   - Test for infinite loops immediately
   - Don't build complex logic before verifying reactivity works

4. **Keep It Simple**
   - Simple code that works > clever code that breaks
   - User's feedback: "simpler vue and javascripts works better"

5. **Document Assumptions**
   - If you make architectural decisions, document why
   - Make it easy for the next agent to understand your choices

---

## 🎯 Current Session Summary

**Total Attempts:** 5+ rewrites
**Time Spent:** Multiple hours
**Result:** Still infinite loop
**User Feedback:** "Really surprised by the issues... We did not have this much issue with other codes"

**Key Takeaway:** The infinite loop problem is fundamental - watching and modifying the same ref doesn't work in Vue 3, regardless of watch options. Need architectural change, not implementation tweaks.

---

**Good luck! The working legacy pattern is your friend. Trust it.** 🍀

---

## ✅ Completion Report & Final Architecture (2026-02-13)

### **Resolution: The Separate Input/Output Pattern**
The fatal infinite loop was resolved by strictly adhering to the "Legacy" pattern:
- **Input Ref**: `sourceItems` (Read-only, watched for changes).
- **Output Refs**: `standardRenewals` and `mtmRenewals` (Calculated by the composable, never watched).

This architectural split eliminates circular dependencies and ensures stable reactivity.

### **Production-Grade Enhancements**
1. **SF-Based Floor Plan Sorting**: All floor plan filters now sort by square footage (SF) via a parallel fetch to the `floor_plans` table.
2. **Draft Persistence**: Implemented `localStorage` to save working drafts of LTL%, Max%, and MTM fees, preventing data loss on accidental navigation.
3. **0-Value Sensitivity**: Replaced `??` with explicit nullish checks to ensure `0` is treated as a valid value rather than triggering a fallback to defaults.
4. **Hydration Safety**: Wrapped the detail page in `<ClientOnly>` to sync with client-side localStorage and dynamic UI state.
5. **Layout Persistence**: Switched layout width preferences to `useCookie` for immediate server-side awareness of "Wide" vs "Standard" modes.

**Status:** FEATURE ARCHIVED.
