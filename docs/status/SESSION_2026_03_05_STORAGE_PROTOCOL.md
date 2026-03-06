# Session Summary: Storage Protocol V1.0 Implementation
**Date:** 2026-03-05
**Branch:** chore/daily-audit-2026-03-05
**Commit:** `3cdf8f3`

---

## Objective

Execute the first Dry Run audit of storage health per the new Deletion & Cleanup Protocol (V1.0), verify Best-Effort purge implementations in the ops composables, and resolve all identified issues.

---

## Work Completed

### 1. Storage Orphan Scanner — Bug Fix
**File:** `scripts/storage_orphan_scanner.ts:46`

**Bug:** Folder-detection used `item.id === undefined`. Supabase Storage returns `id: null` for folder prefixes, not `undefined`. The `if` branch (recursive folder listing) was never entered. All top-level items (folders) fell through to the `else` branch and were treated as root-level files, then compared against DB URLs and reported as orphans.

**Result before fix:** 7 false positives (folder names reported as orphaned files). Real files — never scanned.

**Fix:** `item.id === undefined` → `item.id === null`

**Result after fix:** 87 real files scanned across both buckets. 7 true orphans identified.

---

### 2. Scanner — Structural Violation Warning
**File:** `scripts/storage_orphan_scanner.ts` (inner folder loop)

Added a `null`-id check at the level-2 listing. If a sub-folder is detected inside a folder, the scanner now emits a named `STRUCTURAL VIOLATION` warning and skips the sub-folder (rather than misreporting it as an orphaned file). This enforces the 2-level depth rule at runtime.

---

### 3. Deletion & Cleanup Protocol — Storage Structure Rules (§3)
**File:** `docs/governance/DELETION_CLEANUP_PROTOCOL.md`

Added §3 Storage Structure Rules:
- **Max depth:** `{bucket}/{folder}/{filename}` — no sub-folders permitted.
- Documented correct vs. prohibited path examples.
- Explained enforcement mechanism (scanner STRUCTURAL VIOLATION warning).
- Flagged the known `renewal-templates` violation as a tracked follow-up.

---

### 4. First Dry-Run Audit
**File:** `docs/status/STORAGE_AUDIT_2026_03_05.md`

Findings:
- `images` bucket: 4 orphaned `.jpg` files in `location-notes/` and `locations/`
- `documents` bucket: 3 orphaned `.pdf` files in `location-notes/`
- Root cause: `deleteLocationNote` was missing a storage purge step — every note deletion guaranteed orphaned files.
- `renewal-templates/letterheads/` and `renewal-templates/docx/` flagged as structural violations (sub-folders).

---

### 5. Live Purge — Executed
**Mode:** `--dry-run=false`

- **4 orphaned images** purged from `images` bucket
- **3 orphaned documents** purged from `documents` bucket
- Total: **7 files deleted**, storage fully clean (within scanned depth)

---

### 6. `useLocationNotes.deleteLocationNote` — Best-Effort Purge Fix
**File:** `layers/ops/composables/useLocationNotes.ts`

**Bug:** `deleteLocationNote` issued the DB delete directly, relying on cascade to remove `location_note_attachments` rows — but never called `storage.remove()`. Every note deletion created guaranteed orphaned storage files.

**Fix:** Added the correct collect → remove(storage) → delete(db) pattern:
1. Fetch all `location_note_attachments` for the note
2. Group by `file_type` → derive bucket (`images` / `documents`)
3. Call `storage.remove([...paths])` in `try/catch` (Best-Effort — failure logs and continues)
4. DB delete proceeds regardless (cascade removes attachment rows)

Also removed dead code: unused `auth.getUser()` call, unused `note.created_by` fetch, and empty `if/else` blocks.

---

### 7. Location Delete — Mobile Fix
**File:** `layers/ops/pages/assets/locations/index.vue`

**Bug:** `handleDelete` used `window.confirm()` for confirmation and `window.alert()` for errors. Both are suppressed on iOS PWA/standalone mode — `confirm()` returns `false` silently (delete aborts), and errors are invisible.

**Fix:** Replaced both native dialogs with in-modal UI:
- **Delete button** → sets `showDeleteConfirm = true` (inline confirmation section appears)
- **"Yes, Delete"** → fires `handleDelete()`
- **Errors** → rendered as a red error box inside the modal with the actual error message
- **"Cancel"** → collapses confirmation, no action taken

No native browser dialogs used anywhere in the delete flow.

---

### 8. `renewal-templates` Upload Paths — Flattened
**File:** `layers/ops/pages/office/renewal-templates.vue`

**Bug:** Letterhead and DOCX uploads used sub-folder paths, violating the 2-level depth rule and making those files invisible to the Orphan Scanner.

| Before | After |
|---|---|
| `images/renewal-templates/letterheads/{code}.{ext}` | `images/renewal-templates/{code}-letterhead.{ext}` |
| `documents/renewal-templates/docx/{code}_Renewal_Letter_Template.docx` | `documents/renewal-templates/{code}_Renewal_Letter_Template.docx` |

Since the public URL is stored directly in the DB (`renewal_letter_templates.letterhead_url` / `docx_template_url`), no server or schema changes were required. New uploads go to the correct flat paths immediately.

**Residual:** Existing files in the old sub-folders remain DB-referenced until each property re-uploads their template. They will clear naturally. The scanner will continue to emit STRUCTURAL VIOLATION warnings until the old sub-folders are empty.

---

## Storage Health Status (Post-Session)

| Bucket | Files Scanned | Orphans | Status |
|---|---|---|---|
| `images` | 83 | 0 | Clean |
| `documents` | 3 | 0 | Clean |
| `images/renewal-templates/letterheads/` | Not scanned (sub-folder) | Unknown | Residual violation |
| `documents/renewal-templates/docx/` | Not scanned (sub-folder) | Unknown | Residual violation |

---

## Outstanding Items

| Item | Priority | Notes |
|---|---|---|
| `renewal-templates` sub-folder cleanup | Low | Clears naturally as properties re-upload templates |
| `useLocationNotes.ts` line 194 — unused `data` variable | Low | Pre-existing lint hint, not introduced this session |

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `docs/governance/DELETION_CLEANUP_PROTOCOL.md` | New | Protocol V1.0 + §3 Storage Structure Rules |
| `scripts/storage_orphan_scanner.ts` | New | Orphan scanner with folder-detection fix + violation warnings |
| `docs/status/STORAGE_AUDIT_2026_03_05.md` | New | First audit report |
| `layers/ops/composables/useLocationNotes.ts` | Modified | Best-Effort purge in `deleteLocationNote` |
| `layers/ops/composables/useLocationService.ts` | Modified | Pre-existing Best-Effort purge (verified compliant, no change) |
| `layers/ops/pages/assets/locations/index.vue` | Modified | Inline delete confirm UI (replaces native dialogs) |
| `layers/ops/pages/office/renewal-templates.vue` | Modified | Flattened upload paths |
