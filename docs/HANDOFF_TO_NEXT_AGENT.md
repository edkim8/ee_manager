# Handoff to Next Agent - Renewals Worksheet Infinite Loop

**Date:** 2026-02-12
**From:** Goldfish (Claude) - Session Terminated
**To:** Next Agent
**Priority:** 🔴 CRITICAL - Page Cannot Load

---

## 🚨 Critical Issue

**Problem:** "Maximum recursive updates exceeded" infinite loop on renewals worksheet detail page (`/office/renewals/[id]`).

**Impact:** Page completely broken - cannot load, cannot test, cannot use.

**Attempts:** 5+ complete rewrites - all failed.

---

## 📖 Start Here (Read First)

### **1. Complete Specification** ⭐ MOST IMPORTANT
**File:** `/docs/specs/RENEWALS_WORKSHEET_DETAIL_PAGE_SPEC.md`

**Contains:**
- ✅ Complete business requirements
- ✅ All reactivity requirements
- ✅ Current broken state explanation
- ✅ All failed approaches documented
- ✅ Legacy working pattern (separate input/output refs)
- ✅ Recommended solution approaches
- ✅ Testing requirements
- ✅ Success criteria

**Read this FIRST before writing any code.**

### **2. Working Legacy Reference Code** ⭐ SECOND MOST IMPORTANT
**File:** `/Reference_code/renewals/useRenewalsWorksheet.ts`

**Why Important:**
- ✅ This code WORKS (no infinite loops)
- ✅ Uses separate input/output refs pattern
- ✅ Watches input, modifies output (no circular dependency)
- ✅ Proven pattern from production code

**Study this pattern carefully - it's your blueprint.**

### **3. Current Broken Code**
**Files:**
- `/layers/ops/composables/useRenewalsWorksheet.ts` - Has infinite loop
- `/layers/ops/pages/office/renewals/[id].vue` - Uses broken composable

**Don't try to fix these incrementally - start fresh following legacy pattern.**

---

## 🔧 The Problem (Technical)

### **Root Cause**
Watching and modifying the same reactive ref (`items`) creates circular dependency:

```typescript
// ❌ THIS ALWAYS CAUSES INFINITE LOOP (no matter what watch options)
watch(items, () => {
  items.value = items.value.map(...) // Changes items → triggers watcher again!
})
```

**Even these failed:**
- Shallow watch (no `deep: true`) - still loops
- Split watchers (config + items separate) - still loops
- Guards/flags (`isProcessing`, `lastProcessedValues`) - still loops
- Expose `initialize()` method - still loops

### **Why It Fails**
In Vue 3, when you set `items.value = new array`, you change the array reference. Even a shallow watch detects this and triggers again → infinite loop.

### **The Only Solution**
**Don't watch what you modify.** Use separate refs:
- Watch `inputItems` (never modify)
- Modify `outputItems` (never watch)
- No circular dependency = no infinite loop

---

## ✅ Recommended Approach

Follow the legacy pattern **exactly**:

```typescript
// Composable signature
export function useRenewalsWorksheet(
  sourceItems: Ref<RenewalItemUI[]>,      // INPUT (never modify)
  ltl_percent: Ref<number>,
  max_rent_increase_percent: Ref<number>,
  mtm_fee: Ref<number>
) {
  // OUTPUT refs (modify, but don't watch)
  const standardRenewals = ref<RenewalItemUI[]>([])
  const mtmRenewals = ref<RenewalItemUI[]>([])

  // Watch INPUT + config, modify OUTPUT
  watch(
    [sourceItems, ltl_percent, max_rent_increase_percent, mtm_fee],
    ([newSourceItems]) => {
      if (!newSourceItems || newSourceItems.length === 0) {
        standardRenewals.value = []
        mtmRenewals.value = []
        return
      }

      // Calculate and split
      const calculated = newSourceItems.map(item => calculateDisplayFields(item))
      standardRenewals.value = calculated.filter(i => i.renewal_type === 'standard')
      mtmRenewals.value = calculated.filter(i => i.renewal_type === 'mtm')
    },
    { deep: true, immediate: true }
  )

  return { standardRenewals, mtmRenewals, ... }
}
```

**Page component:**
```typescript
// Load from database
const { data: sourceItems } = await useAsyncData(...)

// Pass as input, get back calculated output
const { standardRenewals, mtmRenewals, ... } = useRenewalsWorksheet(
  sourceItems,
  ltl_percent,
  max_rent_increase_percent,
  mtm_fee
)

// Display the OUTPUT refs
<template>
  <table v-for="item in standardRenewals" ...>
</template>
```

---

## 📋 Checklist for Next Agent

**Before Writing Code:**
- [ ] Read complete specification document
- [ ] Study legacy reference code pattern
- [ ] Understand separate input/output refs approach
- [ ] Plan implementation strategy

**Implementation:**
- [ ] Refactor composable to use separate input/output refs
- [ ] Update page component to use new composable signature
- [ ] Implement all update functions with map() pattern
- [ ] Test for infinite loops immediately

**Testing:**
- [ ] Page loads without infinite loop
- [ ] Config changes update columns immediately
- [ ] Rent option clicks show green border immediately
- [ ] Comments update icon immediately
- [ ] No console errors or warnings

**Success Criteria:**
- [ ] All reactivity requirements met
- [ ] No infinite loops
- [ ] Code is clean and maintainable
- [ ] Pattern matches legacy reference code

---

## 🚫 What NOT to Do

1. ❌ Don't try to fix current implementation incrementally
2. ❌ Don't watch and modify the same ref
3. ❌ Don't add guards/flags to prevent loops (bandaids)
4. ❌ Don't use shallow watch hoping it will help (it won't)
5. ❌ Don't ignore the legacy pattern (it works!)
6. ❌ Don't overcomplicate - simple code that works > clever code that breaks

---

## 💬 User Feedback

> "I am really surprised by the issues and continued issue even with complete rewrite. We did not have this much issue with other codes?"

> "Let's get a clean start. Document all the specification and requirements for this module. I will terminate this session and restart with clean agent."

**User Expectations:**
- Clean, simple code that works
- Follow proven patterns (legacy code)
- No bandaids or overly complex solutions
- Immediate reactivity (no refresh required)

---

## 📁 All Documentation Files

**Must Read:**
1. `/docs/specs/RENEWALS_WORKSHEET_DETAIL_PAGE_SPEC.md` - Complete spec
2. `/Reference_code/renewals/useRenewalsWorksheet.ts` - Working legacy code

**Reference:**
3. `/docs/status/LATEST_UPDATE.md` - Session summary
4. `/docs/fixes/RENEWALS_COMPOSABLE_CLEAN_REWRITE.md` - Session history
5. `/docs/specs/RENEWALS_WORKSHEET_SPEC.md` - Original spec
6. `/docs/HANDOFF_TO_NEXT_AGENT.md` - This document

**Current Code (Broken):**
7. `/layers/ops/composables/useRenewalsWorksheet.ts`
8. `/layers/ops/pages/office/renewals/[id].vue`

---

## 🎯 Success Definition

**You'll know you succeeded when:**
1. ✅ Page loads without "Maximum recursive updates exceeded" error
2. ✅ All reactivity works immediately (no refresh needed)
3. ✅ User can test all functionality
4. ✅ Code follows legacy pattern
5. ✅ No console errors or warnings

---

## 💡 Final Advice

**Trust the legacy pattern.** It works because it avoids the fundamental Vue 3 reactivity constraint: you cannot watch and modify the same ref without creating a circular dependency.

The solution is architectural, not implementational. Separate input and output refs is the proven, working approach.

**Good luck!** 🍀

---

**Handoff Complete**
**Next Agent:** Please read specification document first, then start fresh implementation following legacy pattern.
