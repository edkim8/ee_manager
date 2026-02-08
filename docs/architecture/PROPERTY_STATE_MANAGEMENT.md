# Property State Management

**Date:** 2026-02-07
**Status:** ✅ Fixed - No more race conditions
**Location:** `layers/base/composables/usePropertyState.ts`

---

## Overview

The property state management system handles:
1. **Single-property users** - Automatic property selection and persistence
2. **Multi-property users** (Admin/RPM/Management) - Property switching with full reload
3. **No race conditions** - Property available immediately on page load
4. **Persistence** - Property maintained across browser reloads

---

## The Problem (Before Fix)

### Race Condition on Page Load

**Scenario:** User reloads page or navigates directly to a URL

**What happened:**
1. ✅ Page loads, `activeProperty` initialized from cookie (e.g., "RS")
2. ❌ Property validation watcher runs immediately
3. ❌ `propertyOptions` is empty (async user fetch not done)
4. ❌ Watcher sets `activeProperty = null` (overwrites cookie!)
5. ❌ Page queries run with null property → show "No data"
6. ✅ User context fetch completes, property set correctly
7. ⏰ **Too late** - page already loaded empty

**Debug logs showed:**
```
[DEBUG] Fetching floor plan summaries for property: null
[DEBUG] No active property, returning empty array
```

### Root Cause

```typescript
// ❌ OLD CODE - The Bug
watch(propertyOptions, (newOptions) => {
  if (newOptions.length > 0) {
    // ... validation ...
  } else {
    activeProperty.value = null  // ⚠️ Overwrites cookie value!
  }
}, { immediate: true })
```

The watcher ran **immediately** with empty options and set property to null, destroying the value from the cookie.

---

## The Solution (After Fix)

### Preserve Cookie Value Until Validated

```typescript
// ✅ NEW CODE - Fixed
watch(propertyOptions, (newOptions) => {
  if (newOptions.length > 0) {
    // Options loaded, now validate and set
    const currentVal = activeProperty.value || activePropertyCookie.value
    const isValid = newOptions.some(o => o.value === currentVal)

    if (!currentVal || !isValid) {
      // No valid property, select first option
      activeProperty.value = newOptions[0].value
    } else if (activeProperty.value !== currentVal) {
      // Property from cookie is valid, ensure it's set
      activeProperty.value = currentVal
    }
  }
  // Don't set to null - preserve cookie value until validated
}, { immediate: true })
```

### Key Changes

1. **Removed `else { activeProperty.value = null }`** - Don't overwrite on empty options
2. **Preserve cookie value** - Keep existing value until validation completes
3. **Validate before overwrite** - Only change property when options are available

---

## How It Works Now

### Initialization Flow

```
Page Load
  ↓
Cookie loaded: "RS"
  ↓
activeProperty = "RS" (immediately available)
  ↓
Watcher runs (options empty, does nothing)
  ↓
Page queries run with property = "RS" ✅
  ↓
User context API fetches (async)
  ↓
propertyOptions populated
  ↓
Watcher validates "RS" is valid ✅
  ↓
Property confirmed, no change needed
```

### Property Switching (Admin/Management)

```
Admin clicks property selector
  ↓
setProperty("NEW_CODE") called
  ↓
activeProperty.value = "NEW_CODE"
  ↓
Cookie updated automatically (watch on line 18)
  ↓
All pages with watch: [activeProperty] refetch ✅
  ↓
UI updates with new property data
```

---

## Usage in Pages

### Pattern: Use Dynamic Keys

Always use dynamic keys in `useAsyncData` that include the property:

```typescript
// ✅ CORRECT - Dynamic key
const { data } = await useAsyncData(
  () => `my-data-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return []

    const { data } = await supabase
      .from('my_table')
      .select('*')
      .eq('property_code', activeProperty.value)

    return data
  },
  {
    watch: [activeProperty]
  }
)
```

```typescript
// ❌ WRONG - Static key
const { data } = await useAsyncData('my-data', async () => {
  // Won't refetch when property changes!
})
```

### Pattern: Always Check Property

```typescript
// ✅ CORRECT - Early return if no property
if (!activeProperty.value) {
  return []
}

// Then proceed with query
const { data } = await supabase
  .from('table')
  .eq('property_code', activeProperty.value)
```

### Pattern: Property-Dependent Computed Values

```typescript
// ✅ CORRECT - Computed updates when property changes
const selectedItem = computed(() => {
  const itemId = route.query.item_id
  return items.value?.find(i => i.id === itemId) || null
})

// Items automatically refetch when property changes (via watch)
```

---

## State Persistence

### Cookie Storage

```typescript
// Automatic cookie sync
const activePropertyCookie = useCookie<string | null>('selected-property', {
  maxAge: 60 * 60 * 24 * 30, // 30 days
  sameSite: 'lax',
  default: () => null
})

// Bidirectional sync
const activeProperty = useState('active-property', () => activePropertyCookie.value)

watch(activeProperty, (newVal) => {
  activePropertyCookie.value = newVal
})
```

### Benefits

1. **Immediate availability** - Property available from cookie on first render
2. **Persistence** - Survives browser reloads
3. **SSR compatible** - Cookie available on server-side render
4. **Cross-tab sync** - Cookie shared across tabs (same domain)

---

## User Types

### Single-Property Users (Most Common)

**Behavior:**
- Property auto-selected on first login
- Saved to cookie
- Every page load has property immediately available
- No manual selection needed

**Example:** Site manager only has access to "RS"
- Login → "RS" selected automatically
- Cookie saved: `selected-property=RS`
- All future loads use "RS" immediately
- No race conditions ✅

### Multi-Property Users (Admin/Management/RPM)

**Behavior:**
- Can see property selector dropdown
- Clicking new property triggers full reload of current page
- New property saved to cookie
- All data refetches with new property code

**Example:** Admin switches from "RS" to "TC"
- Click selector, choose "TC"
- `activeProperty.value = "TC"`
- Cookie updates: `selected-property=TC`
- All `watch: [activeProperty]` triggers refetch
- UI updates with "TC" data ✅

---

## Validation & Auto-Selection

### Validation Rules

The watcher validates property against allowed properties:

```typescript
const currentVal = activeProperty.value || activePropertyCookie.value
const isValid = newOptions.some(o => o.value === currentVal)

if (!currentVal || !isValid) {
  // Invalid or no property → select first allowed
  activeProperty.value = newOptions[0].value
}
```

### Auto-Selection Logic

1. **No property set** → Select first allowed property
2. **Property in cookie but not allowed** → Select first allowed property
3. **Property valid** → Keep existing property
4. **User switches** → Validate immediately

---

## Debugging

### Check Property State

```typescript
const { activeProperty, propertyOptions, userContext } = usePropertyState()

console.log('Active Property:', activeProperty.value)
console.log('Available Options:', propertyOptions.value)
console.log('User Context:', userContext.value)
```

### Common Issues

**Q: Property showing as null on page load**
- Check cookie: Open DevTools → Application → Cookies → `selected-property`
- Verify watcher isn't overwriting (should be fixed now)
- Check user has property access in database

**Q: Property not switching when admin changes it**
- Verify `watch: [activeProperty]` in useAsyncData
- Check dynamic key: `() => \`key-\${activeProperty.value}\``
- Ensure page isn't using static data

**Q: Data showing from wrong property**
- Check query has `.eq('property_code', activeProperty.value)`
- Verify property isn't cached in old variable
- Clear browser cache and reload

---

## Migration Notes

### Updating Old Pages

If you have pages that query without checking property:

```typescript
// ❌ OLD - Might run with null property
const { data } = await useAsyncData('static-key', async () => {
  const { data } = await supabase
    .from('table')
    .eq('property_code', activeProperty.value)  // Could be null!
  return data
})
```

**Fix:**

```typescript
// ✅ NEW - Safe and reactive
const { data } = await useAsyncData(
  () => `table-data-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) return []  // Early return

    const { data } = await supabase
      .from('table')
      .eq('property_code', activeProperty.value)
    return data
  },
  {
    watch: [activeProperty]  // Refetch on property change
  }
)
```

---

## Testing Checklist

- [ ] Single-property user: Property loads immediately on login
- [ ] Multi-property user: Can switch properties successfully
- [ ] Reload page with direct URL: Property available, data loads
- [ ] Open new tab: Property persists from cookie
- [ ] Close browser and reopen: Property still selected
- [ ] Admin switches property: All data refetches correctly
- [ ] Invalid property in cookie: Auto-selects first allowed
- [ ] No property access: Shows appropriate message

---

## Related Files

- **`layers/base/composables/usePropertyState.ts`** - Core implementation
- **`layers/base/components/AppNavigation.vue`** - Property selector UI
- **`layers/base/middleware/auth.ts`** - User authentication
- **All page components** - Should use this pattern for property-scoped queries

---

## Best Practices

### ✅ DO

1. **Always check property before queries**
   ```typescript
   if (!activeProperty.value) return []
   ```

2. **Use dynamic keys with property**
   ```typescript
   () => `key-${activeProperty.value}`
   ```

3. **Watch activeProperty for refetch**
   ```typescript
   { watch: [activeProperty] }
   ```

4. **Trust the cookie value**
   - It's available immediately on load
   - No need for complex fallbacks

### ❌ DON'T

1. **Don't use static keys for property-scoped data**
   ```typescript
   // ❌ Won't update on property change
   await useAsyncData('my-data', ...)
   ```

2. **Don't set property to null in watchers**
   ```typescript
   // ❌ Causes race conditions
   else { activeProperty.value = null }
   ```

3. **Don't fetch without checking property**
   ```typescript
   // ❌ Might query with null
   .eq('property_code', activeProperty.value)
   ```

4. **Don't create separate property state**
   ```typescript
   // ❌ Creates inconsistency
   const myProperty = ref('RS')
   ```

---

**Last Updated:** 2026-02-07
**Status:** ✅ Production Ready
**Version:** 2.0.0 (Fixed race conditions)
