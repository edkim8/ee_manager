# Session Summary: usePropertyState localStorage Cache
**Date:** 2026-03-05
**Branch:** `main` (committed directly after merge)

---

## Problem

When navigating between modules (e.g. Inventory → Location Manager), the property selector occasionally went blank and required multiple reloads to recover. The browser console showed a slow network warning from a Chrome extension font load, but the real cause was internal.

**Root cause:** `useSupabaseUser()` briefly emits `null` during SPA navigation while the Supabase client re-validates the session. This triggered the `watch: [user]` in `useAsyncData`, which re-ran the `/api/me` fetch and set `me.value = null` while the request was in flight. All computed properties derived from `me` (`userContext`, `propertyOptions`, `availableDownshiftRoles`) returned empty/null for the duration of that fetch (~3 Supabase DB calls on a slow connection), causing the property selector to flash blank.

The `activeProperty` cookie was unaffected and still held the correct code — but with no `propertyOptions` list populated, there was nothing to match against and the selector appeared reset.

---

## Fix

**File:** `layers/base/composables/usePropertyState.ts`

Added a **stale-while-revalidate localStorage cache** for the `/api/me` response.

### Cache helpers (module-level, outside composable)

| Function | Purpose |
|---|---|
| `readMeCache()` | Synchronously reads and JSON-parses from `localStorage`. Returns `null` if missing, unparseable, or older than 24 hours (auto-evicts expired entries). |
| `writeMeCache(data)` | Writes `{ data, ts: Date.now() }` to `localStorage`. Silently no-ops if quota exceeded or in private browsing. |
| `clearMeCache()` | Removes the key. Called on logout. |

**Cache key:** `eemanager:me-context`
**TTL:** 24 hours

### Inside the composable

```
meCache  = useState('me-local-cache', () => readMeCache())
           ↑ initialized synchronously from localStorage on first call.
             useState key ensures all composable instances share the same ref.

effectiveMe = computed(() => me.value ?? meCache.value)
              ↑ live API data when available; falls back to cache during fetch.

watch(me) → if (newVal) { writeMeCache(newVal); meCache.value = newVal }
            ↑ updates localStorage every time a good API response arrives.
```

All computed properties (`availableDownshiftRoles`, `canUseDevTools`, `userContext`, `propertyOptions`) now read from `effectiveMe` instead of `me` directly.

`resetProperty()` (called on logout) now also clears `meCache` and `localStorage` so a new user session starts clean.

### Before / After

| Scenario | Before | After |
|---|---|---|
| First login ever | Blank until `/api/me` resolves | Blank until `/api/me` resolves (no cache yet) |
| SPA navigation (normal network) | Already worked (useState) | Same |
| SPA navigation (slow/flaky network) | Property selector blanks for 0.5–2s | Instantly populated from cache |
| Hard refresh | Blank until `/api/me` resolves | Instantly populated from cache |
| Logout / new user | Resets correctly | Cache cleared — no stale data leaks |
| Cache older than 24h | N/A | Auto-evicted, treated as no cache |

---

## Files Changed

| File | Change |
|---|---|
| `layers/base/composables/usePropertyState.ts` | localStorage cache helpers + `meCache` useState + `effectiveMe` computed + `resetProperty` cache clear |
