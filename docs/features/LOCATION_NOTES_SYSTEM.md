# Location Notes System - Complete Implementation

## 🎯 Overview

A comprehensive notes system for location markers allowing multiple notes per location with photo and document attachments.

## 📊 Database Schema

### Tables Created

#### 1. `location_notes` (Main notes table)
```sql
- id (UUID PK)
- location_id (UUID FK → locations)
- note_text (TEXT) - The note content
- category (TEXT) - inspection | repair_replacement | incident | maintenance | update
- created_by (UUID FK → auth.users)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 2. `location_note_attachments` (File attachments)
```sql
- id (UUID PK)
- note_id (UUID FK → location_notes)
- file_url (TEXT) - Public URL to file
- file_type (TEXT) - 'image' or 'document'
- file_name (TEXT)
- file_size (BIGINT)
- mime_type (TEXT)
- uploaded_by (UUID FK → auth.users)
- uploaded_at (TIMESTAMPTZ)
```

#### 3. `location_notes_summary` (View)
Aggregated view showing:
- Total notes per location
- Total attachments per location
- Last note date
- Category breakdown

### Relationships
```
locations (1) ──→ (N) location_notes (1) ──→ (N) location_note_attachments
```

### Security (RLS Policies)
- ✅ Any authenticated user can **read** all notes
- ✅ Any authenticated user can **create** notes
- ✅ Users can **update** their own notes
- ✅ Users can **delete** their own notes
- ✅ Attachments follow same pattern

## 🎨 UI Components

### 1. LocationNotesModal.vue
**Path:** `layers/ops/components/location/LocationNotesModal.vue`

**Features:**
- List all notes for a location (reverse chronological)
- Add new note with category selection
- Attach multiple photos/documents per note
- Delete notes (with confirmation)
- View attachments inline (images) or as links (documents)

**Props:**
- `modelValue` (boolean) - Controls modal visibility
- `locationId` (string) - The location to show notes for
- `locationName` (string, optional) - Display name in title

### 2. useLocationNotes Composable
**Path:** `layers/ops/composables/useLocationNotes.ts`

**Methods:**
- `fetchLocationNotes(locationId)` - Get all notes with attachments
- `addLocationNote(locationId, noteText, category)` - Create note
- `updateLocationNote(noteId, updates)` - Edit note
- `deleteLocationNote(noteId)` - Delete note (cascades to attachments)
- `addNoteAttachment(noteId, file, fileType)` - Upload and attach file
- `deleteNoteAttachment(attachmentId)` - Remove attachment
- `getLocationNoteCount(locationId)` - Get count of notes

## 🎯 User Flow

### Adding a Note

1. **Navigate to location**
   - Go to `/assets/locations`
   - Select property
   - Click location in list

2. **Open notes**
   - Click "View Notes" button in detail modal
   - Notes modal opens

3. **Add note**
   - Click "Add Note" button
   - Select category from dropdown:
     - Inspection
     - Repair/Replacement
     - Incident
     - Maintenance
     - Update
   - Enter note text
   - (Optional) Attach files:
     - Multiple photos (.jpg, .png, etc.)
     - Multiple documents (.pdf, .doc, .docx)
   - Click "Save Note"

4. **View result**
   - Note appears at top of list
   - Attachments shown below note
   - Images display inline
   - Documents show as download links

### Viewing Notes

**From Location Detail:**
```
Location List → Click location → Click "View Notes" → Notes Modal
```

**Future: From Map (Coming Soon):**
```
Map → Click marker → Info window → Click "View Notes" → Notes Modal
```

## 📁 File Storage

### Images (Photos)
- **Bucket:** `images`
- **Folder:** `location-notes/`
- **Access:** Public read
- **Size Limit:** 20MB per file

### Documents (PDFs, etc.)
- **Bucket:** `documents`
- **Folder:** `location-notes/`
- **Access:** Authenticated only
- **Size Limit:** 50MB per file

## 🧪 Testing Checklist

### Database
- [ ] Run migration: `npx supabase db push` or via SQL Editor
- [ ] Verify tables exist: `location_notes`, `location_note_attachments`
- [ ] Verify view exists: `location_notes_summary`
- [ ] Check RLS policies are enabled

### UI - Add Note
- [ ] Can open notes modal from location detail
- [ ] Can select all 5 categories
- [ ] Can enter note text
- [ ] Can attach multiple photos
- [ ] Can attach multiple documents
- [ ] Can mix photos and documents
- [ ] Save button creates note successfully

### UI - View Notes
- [ ] Notes display in reverse chronological order (newest first)
- [ ] Category badges show correct color
- [ ] Date/time displays correctly
- [ ] Note text displays with line breaks preserved
- [ ] Image attachments show inline thumbnails
- [ ] Document attachments show as clickable links
- [ ] Can click images to view full size (new tab)
- [ ] Can download documents

### UI - Delete Note
- [ ] Delete button only shows for own notes
- [ ] Confirmation dialog appears
- [ ] Deleting note removes it from list
- [ ] Deleting note also deletes attachments
- [ ] Cannot delete other users' notes

### Permissions
- [ ] Must be authenticated to add notes
- [ ] Any authenticated user can view all notes
- [ ] Can only edit/delete own notes
- [ ] Attempting to delete others' notes shows error

## 🚀 Deployment Steps

### 1. Apply Database Migration

**Option A: Supabase Dashboard**
```sql
-- Copy contents of:
-- supabase/migrations/20260208180000_location_notes_system.sql
-- Paste into SQL Editor
-- Click "Run"
```

**Option B: Supabase CLI**
```bash
npx supabase db push
```

### 2. Verify Storage Buckets
- Ensure `images` bucket exists (already created)
- Ensure `documents` bucket exists (already created)
- Both should have proper RLS policies

### 3. Test in Development
```bash
npm run dev
# Navigate to /assets/locations
# Select property
# Click location
# Click "View Notes"
# Try adding a note with attachments
```

## 📊 Category Color Coding

| Category | Color | Use Case |
|----------|-------|----------|
| Inspection | Blue | Regular inspection notes |
| Repair/Replacement | Orange | Items needing repair or replacement |
| Incident | Red | Issues, damage, emergencies |
| Maintenance | Green | Routine maintenance performed |
| Update | Purple | Status updates, changes |

## 🎨 UI Screenshots (Flow)

### 1. Location Detail with "View Notes" Button
```
┌─────────────────────────────┐
│ ⚡ Electrical               │
│ 2/8/2026, 3:30 PM          │
├─────────────────────────────┤
│ [Photo Preview]             │
│                             │
│ DESCRIPTION                 │
│ Main electrical panel       │
│                             │
│ COORDINATES                 │
│ Lat: 33.4484  Lng: -112.07  │
│                             │
│ ┌─────────────────────────┐ │
│ │  📝 View Notes          │ │
│ └─────────────────────────┘ │
│                             │
│ [Delete] [Close]            │
└─────────────────────────────┘
```

### 2. Notes Modal
```
┌───────────────────────────────────────┐
│ Notes - Electrical              ✕     │
├───────────────────────────────────────┤
│ [+ Add Note]                          │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ [Inspection] 2/8/2026 3:45 PM [🗑]│ │
│ │                                   │ │
│ │ Annual inspection completed.      │ │
│ │ All circuits tested OK.           │ │
│ │                                   │ │
│ │ Attachments:                      │ │
│ │ [📷][📷][📄 Report.pdf]          │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ [Incident] 2/7/2026 9:15 AM  [🗑]│ │
│ │                                   │ │
│ │ Breaker tripped in Unit 204.      │ │
│ │ Reset successfully.                │ │
│ │                                   │ │
│ │ Attachments:                      │ │
│ │ [📷]                              │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

### 3. Add Note Form
```
┌───────────────────────────────────────┐
│ New Note                              │
├───────────────────────────────────────┤
│ Category                              │
│ [Inspection ▼]                        │
│                                       │
│ Note                                  │
│ ┌───────────────────────────────────┐ │
│ │ Enter note details...             │ │
│ │                                   │ │
│ │                                   │ │
│ └───────────────────────────────────┘ │
│                                       │
│ Attachments (Photos/Documents)        │
│ [Choose Files] 3 file(s) selected     │
│                                       │
│ [Save Note] [Cancel]                  │
└───────────────────────────────────────┘
```

## 🔮 Future Enhancements (Optional)

### Phase 2 Features
- [ ] Edit note text after creation
- [ ] Note search/filter by category
- [ ] Export notes as PDF report
- [ ] Email notification when note added
- [ ] @ mentions to tag users
- [ ] Note templates for common scenarios

### Phase 3 Features
- [ ] "Quick note" from map marker
- [ ] Voice-to-text notes (mobile)
- [ ] Before/after photo comparison
- [ ] Note scheduling/reminders
- [ ] Integration with work orders

## 📚 API Usage Examples

### Fetch Notes
```typescript
import { useLocationNotes } from '~/layers/ops/composables/useLocationNotes'

const { fetchLocationNotes } = useLocationNotes()
const notes = await fetchLocationNotes('location-uuid-here')
// Returns array of notes with attachments
```

### Add Note
```typescript
const { addLocationNote, addNoteAttachment } = useLocationNotes()

// Create note
const note = await addLocationNote(
  'location-uuid',
  'Inspection completed. All systems operational.',
  'inspection'
)

// Add attachments
const file = document.querySelector('input[type="file"]').files[0]
await addNoteAttachment(note.id, file, 'image')
```

### Delete Note
```typescript
const { deleteLocationNote } = useLocationNotes()

await deleteLocationNote('note-uuid')
// Automatically deletes all attachments too
```

## ✅ Implementation Complete

**Files Created:**
1. ✅ `supabase/migrations/20260208180000_location_notes_system.sql` - Database schema
2. ✅ `layers/ops/composables/useLocationNotes.ts` - Notes operations
3. ✅ `layers/ops/components/location/LocationNotesModal.vue` - Notes UI
4. ✅ Updated `layers/ops/pages/assets/locations/index.vue` - Integration

**Next Steps:**
1. Run the database migration
2. Test adding notes with attachments
3. Verify all categories work
4. Test delete functionality

---

**Feature:** Location Notes System
**Status:** ✅ READY TO TEST
**Date:** 2026-02-08
**Architecture:** 1-to-N notes, N-to-N attachments
