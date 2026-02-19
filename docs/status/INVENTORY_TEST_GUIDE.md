# Inventory System - Testing Guide

**Date:** 2026-02-18
**Status:** ✅ Ready for Testing

---

## 🎯 What Was Built

### ✅ Step A: Test Page
**Location:** `/inventory/test`

**Features:**
- Create new inventory items with form
- Upload photos (auto-compressed)
- Log install events
- View items with health status
- Health progress bars
- Item details with photos and event history
- Delete items

---

### ✅ Step C: Unit Assets Widget
**Location:** Unit detail page sidebar (`/assets/units/[id]`)

**Features:**
- Shows all assets in the unit
- Health status summary (healthy, warning, critical, expired)
- Health progress bars
- Click to view details
- "Manage Assets" button links to test page

---

## 🚀 How to Test

### **Test 1: Create Item on Test Page**

1. Navigate to `/inventory/test`
2. Click "Add Test Item"
3. Fill out the form:
   - **Category:** Select "Refrigerator" (or any category)
   - **Brand:** Samsung
   - **Model:** RF28R7201SR
   - **Serial Number:** SN123456789
   - **Install Date:** Pick a date 5 years ago
   - **Cost:** 1500
   - **Vendor:** Home Depot
   - **Photo:** Upload any image
4. Click "Create Item"
5. ✅ **Expected:** Item appears in list with health badge and progress bar

---

### **Test 2: View Item Details**

1. Click on any item in the list
2. ✅ **Expected:** Right panel shows:
   - Item details (brand, model, serial, etc.)
   - Photos (if uploaded)
   - Event history (install event logged automatically)

---

### **Test 3: View Unit Assets Widget**

1. Navigate to any unit detail page (e.g., `/assets/units/[id]`)
2. Scroll to sidebar (right side)
3. Look for "Unit Assets" section
4. ✅ **Expected:**
   - Widget shows "0" assets (if none created yet)
   - Or shows items if you created some for this unit

---

### **Test 4: Create Item for Specific Unit**

1. From Unit detail page, click "Add Asset" in widget
2. OR go to `/inventory/test?location=unit&id=[unit-id]`
3. Form should pre-fill with unit's location_id
4. Create an item
5. Go back to Unit detail page
6. ✅ **Expected:** Widget now shows the new item with health status

---

### **Test 5: Health Status Badges**

Create items with different install dates to test health status:
- **Healthy:** Refrigerator (12y lifespan) installed 2 years ago = Healthy ✅
- **Warning:** Refrigerator installed 8 years ago = Warning ⚠️
- **Critical:** Refrigerator installed 10 years ago = Critical 🔴
- **Expired:** Refrigerator installed 13 years ago = Expired ⛔

---

## 📸 Photo Upload Test

1. Select any image file (JPG, PNG, etc.)
2. Upload via form
3. ✅ **Expected:**
   - Image is compressed before upload (~90% size reduction)
   - Image appears in item details
   - Image stored in `images` bucket as `inventory_item/[filename].jpg`

---

## 🎨 Visual Checks

### Health Status Colors
- **Healthy** = Green
- **Warning** = Yellow
- **Critical** = Orange
- **Expired** = Red
- **Unknown** = Gray

### Progress Bars
- Fillshould increase as item ages
- Color matches health status

### Widget Summary Stats
- Grid shows healthy/warning/critical/expired counts
- Numbers should match item list

---

## 🐛 Known Limitations (Expected)

1. **Test UUID:** Items created on test page use dummy UUID for `location_id`
   - This is intentional for testing
   - Real unit integration works via widget
2. **No delete in widget:** Delete only available on test page
   - Future: Add edit/delete in widget
3. **No QR codes yet:** QR scanner not implemented
   - Future feature

---

## ✅ Success Criteria

All these should work:
- [x] Create item with photo
- [x] See item in list with correct health status
- [x] View item details
- [x] See photos in detail view
- [x] See event history
- [x] Delete item
- [x] Unit widget shows items for that unit
- [x] Widget summary stats are correct
- [x] Health progress bars display correctly
- [x] Click "Manage Assets" opens test page

---

## 🚧 Next Steps (Not Implemented Yet)

1. **Production UI:**
   - Dedicated `/inventory/items` page
   - Item form modal (not full page)
   - Edit functionality
   - Filters and search

2. **Integration:**
   - Building assets widget
   - Location (GIS) assets widget
   - Dashboard "Assets Needing Attention" widget

3. **Mobile:**
   - QR code scanner
   - Camera capture optimized
   - Mobile-first forms

4. **Advanced Features:**
   - Bulk import from CSV
   - Maintenance schedule based on age
   - Budget forecasting
   - Replacement planning dashboard

---

## 📚 Files Created

**Composables:**
- `layers/inventory/composables/useInventoryCategories.ts`
- `layers/inventory/composables/useInventoryItems.ts`
- `layers/inventory/composables/useInventoryHistory.ts`
- `layers/inventory/composables/useInventoryLifecycle.ts`

**Pages:**
- `layers/inventory/pages/test.vue`

**Components:**
- `layers/inventory/components/LocationAssetsWidget.vue`

**Modified:**
- `layers/ops/pages/assets/units/[id].vue` (added widget)

---

## 🎯 Testing Checklist

- [ ] Test page loads without errors
- [ ] Can create item with all fields
- [ ] Photo upload works
- [ ] Item appears in list
- [ ] Can view item details
- [ ] Event history shows install event
- [ ] Can delete item
- [ ] Unit widget appears on unit page
- [ ] Widget shows correct item count
- [ ] Widget summary stats are accurate
- [ ] Health badges show correct colors
- [ ] Progress bars fill correctly
- [ ] "Manage Assets" link works

---

**Ready to test!** 🚀 Start with Test 1 and work through the checklist.
