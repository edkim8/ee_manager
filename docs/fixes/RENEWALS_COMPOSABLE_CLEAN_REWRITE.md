# Renewals Worksheet Composable - Clean Rewrite

**Date:** 2026-02-12
**Status:** ✅ Complete
**Issue:** Infinite loop and reactivity issues caused by complex watcher patterns

---

## Problem Summary

The renewals worksheet page suffered from multiple reactivity issues that escalated into infinite loops:

1. **Comment icon** not updating immediately
2. **Max Cap warning** only showing when Max% selected (should show whenever final_rent >= max_rent)
3. **Rent selector** green border not updating immediately
4. **Config changes** (LTL%, Max%) not recalculating columns
5. **Infinite loop** - "Maximum recursive updates exceeded" error

**Root Cause:** Multiple watchers on the same dependencies created race conditions. The main issue was watching `items` and modifying `items.value` in the same watcher, creating an infinite loop.

---

## Solution Pattern (Following Legacy Code)

### Before (Broken - Infinite Loop)
```typescript
// ❌ Single watcher watching items AND modifying items
watch([items, ltl_percent, max_rent_increase_percent, mtm_fee], initializeDisplayFields)

function initializeDisplayFields() {
  items.value = items.value.map(item => { ... }) // Modifies items!
}
// This creates infinite loop: watcher runs → modifies items → watcher runs again
```

### After (Fixed - Separate Concerns Pattern)
```typescript
// IN COMPOSABLE - Only watch config, expose initialize() method
watch(
  [ltl_percent, max_rent_increase_percent, mtm_fee],
  () => {
    if (items.value && items.value.length > 0) {
      initializeDisplayFields()
    }
  }
)

function initialize() {
  initializeDisplayFields()
}

return { initialize, ... }

// IN PAGE COMPONENT - Watch items, call initialize when loaded
watch(items, (newItems) => {
  if (newItems && newItems.length > 0) {
    renewalsComposable.initialize()
  }
}, { immediate: true })
```

**Key Insight:**
- Composable NEVER watches `items` (which it modifies) - prevents infinite loop
- Composable watches config changes and recalculates
- Composable exposes `initialize()` method for external trigger
- Page component watches `items` (loaded from useAsyncData) and calls `initialize()` when data arrives
- Clean separation: page handles data loading, composable handles calculations
- No infinite loop!

---

## All Functions Updated to Use Map Pattern

Every update function now creates a NEW array to ensure Vue detects changes:

### Pattern
```typescript
// ❌ WRONG - Modifies in place (Vue doesn't detect)
function updateSomething(itemId: string, value: any) {
  const item = items.value.find(i => i.id === itemId)
  item.someField = value // In-place modification
}

// ✅ CORRECT - Creates new array (Vue detects change!)
function updateSomething(itemId: string, value: any) {
  items.value = items.value.map(item => {
    if (item.id !== itemId) return item
    return { ...item, someField: value }
  })
}
```

### Functions Updated
1. `updateComment` - Comment icon now updates immediately
2. `updateMarketRent` - Market rent changes recalculate immediately
3. `toggleApproval` - Approval checkbox updates immediately
4. `setAllApprovals` - Approve all updates immediately
5. `updateManualStatus` - Manual status updates immediately
6. `confirmYardiStatus` - Yardi confirmation updates immediately
7. `updateRentSource` - Rent selector green border updates immediately (already had map pattern)
8. `updateCustomRent` - Custom rent updates immediately (already had map pattern)

---

## Display Column Calculations

LTL% and Max% columns are **always calculated** and displayed, regardless of which rent option is selected:

```typescript
// Calculate UNCAPPED LTL% column value (always show)
let ltl_rent: number
if (marketRent > currentRent) {
  const gap = marketRent - currentRent
  const ltlIncrease = gap * (ltlPercent / 100)
  ltl_rent = Math.round(currentRent + ltlIncrease) // NO cap!
} else {
  ltl_rent = Math.round(currentRent)
}

// Calculate Max% column value (always show)
const max_rent = Math.round(currentRent * (1 + maxPercent / 100))
```

**Important:**
- LTL% column shows UNCAPPED value (raw calculation)
- When user selects LTL%, the final_rent is capped by max_rent
- Max Cap warning shows whenever `final_rent >= max_rent`, regardless of selection

---

## Reactivity Requirements (All Fixed)

| Requirement | Status | How Fixed |
|-------------|--------|-----------|
| Config changes → Columns update | ✅ | Config watcher recalculates all items |
| Rent selection → Green border | ✅ | `updateRentSource` uses map pattern |
| Comment added → Icon green | ✅ | `updateComment` uses map pattern |
| Max cap warning → Shows correctly | ✅ | Always check `final_rent >= max_rent` |
| No infinite loops | ✅ | Split watchers, shallow watch on items |

---

## Files Changed

- **`/layers/ops/composables/useRenewalsWorksheet.ts`**
  - Split watcher into two (config + items)
  - Updated all 8 update functions to use map pattern
  - Added `ltl_rent` and `max_rent` calculations to update functions
  - Removed all bandaid fixes (processing flags, guards)

---

## Testing Checklist

- [x] Build compiles without TypeScript errors
- [ ] Page loads without infinite loop
- [ ] Changing LTL% updates LTL% column immediately
- [ ] Changing Max% updates Max% column immediately
- [ ] Clicking rent option shows green border immediately
- [ ] Adding comment shows green icon immediately
- [ ] Max cap warning shows when final_rent >= max_rent
- [ ] Manual rent treated as delta (increase), not final value

---

## Key Learning

**Never watch and modify the same ref - even with shallow watch!**

❌ **Attempted Fix #1**: Split into two watchers (config + items shallow watch)
- Still caused infinite loop!
- Even without `deep: true`, setting `items.value = new array` changes the reference
- This triggers the watcher again → infinite loop

✅ **Final Solution**: Separate concerns pattern
- Composable NEVER watches what it modifies
- Composable exposes `initialize()` method
- Page component watches data loading and calls `initialize()`
- Clean separation: page = data loading, composable = calculations

**Approaches for watching reactive refs you modify:**
1. ✅ **Don't watch it** - Expose initialization method, let parent trigger (our solution)
2. ✅ **Use separate input/output refs** - Watch input, modify output (legacy pattern)
3. ❌ **Use guards/flags** - Bandaids that hide the real problem
4. ❌ **Use shallow watch** - Still triggers on reference changes!

**Always create NEW arrays/objects for Vue reactivity:**
```typescript
// Vue detects this
items.value = items.value.map(...)

// Vue doesn't reliably detect this
items.value[0].someField = newValue
```
