# Inventory Management Testing Checklist
*Created: 2026-02-18*

## Overview
Testing the new Inventory Management system with redesigned catalog pattern.

**URL:** http://localhost:3001/inventory

## Components Verified
- ✅ Migration: `20260218000001_redesign_inventory_catalog_pattern.sql`
- ✅ Composable: `useInventoryCategories.ts`
- ✅ Composable: `useInventoryItemDefinitions.ts`
- ✅ Composable: `useAttachments.ts`
- ✅ Page: `layers/ops/pages/inventory/index.vue`
- ✅ Dev server running on port 3001

## Test Scenarios

### 1. Categories Management
**Location:** Inventory → Categories Tab

- [ ] Click "Add Category" button
- [ ] Fill in form:
  - Name: "Refrigerators"
  - Description: "Kitchen refrigerators and freezers"
  - Expected Life: 15 years
- [ ] Submit form → Verify category appears in table
- [ ] Click "Edit" on category
- [ ] Modify description → Save → Verify changes persist
- [ ] Verify "Delete" button works (with confirmation)

### 2. Items Management - Add New
**Location:** Inventory → Items Tab

- [ ] Click "Add Item" button
- [ ] Fill in form:
  - Category: Select "Refrigerators"
  - Brand: "Samsung"
  - Model: "RF28R7201SR"
  - Manufacturer Part Number: "RF28R7201SR/AA"
  - Description: "French door refrigerator with water dispenser"
  - Notes: "Standard model for all units"
- [ ] Submit → Verify item appears in grid view
- [ ] Verify item card shows:
  - Category name (small gray text)
  - Brand (large bold text)
  - Model (gray text)
  - Description (truncated if long)
  - Part number with # prefix

### 3. Items Management - Edit Existing
**Location:** Click on any item card

- [ ] Click item card → Modal opens with pre-filled data
- [ ] Modify brand/model → Save → Verify changes appear in grid
- [ ] Verify photo upload section appears (only when editing)
- [ ] Verify document upload section appears (only when editing)

### 4. Photo Upload
**Location:** Edit Item Modal → Photos Section

- [ ] Upload a photo (JPEG/PNG)
- [ ] Verify image appears in thumbnail grid
- [ ] Verify photo count badge appears on item card (📸 1)
- [ ] Hover over thumbnail → Verify red X delete button appears
- [ ] Click delete → Verify photo is removed
- [ ] Verify image is auto-compressed (check console logs)

### 5. Document Upload
**Location:** Edit Item Modal → Documents Section

- [ ] Upload a document (PDF/DOC/DOCX)
- [ ] Verify document appears in list with filename
- [ ] Verify document count badge appears on item card (📄 1)
- [ ] Click document link → Opens in new tab
- [ ] Click "Delete" → Verify document is removed

### 6. Filtering & Search
**Location:** Items Tab

- [ ] Create items in multiple categories
- [ ] Use category dropdown filter → Verify only matching items show
- [ ] Select "All Categories" → Verify all items return
- [ ] Type in search box: "Samsung"
- [ ] Verify search filters by brand/model/description
- [ ] Clear search → Verify all items return

### 7. Edge Cases
- [ ] Try adding item without selecting category → Verify validation
- [ ] Try adding category without name → Verify validation
- [ ] Try deleting category with items → Verify behavior
- [ ] Verify dark mode styling works correctly
- [ ] Verify responsive layout (resize browser window)

## Expected Database Tables
```
inventory_categories
  - id (UUID)
  - name (TEXT)
  - description (TEXT)
  - expected_life_years (INTEGER)
  - is_active (BOOLEAN)
  - created_at, updated_at

inventory_item_definitions (Master Catalog)
  - id (UUID)
  - category_id (UUID → inventory_categories)
  - brand (TEXT)
  - model (TEXT)
  - manufacturer_part_number (TEXT)
  - description (TEXT)
  - notes (TEXT)
  - is_active (BOOLEAN)
  - created_by (UUID)
  - created_at, updated_at

attachments (Existing table, reused)
  - record_id → inventory_item_definitions.id
  - record_type = 'inventory_item_definition'
  - file_type = 'image' | 'document'
  - file_url, file_name, file_size, mime_type
```

## View
```sql
view_inventory_item_definitions
  - Joins item definitions with categories
  - Includes photo_count and document_count
  - Filters by is_active = true
```

## Known Limitations (Future Phase)
- Physical installations table not yet implemented
- No serial number tracking (installations feature)
- No install date tracking (installations feature)
- No location assignment (installations feature)

## Success Criteria
- ✅ All categories CRUD operations work
- ✅ All items CRUD operations work
- ✅ Photo upload/delete works with auto-compression
- ✅ Document upload/delete works
- ✅ Filtering by category works
- ✅ Search by brand/model/description works
- ✅ No console errors
- ✅ Dark mode works correctly
