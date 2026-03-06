# Foreman Report: Deletion Privilege Hardening — 2026-03-05

**Date:** 2026-03-05
**To:** Foreman
**From:** Claude Sonnet 4.6 (Tier 2 Builder)
**Branch:** `chore/daily-audit-2026-03-05`
**Status:** COMPLETE — All tasks implemented. Ready for migration push and branch merge.

---

## Executive Summary

This session implemented the "Creator + Admin" deletion authority model defined in `docs/governance/DELETION_CLEANUP_PROTOCOL.md` §6. The work covers both layers of enforcement — database RLS and UI conditional rendering — across the Location, Notes, and Inventory systems. A secondary bug fix resolved creator names displaying as raw UUIDs in the Notes modal.

---

## What Was Built

### Database (2 new migrations)

| File | Purpose |
|---|---|
| `supabase/migrations/20260305_harden_deletion_privileges.sql` | Replaces all permissive DELETE policies on 4 tables with creator-or-admin checks |
| `supabase/migrations/20260305_allow_authenticated_profile_read.sql` | Allows all authenticated staff to read profile names (required for creator name display) |

### UI (3 components modified)

| File | Change |
|---|---|
| `layers/ops/pages/assets/locations/index.vue` | `canDeleteLocation` computed — gates Delete button and confirm block |
| `layers/ops/components/location/LocationNotesModal.vue` | `canDeleteNote()` — gates trash icon per note; also fixes creator name display |
| `layers/ops/pages/office/inventory/index.vue` | `canDeleteAttachment()` — gates photo/doc delete buttons; category delete admin-only |

### Composable (1 file modified)

| File | Change |
|---|---|
| `layers/ops/composables/useLocationNotes.ts` | Batch-fetches creator profiles after loading notes; attaches `creator_name` to each note |

---

## How It Works

### Deletion Authority (Creator + Admin)

All user context comes from `usePropertyState().userContext`, which is already loaded globally. No new API calls are added to any page.

The pattern is identical across all three components:

```ts
const isSuperAdmin = computed(() => userContext.value?.access?.is_super_admin ?? false)
const currentUserId = computed(() => userContext.value?.id ?? null)

const canDelete = (record) => {
  if (isSuperAdmin.value) return true      // Admin override
  if (!record.created_by) return false     // Legacy null → admin-only
  return record.created_by === currentUserId.value
}
```

UI buttons use `v-if="canDelete(record)"` — no button renders for unauthorized users. The RLS policy is the hard enforcer; the UI gate is UX only.

### RLS Policy Structure

```sql
-- Pattern applied to all 4 tables
USING (created_by = auth.uid() OR public.is_admin())
```

`public.is_admin()` is a pre-existing `SECURITY DEFINER` function that checks `profiles.is_super_admin`. The old loophole (`created_by IS NULL` allowed any user to delete legacy records) is now closed — null-creator records require admin.

### Creator Name Display Fix

**Before:** `By: a3f8b2c1...` (truncated UUID)

**After:** `By: Edward Kim`

The composable now runs a single batch `profiles` query after fetching notes, builds a `creatorId → name` map, and attaches `creator_name` to each note object. The new profiles read policy (`20260305_allow_authenticated_profile_read.sql`) enables this — previously, RLS only let users see their own profile row.

---

## Security Model Summary

| User | Can delete own records? | Can delete others' records? | Can delete legacy (null creator)? |
|---|---|---|---|
| Regular staff | Yes | No (hidden + 42501) | No (hidden + 42501) |
| Super Admin | Yes | Yes | Yes |

---

## Pending Actions for Foreman

1. **Push the migrations** — two new SQL files need to be applied to production Supabase via `supabase db push` or the dashboard.
2. **Merge the branch** — `chore/daily-audit-2026-03-05` → `main`.
3. **Smoke test** — log in as a non-admin, verify delete buttons are hidden on records created by others. Log in as admin, verify full access.

---

## Reference Documents

- Session detail: `docs/status/SESSION_2026_03_05_DELETION_PRIVILEGE_HARDENING.md`
- Protocol: `docs/governance/DELETION_CLEANUP_PROTOCOL.md` §6
- Prior storage session: `docs/status/SESSION_2026_03_05_STORAGE_PROTOCOL.md`
