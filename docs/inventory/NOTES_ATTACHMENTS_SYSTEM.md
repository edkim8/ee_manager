# Notes & Attachments System
*Implemented: 2026-03-13*

## Overview

The EE Manager uses a **unified polymorphic notes and attachments system** that works across all modules. Any record type (installations, locations, work orders, etc.) can have notes and file attachments without adding new database tables.

---

## Database Tables

### `notes`
Stores notes for any record in the system.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `record_id` | UUID | ID of the parent record |
| `record_type` | TEXT | Module identifier (`installation`, `location`, etc.) |
| `note_text` | TEXT | The note content |
| `category` | TEXT | Category value (from config) |
| `cost` | NUMERIC(10,2) | Optional cost associated with this note |
| `vendor` | TEXT | Optional vendor/contractor name |
| `created_by` | UUID | `profiles.id` of author |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

### `attachments`
Stores file references for any record, including notes.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `record_id` | UUID | ID of the parent record |
| `record_type` | TEXT | `note`, `inventory_item_definition`, etc. |
| `file_url` | TEXT | Supabase storage URL |
| `file_type` | TEXT | `image` or `document` |
| `file_name` | TEXT | Display name |

**Note attachments** use `record_type = 'note'` and `record_id = note.id` — no separate attachment tables ever needed.

### `note_category_configs`
Admin-editable categories stored per record type.

| Column | Type | Description |
|---|---|---|
| `record_type` | TEXT | Primary key |
| `categories` | JSONB | Ordered array of category values |
| `updated_at` | TIMESTAMPTZ | Auto-updated |
| `updated_by` | UUID | Last editor |

**Example row:**
```json
{ "record_type": "installation", "categories": ["general", "service", "repair", "inspection", "warranty_claim"] }
```

---

## Category System

Categories are stored as snake_case strings in the DB and auto-converted to Title Case labels for display.

**Examples:** `warranty_claim` → "Warranty Claim", `hvac_service` → "Hvac Service"

### Seeded Defaults

| Record Type | Default Categories |
|---|---|
| `installation` | general, service, repair, inspection, warranty_claim |
| `location` | inspection, repair_replacement, incident, maintenance, update |

### Admin Management

**Page:** `/admin/note-categories`

Features:
- View all record types with per-category usage counts
- Detect orphaned categories (used in notes but removed from config) — shown in amber
- Rename category: option to update all existing notes or leave orphaned
- Delete category: option to delete matching notes or leave orphaned
- Reorder categories with up/down arrows
- Add new categories (normalised to lowercase snake_case)
- Add entirely new record types (starts with `['general']`)

---

## Composable: `useNotes`

**Location:** `layers/base/composables/useNotes.ts`

```typescript
const {
  fetchCategories,
  fetchNotes,
  addNote,
  updateNote,
  deleteNote,
  getNoteCount,
  addNoteAttachment,
  deleteNoteAttachment,
} = useNotes()
```

### `fetchCategories(recordType)`
Returns `{ value, label }[]` from `note_category_configs`. Falls back to `[{ value: 'general', label: 'General' }]` if no config row exists.

### `fetchNotes(recordId, recordType)`
Returns notes with attachments array and creator display name resolved from `profiles`.

### `addNote(recordId, recordType, noteText, category, options?)`
Options: `{ cost?: number, vendor?: string }`. Trims whitespace-only vendor to null.

### `deleteNote(noteId)`
Hybrid purge: fetches attachments from `attachments` table, deletes storage files (best-effort), deletes attachment records, deletes note.

### `addNoteAttachment(noteId, file, fileType)`
Delegates to `useAttachments.addAttachment(noteId, 'note', file, fileType)`.

---

## Adding Notes to a New Module

1. Determine your `record_type` string (e.g., `'work_order'`)
2. Use `useNotes()` in your component
3. Call `fetchCategories('work_order')` — falls back gracefully if no config
4. The admin can add a new record type row via `/admin/note-categories` to configure custom categories
5. No new database tables or migrations needed

---

## Migration History

| Migration | Description |
|---|---|
| `20260313000002_consolidate_notes_polymorphic.sql` | Creates `notes` + `note_category_configs`; migrates `location_notes` + `inventory_notes`; migrates note attachments into `attachments` table; drops legacy tables |
| `20260313000003_notes_add_cost_vendor.sql` | Adds `cost` and `vendor` columns to `notes` |

---

## Server API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/note-categories` | All configs + per-category usage counts |
| PUT | `/api/note-categories/:type` | Upsert categories array for a record type |
| POST | `/api/note-categories/:type/rename` | Rename category; optionally update matching notes |
| POST | `/api/note-categories/:type/delete-category` | Remove category; optionally delete matching notes |

---

## Tests

| File | Coverage |
|---|---|
| `tests/unit/base/composables/useNotes.test.ts` | fetchCategories, addNote, getNoteCount, deleteNote, addNoteAttachment, deleteNoteAttachment |
| `tests/unit/server/api/note-categories/index.get.test.ts` | Usage count aggregation, empty state, DB error |
| `tests/unit/server/api/note-categories/rename.post.test.ts` | Rename preserving order, updateNotes flag, 400/404 errors |
| `tests/unit/server/api/note-categories/delete-category.post.test.ts` | Remove from array, deleteNotes flag, 400/404 errors |
