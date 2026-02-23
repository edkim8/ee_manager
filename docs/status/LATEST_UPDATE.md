# Field Report: Admin Layer Bug Fixes — 2026-02-23

**Session:** Tier 2 Builder (Goldfish)
**Branch:** `feat/admin-bug-fixes-2026-02-23`
**Tests:** 502/502 passing ✓

---

## Bugs Fixed

### 1. `UFormGroup` → `UFormField` (Nuxt UI v4 Rename) — 6 Files

`UFormGroup` was removed in Nuxt UI v4; the replacement is `UFormField`. All usages caused a silent Vue component resolution warning:
```
[Vue warn]: Failed to resolve component: UFormGroup
```

**Files patched:**

| File | Occurrences |
|------|-------------|
| `layers/admin/pages/admin/notifications.vue` | 3 |
| `layers/admin/pages/admin/generators/amenity-lookup.vue` | 3 |
| `layers/admin/pages/admin/generators/unit-lookup.vue` | 2 |
| `layers/ops/pages/amenities/index.vue` | 4 |
| `layers/ops/pages/office/availabilities/[id].vue` | 3 |

---

### 2. `UCheckbox` Array v-model Binding — `notifications.vue`

**Root cause:** `UCheckbox` in Nuxt UI v4 expects `modelValue: Boolean | String | Null`. Binding it to a `string[]` array (Vue's native checkbox group pattern) caused:
- Both checkboxes sharing the same array reference → toggling one toggled both ("linked" behavior)
- `400 Bad Request` on Supabase insert because `notification_types` was corrupted to a non-array value

**Fix:** Converted from array v-model to individual boolean bindings with a manual toggle handler:

```typescript
// Before (broken — UCheckbox doesn't support array v-model in v4)
v-model="newRecipient.notification_types"
:value="opt.value"

// After (correct)
:model-value="newRecipient.notification_types.includes(opt.value)"
@update:model-value="toggleNotificationType(opt.value, $event)"
```

Added `toggleNotificationType(type, checked)` helper that mutates the string array correctly.

---

### 3. `USelect` → `USelectMenu` — 2 Files

`USelect` was replaced by `USelectMenu` in Nuxt UI v4. Also updated the prop from `:options` to `:items`.

**Files patched:**
- `layers/admin/pages/admin/generators/amenity-lookup.vue` — Type selector (`code | name | label`)
- `layers/ops/pages/amenities/index.vue` — Amenity type selector (`Fixed | Premium | Discount`)

---

## Files NOT Changed

- `layers/admin/components/AdminUserEdit.vue` — Already using `UFormField` ✓
- `layers/admin/components/AdminUserCreate.vue` — Already using `UFormField` ✓
- `UCheckbox` in `AdminUserEdit.vue` / `AdminUserCreate.vue` — Boolean v-model (correct) ✓

---

## Test Results

```
Test Files  15 passed (15)
Tests       502 passed (502)
Duration    5.09s
```

No regressions introduced.

---

## Summary

All `UFormGroup` usages in admin and ops layers replaced with `UFormField`. The linked-checkbox bug in `notifications.vue` is fully resolved — Daily Summary and Audit Report now toggle independently, and the Supabase insert will receive a proper `string[]` array for `notification_types`.
