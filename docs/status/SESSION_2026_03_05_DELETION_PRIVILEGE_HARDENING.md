# Session Summary: Deletion Privilege Hardening
**Date:** 2026-03-05
**Branch:** `chore/daily-audit-2026-03-05`

---

## Objective

Implement the "Creator + Admin" deletion policy across all note and attachment systems (Tier 2 Dispatch). Ensure only a record's creator or a Super Admin can delete notes, attachments, and locations — enforced at both the database (RLS) and UI (conditional rendering) levels.

Reference: `docs/governance/DELETION_CLEANUP_PROTOCOL.md` §6 — Privileges & Access Control.

---

## Work Completed

### 1. RLS Migration — Harden Deletion Privileges
**File:** `supabase/migrations/20260305_harden_deletion_privileges.sql` (new)

Replaced all permissive or loophole-bearing DELETE policies on 4 tables:

| Table | Old Policy | New Policy |
|---|---|---|
| `public.locations` | `USING (true)` — anyone | `created_by = auth.uid() OR public.is_admin()` |
| `public.location_notes` | `created_by IS NULL` loophole | `created_by = auth.uid() OR public.is_admin()` |
| `public.location_note_attachments` | `uploaded_by IS NULL` loophole | `uploaded_by = auth.uid() OR public.is_admin()` |
| `public.attachments` (polymorphic) | permissive | `uploaded_by = auth.uid() OR public.is_admin()` |

**Key detail — legacy records:** The previous policies for `location_notes` and `location_note_attachments` had a `IS NULL` loophole (added in `20260208190001`) that allowed any authenticated user to delete records with no creator assigned. The new policy closes that loophole — legacy null-creator records are now admin-only deletions.

Uses the existing `public.is_admin()` helper (SECURITY DEFINER function checking `profiles.is_super_admin`).

---

### 2. UI Gating — `locations/index.vue`
**File:** `layers/ops/pages/assets/locations/index.vue`

Added `canDeleteLocation` computed property sourced from `usePropertyState().userContext`:
- `isSuperAdmin`: full override
- `created_by === currentUserId`: owner can delete
- `created_by IS NULL` (legacy): hidden from non-admins

The Delete button and inline confirmation block are conditionally rendered with `v-if="canDeleteLocation"`. When hidden, the Close button expands to full width. The delete flow itself (inline confirm UI with no native dialogs) was already fixed in a prior session.

---

### 3. UI Gating — `LocationNotesModal.vue`
**File:** `layers/ops/components/location/LocationNotesModal.vue`

Added `canDeleteNote(note)` helper function:
- Admin override via `isSuperAdmin`
- Creator check: `note.created_by === currentUserId`
- Graceful null: `created_by IS NULL` → returns `false` (admin-only)

The trash icon button on each note card gets `v-if="canDeleteNote(note)"`. Non-owners see no delete affordance.

---

### 4. UI Gating — `inventory/index.vue`
**File:** `layers/ops/pages/office/inventory/index.vue`

Added `canDeleteAttachment(attachment)` and `canDeleteItem(item)` helpers:

| Element | Gate |
|---|---|
| Category "Delete" button | `v-if="isSuperAdmin"` (categories have no `created_by`) |
| Item photo delete (hover ✕) | `v-if="canDeleteAttachment(photo)"` |
| Item document "Delete" button | `v-if="canDeleteAttachment(doc)"` |

---

### 5. Bug Fix — Creator Name Display in Notes
**Files:** `useLocationNotes.ts`, `LocationNotesModal.vue`, + migration

**Bug:** The "By:" line on each note card displayed the raw UUID truncated to 8 characters (`note.created_by.substring(0, 8)...`). Unreadable.

**Root cause:** The `profiles` RLS only allowed users to see their own profile row, so joining creator profiles was impossible for multi-user notes lists.

**Fix (3 parts):**

1. **Migration** `20260305_allow_authenticated_profile_read.sql` — adds a `SELECT` policy on `public.profiles` for all authenticated users. Justified: this is an internal staff app; all authenticated users are employees who can see each other's names.

2. **`useLocationNotes.fetchLocationNotes`** — after fetching notes, collects all unique `created_by` UUIDs, batch-queries `profiles` for `first_name`, `last_name`, `email`, and attaches a resolved `creator_name` string to each note. Name resolution order: `first + last` → `email prefix` → `'Unknown'`.

3. **`LocationNotesModal.vue` template** — `{{ note.created_by.substring(0, 8) }}...` replaced with `{{ note.creator_name }}`.

Also updated the `LocationNote` interface: removed the stale `created_by_user` field, added `creator_name?: string`.

---

## Verification Notes

| Test | Expected Outcome |
|---|---|
| Non-creator/non-admin views a note they didn't write | Trash icon hidden |
| Non-creator attempts direct DB delete | `42501` RLS error |
| Creator views their own note | Trash icon visible |
| Super Admin views any note | Trash icon visible on all |
| Creator name display | Full name shown (e.g. "Edward Kim"), not UUID |
| Legacy null-creator note | Trash icon hidden for non-admins |

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `supabase/migrations/20260305_harden_deletion_privileges.sql` | New | RLS hardening for 4 tables |
| `supabase/migrations/20260305_allow_authenticated_profile_read.sql` | New | profiles read policy for authenticated users |
| `layers/ops/pages/assets/locations/index.vue` | Modified | `canDeleteLocation` computed + gated delete UI |
| `layers/ops/components/location/LocationNotesModal.vue` | Modified | `canDeleteNote()` + import `usePropertyState` + name display fix |
| `layers/ops/pages/office/inventory/index.vue` | Modified | `canDeleteAttachment()` + `canDeleteItem()` + gated delete buttons |
| `layers/ops/composables/useLocationNotes.ts` | Modified | Batch profile lookup, `creator_name` on notes, interface update |
