# Renewals Worksheet Page - Specification

## Purpose
Interactive worksheet for managing lease renewals with configurable rent calculation models.

## Data Sources
1. **Worksheet** (from DB): Contains config values (ltl_percent, max_rent_increase_percent, mtm_fee)
2. **Worksheet Items** (from DB): List of renewal opportunities with current/market rents

## Configuration Values (Live in Memory)
- **LTL %** (Lease-to-Lease): What % of gap between current and market rent to close
- **Max Increase %**: Cap on rent increases (e.g., 5%)
- **MTM Fee**: Month-to-month premium fee

## Calculated Columns (Reactive to Config Changes)
- **LTL % Column**: `current_rent + ((market_rent - current_rent) * LTL%) ` - UNCAPPED, raw value
- **Max % Column**: `current_rent * (1 + Max%)` - The maximum allowed rent

## Rent Selection Options (User Picks One)
- **LTL %**: Use LTL calculation, CAPPED by Max %
- **Max %**: Use Max % calculation
- **Manual**: User enters custom increase amount (delta, not final rent)

## Final Rent Calculation
```
if (selected === 'ltl_percent'):
  ltl_rent = current_rent + ((market_rent - current_rent) * LTL%)
  max_rent = current_rent * (1 + Max%)
  final_rent = min(ltl_rent, max_rent)  // Apply cap

if (selected === 'max_percent'):
  final_rent = current_rent * (1 + Max%)

if (selected === 'manual'):
  final_rent = current_rent + custom_rent  // custom_rent is DELTA
```

## Reactivity Requirements
1. **Config Changes → Columns Update**: When LTL% or Max% changes, recalculate LTL% and Max% columns immediately
2. **Rent Selection → Final Rent Updates**: When user clicks LTL/Max/Manual, update final_rent and show green border
3. **Comment Added → Icon Updates**: When comment saved, icon turns green immediately
4. **Max Cap Warning**: Show yellow warning when final_rent >= max_rent (regardless of which option selected)

## Save Behavior
- **Config Values**: Saved when user clicks "Save Worksheet" (NOT auto-saved on every change)
- **Rent Selections**: Auto-saved to DB when user clicks (for persistence)
- **Comments**: Auto-saved when user saves comment

## Legacy Pattern (Reference)
```typescript
// Watch BOTH data AND config together
watch([sourceData, maxRentPercent, mtmFee], ([newData]) => {
  if (!newData) return

  // Recalculate ALL items
  const calculated = newData.map(item => calculateRow(item))

  // Store in SEPARATE refs (don't modify source)
  standardRenewals.value = calculated.filter(...)
  mtmRenewals.value = calculated.filter(...)
})
```

## Key Insights from Legacy
1. **Single watcher** for both data and config (not separate watchers)
2. **Don't modify source data** - store results in separate refs
3. **Simple map() recalculation** - no complex state management
4. **No auto-save watchers** - save on user action only

## What NOT to Do
❌ Separate watchers for data vs config (causes loops)
❌ Modify items.value directly in watcher (causes reactivity issues)
❌ Auto-save watchers that trigger on every config change (causes infinite loops)
❌ Complex processing flags and guards (bandaids for bad architecture)

## Clean Implementation Plan
1. Remove all auto-save watchers
2. Use single watcher for `[items, ltl_percent, max_rent_increase_percent, mtm_fee]`
3. In watcher, create NEW array with calculated fields
4. Save config only when user explicitly saves worksheet
5. Keep rent selection auto-save (works fine, no loops)
