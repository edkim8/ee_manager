# Amenities System: Full Audit & Status

**Date:** 2026-02-06
**Status:** 🔄 IN PROGRESS (Tables exist, code ready, verification needed)

---

## ✅ **CONFIRMED UNDERSTANDING**

### **System Purpose:**
Enable property-level amenity pricing management and automated rent calculation based on Yardi data.

### **Data Flow:**
```
1. Upload Amenities Library
   5p_AmenitiesList.xlsx → Parser → amenities table
   (Property-level pricing library: yardi_code, yardi_name, amount, type)

2. Upload Availabilities (Daily Solver)
   5p_Availables.xlsx → Parser → import_staging
   ↓
   Solver Phase 2C (Availabilities Processing)
   ↓
   availabilities.amenities (JSONB) ← Raw string: "Washer/Dryer<br>Balcony<br>Pet Fee"
   ↓
   syncUnitAmenities() function (useSolverEngine.ts:74-178)
   ↓
   Parse fragments → Reconcile amenities library → Sync unit_amenities table
   ↓
   unit_amenities (active linkage with audit trail)

3. Pricing Calculation
   view_unit_pricing_analysis (SQL view)
   ↓
   Base Rent (floor_plans.market_base_rent)
   + Sum(Fixed Amenities)
   = Market Rent

   Market Rent
   + Sum(Premium Amenities - positive)
   + Sum(Discount Amenities - negative)
   = Rent Offered
```

---

## 📊 **CURRENT DATABASE STATE**

### **Tables:** ✅ EXIST (User confirmed)
1. **`amenities`** - Global property-level pricing library
   - Columns: property_code, yardi_code, yardi_name, yardi_amenity, amount, type, active
   - Unique constraint: (property_code, yardi_code, yardi_name, yardi_amenity)
   - Purpose: Define pricing for each amenity per property

2. **`unit_amenities`** - Unit-specific linkage table
   - Columns: unit_id, amenity_id, user_id, comment, active, created_at, updated_at
   - Unique constraint: (unit_id, amenity_id) WHERE active = true
   - Purpose: Track which amenities are active on each unit

### **Views:**
1. **`view_unit_pricing_analysis`** - Per-unit pricing breakdown
   - Columns: unit_id, base_rent, fixed_amenities_total, calculated_market_rent, temp_amenities_total, calculated_offered_rent

2. **`view_amenities_usage`** - Amenity usage statistics (optional, may not be applied yet)

3. **`view_floor_plan_pricing_summary`** - Floor plan level aggregations

---

## 🔧 **CODE AUDIT**

### **1. Solver Integration** ✅ READY

**File:** `layers/admin/composables/useSolverEngine.ts`

**Function:** `syncUnitAmenities()` (Lines 74-178)
- ✅ Parses amenities JSONB string (split by `<br>`)
- ✅ Reconciles global amenities library (auto-creates missing with amount=0, type='Fixed')
- ✅ Syncs unit_amenities (insert new, reactivate existing, deactivate removed)
- ✅ Handles reactivation (if amenity comes back in report)
- ✅ Property-scoped (only affects amenities for current property)

**Called From:** Line 922 (Phase 2C - Availabilities processing)
```typescript
if (row.amenities) {
    await syncUnitAmenities(unitId, row.amenities, pCode!)
}
```

**Status:** ✅ Code is correct and ready

---

### **2. Pricing Calculation** ✅ LOGIC READY

**SQL View:** `view_unit_pricing_analysis`
```sql
-- Current Formula:
Base Rent (floor_plans.market_base_rent)
+ Fixed Amenities (type = 'fixed')
= Market Rent

Market Rent
+ Temp Amenities (type != 'fixed')
= Offered Rent
```

**User's Required Formula:**
```
Base Rent
+ Sum(Fixed Amenities)
= Market Rent

Market Rent
+ Sum(Premium Amenities - positive)
+ Sum(Discount Amenities - negative)
= Rent Offered
```

**Analysis:**
- Current view uses `type = 'fixed'` vs `type != 'fixed'`
- User wants: Fixed, Premium (positive), Discount (negative)
- **ACTION NEEDED:** Update amenities.type to support 3 types: 'Fixed', 'Premium', 'Discount'

---

### **3. Amenity Types** ⚠️ NEEDS CLARIFICATION

**Current Schema (migration):**
```sql
type TEXT NOT NULL, -- 'Fixed', 'Premium', 'Discount'
```

**Current Code (syncUnitAmenities line 113):**
```typescript
type: 'Fixed'  // Default when auto-creating from Yardi string
```

**Current View (line 9):**
```sql
CASE WHEN a.type = 'fixed' THEN a.amount ELSE 0 END
```

**Issue:** Case sensitivity mismatch!
- Schema/Code uses: `'Fixed'` (capitalized)
- View uses: `'fixed'` (lowercase)

**ACTION NEEDED:**
1. Decide on case: 'Fixed' vs 'fixed'
2. Update view to match
3. Ensure amenities uploaded have correct type values

---

## 🎯 **ISSUES TO FIX**

### **Issue 1: Type Case Mismatch** 🔴 CRITICAL
**Problem:** Views use lowercase `'fixed'`, code uses capitalized `'Fixed'`

**Impact:** Fixed amenities won't be summed correctly in pricing calculations

**Fix:**
```sql
-- Update view to use capitalized types
CASE WHEN a.type = 'Fixed' THEN a.amount ELSE 0 END
```

---

### **Issue 2: TypeScript Types Missing** 🟡 MEDIUM
**Problem:** `amenities` and `unit_amenities` tables not in `types/supabase.ts`

**Impact:** No type safety when querying these tables

**Fix:**
```bash
npx supabase gen types typescript --linked > types/supabase.ts
```

---

### **Issue 3: Pricing Formula Specificity** 🟡 MEDIUM
**Problem:** View groups all non-Fixed as "temp", but user wants Premium vs Discount distinction

**Current:**
```sql
SUM(CASE WHEN a.type != 'fixed' THEN a.amount ELSE 0 END) as total_temp_amenities
```

**User Wants:**
```sql
-- Separate Premium and Discount
SUM(CASE WHEN a.type = 'Premium' THEN a.amount ELSE 0 END) as total_premium,
SUM(CASE WHEN a.type = 'Discount' THEN a.amount ELSE 0 END) as total_discount
```

**Fix:** Update `view_unit_pricing_analysis` to separate Premium/Discount

---

### **Issue 4: Base Rent Population** 🟢 LOW (Verify)
**Problem:** `floor_plans.market_base_rent` may be NULL for many floor plans

**Impact:** Pricing calculations will show $0 base rent

**Verification Needed:**
```sql
SELECT COUNT(*) as total,
       COUNT(market_base_rent) as has_base_rent,
       COUNT(*) - COUNT(market_base_rent) as missing_base_rent
FROM floor_plans;
```

**Fix (if needed):** Populate `market_base_rent` from availabilities or manual entry

---

## ✅ **WHAT'S WORKING**

1. ✅ Tables exist and have data (user confirmed)
2. ✅ Solver integration code is complete and correct
3. ✅ Property-scoped amenity reconciliation
4. ✅ Auto-creation of missing amenities with defaults
5. ✅ Reactivation/deactivation logic for snapshot sync
6. ✅ Views are created (though need updates)
7. ✅ Pricing engine utility exists (`layers/ops/utils/pricing-engine.ts`)

---

## 🔨 **IMMEDIATE ACTION ITEMS**

### **Priority 1: Fix Type Case Mismatch**
Update `view_unit_pricing_analysis` to use capitalized types to match schema

### **Priority 2: Separate Premium/Discount**
Update pricing view to distinguish Premium (positive) from Discount (negative)

### **Priority 3: Generate TypeScript Types**
Run type generation to add amenities tables to `types/supabase.ts`

### **Priority 4: Verify Data**
- Check amenities table has correct type values ('Fixed', 'Premium', 'Discount')
- Check floor_plans.market_base_rent is populated
- Test syncUnitAmenities on a sample unit

### **Priority 5: Pricing Verification Test**
- Pick a sample unit
- Manually calculate: Base + Fixed = Market, Market + Premium + Discount = Offered
- Compare to view_unit_pricing_analysis output
- Verify rent_offered matches Yardi's rent_offered

---

## 📝 **FILES TO UPDATE**

1. **`supabase/migrations/20260205000001_amenities_pricing_views.sql`**
   - Fix: Change `'fixed'` → `'Fixed'`
   - Fix: Separate temp_amenities into premium + discount

2. **`supabase/migrations/20260206000002_update_pricing_view.sql`**
   - Same fixes as above

3. **`types/supabase.ts`**
   - Regenerate to include amenities and unit_amenities

4. **`layers/admin/composables/useSolverEngine.ts`**
   - No changes needed (already correct)

---

## 🧪 **TESTING PLAN**

### **Step 1: Verify Table Data**
```sql
-- Check amenities library
SELECT property_code, type, COUNT(*), SUM(amount) as total_pricing
FROM amenities
GROUP BY property_code, type;

-- Check unit_amenities linkage
SELECT COUNT(*) as total_links,
       COUNT(*) FILTER (WHERE active = true) as active_links
FROM unit_amenities;
```

### **Step 2: Test Pricing View**
```sql
-- Sample unit pricing
SELECT * FROM view_unit_pricing_analysis
WHERE property_code = 'RS' LIMIT 5;
```

### **Step 3: Compare Yardi vs Calculated**
```sql
-- Compare offered rent
SELECT
    a.unit_name,
    a.rent_offered as yardi_offered,
    v.calculated_offered_rent,
    (a.rent_offered - v.calculated_offered_rent) as difference
FROM availabilities a
JOIN view_unit_pricing_analysis v ON a.unit_id = v.unit_id
WHERE a.property_code = 'RS' AND a.is_active = true
LIMIT 10;
```

### **Step 4: Test Solver Sync**
- Run Solver with 5p_Availables
- Check console logs for amenity sync messages
- Verify unit_amenities table updated correctly
- Check for any 400/409 errors (should be gone now)

---

## 🎯 **SUCCESS CRITERIA**

- ✅ No 400 Bad Request errors on amenities queries
- ✅ No 409 Conflict errors on unit_amenities inserts
- ✅ Pricing view returns correct Market Rent = Base + Fixed
- ✅ Pricing view returns correct Offered Rent = Market + Premium + Discount
- ✅ Calculated rent_offered matches Yardi's rent_offered (within $5-10 tolerance)
- ✅ TypeScript types include amenities tables
- ✅ Solver successfully syncs amenities on each run

---

**Next Steps:** Apply fixes and run verification tests
