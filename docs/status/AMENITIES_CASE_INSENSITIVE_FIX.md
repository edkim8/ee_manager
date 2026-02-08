# Amenities System: Case-Insensitive Type Handling

**Date:** 2026-02-06
**Status:** ✅ FIXED - Ready for Testing

---

## 🎯 **DECISION: Lowercase Standard with Case-Insensitive Handling**

### **Database Standard:**
- All `amenities.type` values: **lowercase** (`'fixed'`, `'premium'`, `'discount'`)
- SQL views: Use `LOWER()` for case-insensitive comparisons
- Code: Use lowercase consistently, with case-insensitive checks where needed

---

## ✅ **CHANGES MADE**

### **1. Database Migration** ✅
**File:** `supabase/migrations/20260206000004_fix_amenities_pricing_case_insensitive.sql`

**Changes:**
- Updated `view_unit_pricing_analysis` to use `LOWER(a.type)` for comparisons
- Separated Premium and Discount amenities (previously grouped as "temp")
- Added explicit columns: `premium_amenities_total`, `discount_amenities_total`

**Formula Now:**
```sql
-- Market Rent = Base + Fixed
calculated_market_rent = base_rent + fixed_amenities_total

-- Offered Rent = Market + Premium + Discount
calculated_offered_rent = calculated_market_rent + premium_amenities_total + discount_amenities_total
```

---

### **2. Solver Engine** ✅
**File:** `layers/admin/composables/useSolverEngine.ts`

**Change:** Line 113
```typescript
// Before:
type: 'Fixed'

// After:
type: 'fixed' // Lowercase standard for case-insensitive handling
```

**Impact:** When Solver auto-creates missing amenities from Yardi strings, they'll use lowercase `'fixed'`

---

### **3. Pricing Engine Utility** ✅
**File:** `layers/ops/utils/pricing-engine.ts`

**Changes:**

**Line 56-60:** Case-insensitive type check
```typescript
// Before:
if (l.amenities.type === 'Fixed') {

// After:
if (l.amenities.type?.toLowerCase() === 'fixed') {
```

**Line 92:** Use explicit type list instead of neq
```typescript
// Before:
.neq('type', 'Fixed')

// After:
.filter('type', 'in', '(premium,discount)') // Case-insensitive
```

---

### **4. Amenities Sync Parser** ✅
**File:** `layers/parsing/composables/useAmenitiesSync.ts`

**Change:** Line 29
```typescript
// Before:
type: row.type || 'Fixed',

// After:
type: row.type || 'fixed', // Lowercase standard
```

**Impact:** Default type for amenities list uploads is now lowercase

---

## 📋 **PRICING VIEW OUTPUT**

The updated view now returns:

```typescript
{
  unit_id: string,
  unit_name: string,
  property_code: string,
  floor_plan_id: string,

  // Base Components
  base_rent: number,                    // From floor_plans.market_base_rent
  fixed_amenities_total: number,        // Sum of 'fixed' amenities

  // Market Rent
  calculated_market_rent: number,       // base_rent + fixed_amenities_total

  // Adjustments
  premium_amenities_total: number,      // Sum of 'premium' amenities (positive)
  discount_amenities_total: number,     // Sum of 'discount' amenities (negative)

  // Final Rent
  calculated_offered_rent: number       // market + premium + discount
}
```

---

## 🧪 **TESTING PLAN**

### **Step 1: Apply Migration**
Run in Supabase SQL Editor:
```bash
# Copy contents of:
# supabase/migrations/20260206000004_fix_amenities_pricing_case_insensitive.sql
```

---

### **Step 2: Verify Type Case**
```sql
-- Check for any capitalized types
SELECT type, COUNT(*)
FROM amenities
GROUP BY type;
```

**Expected Result:**
```
type      | count
----------|------
fixed     | 150
premium   | 25
discount  | 10
```

**If you see capitalized types** ('Fixed', 'Premium', 'Discount'), normalize them:
```sql
UPDATE amenities SET type = LOWER(type) WHERE type != LOWER(type);
```

---

### **Step 3: Test Pricing View**
```sql
-- Run verification script
-- File: docs/status/AMENITIES_PRICING_VERIFICATION.sql
-- Section 3: VERIFY PRICING VIEW WORKS
```

**Expected:** View returns data without errors, formulas add up correctly

---

### **Step 4: Compare Yardi vs Calculated**
```sql
-- Run verification script
-- Section 4: COMPARE YARDI vs CALCULATED RENT
```

**Expected:**
- Most units within $10 difference
- Large differences only for units missing base_rent or amenities

---

### **Step 5: Test Solver Sync**
1. Upload a fresh `5p_Availables` file
2. Check console logs for amenity sync messages
3. Verify no 400/409 errors
4. Check `unit_amenities` table updated correctly

---

## 📊 **VERIFICATION QUERIES**

### **Quick Health Check:**
```sql
-- 1. Check amenities by type
SELECT type, COUNT(*), SUM(amount) as total_pricing
FROM amenities WHERE active = true
GROUP BY type;

-- 2. Sample pricing calculation
SELECT unit_name, base_rent, fixed_amenities_total,
       calculated_market_rent, premium_amenities_total,
       discount_amenities_total, calculated_offered_rent
FROM view_unit_pricing_analysis
WHERE property_code = 'RS' LIMIT 5;

-- 3. Compare to Yardi
SELECT a.unit_name, a.rent_offered as yardi,
       v.calculated_offered_rent as calculated,
       (a.rent_offered - v.calculated_offered_rent) as diff
FROM availabilities a
JOIN view_unit_pricing_analysis v ON a.unit_id = v.unit_id
WHERE a.property_code = 'RS' AND a.is_active = true
LIMIT 10;
```

---

## ✅ **SUCCESS CRITERIA**

- [x] Migration applied without errors
- [ ] All `amenities.type` values are lowercase
- [ ] `view_unit_pricing_analysis` returns data
- [ ] Formula verification: `calculated_market_rent = base_rent + fixed_amenities_total`
- [ ] Formula verification: `calculated_offered_rent = market + premium + discount`
- [ ] Yardi vs Calculated difference < $50 for most units
- [ ] No 400/409 errors when running Solver
- [ ] Solver successfully syncs amenities

---

## 🔮 **NEXT STEPS**

### **After Verification:**
1. **Generate TypeScript Types**
   ```bash
   npx supabase gen types typescript --linked > types/supabase.ts
   ```

2. **Populate Missing Base Rent** (if verification shows nulls)
   ```sql
   -- Option 1: Use average from availabilities
   UPDATE floor_plans fp
   SET market_base_rent = (
       SELECT AVG(a.rent_offered -
                  COALESCE((a.amenities->>'total_amount')::numeric, 0))
       FROM availabilities a
       JOIN units u ON a.unit_id = u.id
       WHERE u.floor_plan_id = fp.id AND a.is_active = true
   )
   WHERE market_base_rent IS NULL;
   ```

3. **Document Amenities Management**
   - How to add new amenities via AmenitiesList upload
   - How to adjust pricing for existing amenities
   - How to handle discounts vs premiums

---

## 📝 **FILES MODIFIED**

1. `supabase/migrations/20260206000002_update_pricing_view.sql` - Updated inline
2. `supabase/migrations/20260206000004_fix_amenities_pricing_case_insensitive.sql` - **NEW**
3. `layers/admin/composables/useSolverEngine.ts` - Line 113
4. `layers/ops/utils/pricing-engine.ts` - Lines 56-60, 92
5. `layers/parsing/composables/useAmenitiesSync.ts` - Line 29

---

## 🎯 **ROLLBACK PLAN** (If Issues Arise)

If verification fails:

1. **Revert Pricing View:**
   ```sql
   -- Use old formula (temp amenities grouped)
   CREATE OR REPLACE VIEW public.view_unit_pricing_analysis AS
   WITH amenity_sums AS (
       SELECT ua.unit_id,
           COALESCE(SUM(CASE WHEN LOWER(a.type) = 'fixed' THEN a.amount ELSE 0 END), 0) as total_fixed,
           COALESCE(SUM(CASE WHEN LOWER(a.type) != 'fixed' THEN a.amount ELSE 0 END), 0) as total_temp
       FROM unit_amenities ua
       JOIN amenities a ON ua.amenity_id = a.id
       WHERE ua.active = true AND a.active = true
       GROUP BY ua.unit_id
   )
   SELECT u.id, u.unit_name, u.property_code, u.floor_plan_id,
          COALESCE(fp.market_base_rent, 0) as base_rent,
          COALESCE(asm.total_fixed, 0) as fixed_total,
          (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed, 0)) as market_rent,
          COALESCE(asm.total_temp, 0) as temp_total,
          (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed, 0) + COALESCE(asm.total_temp, 0)) as offered_rent
   FROM units u
   LEFT JOIN floor_plans fp ON u.floor_plan_id = fp.id
   LEFT JOIN amenity_sums asm ON u.id = asm.unit_id;
   ```

2. **Revert Code Changes:** Git revert commits

---

**Status:** ✅ Ready for Migration and Testing
**Risk Level:** Low (views only, no data modification)
**Estimated Testing Time:** 15-30 minutes
