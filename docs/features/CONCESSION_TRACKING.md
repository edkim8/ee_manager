# Concession Tracking System

**Date Created:** 2026-02-07
**Status:** ✅ Active
**Location:** Availabilities & Leases Tables

---

## Overview

The concession tracking system allows property managers to document and analyze lease concessions beyond just amenity-based pricing. This captures upfront dollar concessions and free rent periods, providing a complete picture of actual lease economics.

---

## Business Context

### Why Track Concessions?

In competitive markets, property managers often provide concessions to close deals:
- **Upfront Concessions:** "$500 off first month", "$1000 move-in special"
- **Free Rent Periods:** "1 month free", "2 weeks free rent"
- **Amenity Concessions:** Discounts or included amenities (e.g., free parking)

These concessions impact:
- **Effective Rent:** What the resident actually pays over the lease term
- **Property Revenue:** Accurate financial reporting and forecasting
- **Lease Comparison:** Understanding which deals are truly comparable
- **Performance Analysis:** Tracking concession trends across properties

### The C%/A% Formula

Concessions are expressed as **C%/A%** where:

- **C% (Amenity Concession %)** = Amenity-based concessions as a percentage of market rent
  - Only includes premiums/discounts from amenities
  - Already monthly, no amortization needed

- **A% (All-In Concession %)** = Total concessions (amenities + upfront + free rent) as a percentage of market rent
  - Includes all concession types
  - Upfront and free rent are amortized over 12 months

**Example:** "5%/8%" means:
- 5% concession from amenity discounts
- 8% total concession including upfront cash and free rent

---

## Database Schema

### Fields Added to `availabilities` Table

```sql
-- Upfront dollar concession (e.g., $500 off first month)
concession_upfront_amount NUMERIC(10, 2) DEFAULT 0

-- Number of days of free rent
concession_free_rent_days INTEGER DEFAULT 0
```

### Fields Added to `leases` Table

```sql
-- Same fields for historical tracking
concession_upfront_amount NUMERIC(10, 2) DEFAULT 0
concession_free_rent_days INTEGER DEFAULT 0
```

---

## Calculation Logic

### Helper Function: `calculate_amenity_concession()`

Calculates net monthly amenity concession for a unit:

```sql
CREATE OR REPLACE FUNCTION calculate_amenity_concession(p_unit_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  -- Sum premiums (positive amounts)
  -- Sum discounts (negative amounts)
  -- Return net concession
END;
$$ LANGUAGE plpgsql STABLE;
```

### View: `view_concession_analysis`

Calculates all concession metrics:

```sql
CREATE OR REPLACE VIEW view_concession_analysis AS
SELECT
  a.unit_id,
  a.property_code,
  a.status,
  a.rent_market,
  a.rent_offered,
  a.concession_upfront_amount,
  a.concession_free_rent_days,

  -- Monthly concessions (amortized over 12 months)
  amenity_concession_monthly,        -- Already monthly
  upfront_concession_monthly,        -- upfront_amount / 12
  free_rent_concession_monthly,      -- rent_market * (free_days / 365)

  -- Percentage calculations
  concession_amenity_pct,            -- C% = (amenity / rent_market) * 100
  concession_total_pct,              -- A% = (total / rent_market) * 100
  concession_display                 -- "C%/A%" formatted string

FROM availabilities a
WHERE a.is_active = true;
```

### Amortization Formulas

**Upfront Concession (Monthly):**
```
upfront_monthly = concession_upfront_amount / 12
```

**Free Rent (Monthly):**
```
free_rent_monthly = rent_market * (concession_free_rent_days / 365)
```

**C% (Amenity Only):**
```
C% = (amenity_concession_monthly / rent_market) * 100
```

**A% (All-In):**
```
A% = ((amenity_monthly + upfront_monthly + free_rent_monthly) / rent_market) * 100
```

---

## User Interface

### Availabilities Table (Index View)

**Location:** `/office/availabilities`

**Column Added:**
- **% Concession** - Displays C%/A% for Applied and Leased units
- Format: "5.0%/8.5%"
- Width: 110px
- Alignment: Center
- Sortable: Yes

**Data Source:**
```typescript
// Fetch concession data
const { data: concessionData } = await supabase
  .from('view_concession_analysis')
  .select('*')
  .eq('property_code', activeProperty.value)

// Join with pipeline data
return pipelineData.map((item) => ({
  ...item,
  concession_display: concession?.concession_display || '0%/0%',
  concession_amenity_pct: concession?.concession_amenity_pct || 0,
  concession_total_pct: concession?.concession_total_pct || 0
}))
```

### Availability Detail Page

**Location:** `/office/availabilities/[id]`

**New Section: "Lease Concessions"**

Features:
- ✅ Live C%/A% calculation display
- ✅ Upfront concession dollar input
- ✅ Free rent period (days) input
- ✅ Quick preset buttons (1 week, 2 weeks, 1 month, 2 months)
- ✅ Real-time breakdown of concession components
- ✅ Save button to persist changes

**Layout:**
```vue
<div class="lease-concessions-card">
  <!-- Header with live C%/A% -->
  <header>
    <h4>Lease Concessions</h4>
    <div class="concession-pct">5.0%/8.5%</div>
  </header>

  <!-- Input Fields -->
  <UFormGroup label="Upfront Concession ($)">
    <UInput v-model="concessionUpfront" type="number" />
  </UFormGroup>

  <UFormGroup label="Free Rent Period (days)">
    <UInput v-model="concessionFreeDays" type="number" />
  </UFormGroup>

  <!-- Quick Presets -->
  <div class="presets">
    <UButton @click="concessionFreeDays = 7">1 Week</UButton>
    <UButton @click="concessionFreeDays = 14">2 Weeks</UButton>
    <UButton @click="concessionFreeDays = 30">1 Month</UButton>
    <UButton @click="concessionFreeDays = 60">2 Months</UButton>
  </div>

  <!-- Concession Breakdown -->
  <div class="breakdown">
    <div>Amenity Concessions (C%): 5.0%</div>
    <div>Upfront (Monthly): $41.67</div>
    <div>Free Rent (Monthly): $68.49</div>
    <div>Total Concessions (A%): 8.5%</div>
  </div>

  <!-- Save Button -->
  <UButton @click="saveConcessions">Save Concessions</UButton>
</div>
```

---

## Implementation Files

### Database Migrations

1. **`20260207000000_add_concession_tracking.sql`**
   - Adds `concession_upfront_amount` and `concession_free_rent_days` to both tables
   - Creates `calculate_amenity_concession()` helper function
   - Adds column comments

2. **`20260207000001_view_concession_analysis.sql`**
   - Creates `view_concession_analysis` view
   - Calculates C% and A% percentages
   - Provides formatted `concession_display` string

### TypeScript Types

**File:** `types/supabase.ts`

**Updated Tables:**
```typescript
availabilities: {
  Row: {
    // ... existing fields ...
    concession_upfront_amount: number | null
    concession_free_rent_days: number | null
  }
  Insert: { /* same */ }
  Update: { /* same */ }
}

leases: {
  Row: {
    // ... existing fields ...
    concession_upfront_amount: number | null
    concession_free_rent_days: number | null
  }
  Insert: { /* same */ }
  Update: { /* same */ }
}
```

**New View:**
```typescript
view_concession_analysis: {
  Row: {
    unit_id: string
    property_code: string
    status: string | null
    rent_market: number | null
    rent_offered: number | null
    concession_upfront_amount: number | null
    concession_free_rent_days: number | null
    amenity_concession_monthly: number | null
    upfront_concession_monthly: number | null
    free_rent_concession_monthly: number | null
    concession_amenity_pct: number | null
    concession_total_pct: number | null
    concession_display: string | null
    future_tenancy_id: string | null
    is_active: boolean | null
    created_at: string | null
    updated_at: string | null
  }
}
```

### UI Components

1. **`layers/ops/pages/office/availabilities/index.vue`**
   - Fetches concession data from `view_concession_analysis`
   - Joins with pipeline data
   - Adds `concession_display` column to Applied and Leased views

2. **`layers/ops/pages/office/availabilities/[id].vue`**
   - Adds "Lease Concessions" card section
   - Real-time C%/A% calculation
   - Concession input fields with presets
   - Save functionality

---

## Usage Examples

### Example 1: Move-In Special

**Scenario:** Offer $500 off first month to close deal quickly

**Input:**
- Upfront Concession: $500
- Free Rent Days: 0

**Calculation:**
- Rent Market: $2,500
- Amenity Monthly: -$50 (parking discount)
- Upfront Monthly: $500 / 12 = $41.67
- Free Rent Monthly: $0

**Result:**
- C% = (-$50 / $2,500) * 100 = -2.0%
- A% = ((-$50 + $41.67) / $2,500) * 100 = -0.3%
- Display: "-2.0%/-0.3%"

### Example 2: Two Weeks Free

**Scenario:** Offer 14 days free rent to match competitor

**Input:**
- Upfront Concession: $0
- Free Rent Days: 14

**Calculation:**
- Rent Market: $2,500
- Amenity Monthly: $0
- Upfront Monthly: $0
- Free Rent Monthly: $2,500 * (14 / 365) = $95.89

**Result:**
- C% = 0%
- A% = ($95.89 / $2,500) * 100 = 3.8%
- Display: "0%/3.8%"

### Example 3: Full Package

**Scenario:** Aggressive deal with multiple concessions

**Input:**
- Upfront Concession: $1,000
- Free Rent Days: 30
- Amenity Discounts: Free parking ($100/mo)

**Calculation:**
- Rent Market: $3,000
- Amenity Monthly: -$100
- Upfront Monthly: $1,000 / 12 = $83.33
- Free Rent Monthly: $3,000 * (30 / 365) = $246.58

**Result:**
- C% = (-$100 / $3,000) * 100 = -3.3%
- A% = ((-$100 + $83.33 + $246.58) / $3,000) * 100 = 7.7%
- Display: "-3.3%/7.7%"

---

## Best Practices

### Data Entry

1. **Always enter concessions at application/lease signing**
   - Don't wait until move-in
   - Capture while details are fresh

2. **Use consistent units**
   - Upfront: Always in dollars (not percentages)
   - Free rent: Always in days (not weeks/months)

3. **Document concession source**
   - Add notes in CRM or lease record
   - Track approval chain if needed

### Analysis

1. **Compare C% vs A%**
   - Large gap indicates heavy use of upfront/free rent
   - Small gap means amenity-driven concessions

2. **Track trends over time**
   - Are concessions increasing? (market softening)
   - Are concessions decreasing? (market tightening)

3. **Benchmark by floor plan**
   - Which units need more concessions?
   - Which units lease without concessions?

### Reporting

1. **Include in financial forecasts**
   - Concessions reduce effective rent
   - Impact cash flow timing

2. **Monitor concession limits**
   - Set max % by market conditions
   - Flag deals exceeding limits

3. **Review with ownership**
   - Monthly concession summary
   - Year-over-year comparison

---

## Data Transfer: Availability → Lease

### Automatic Transfer Trigger

When a lease is created (typically from Yardi sync), concessions automatically transfer:

**Flow:**
```
Available Unit
  ↓ Staff enters concessions
Availability Record: upfront=$500, free_days=14
  ↓ Unit status → Applied
Concessions preserved in availability
  ↓ Unit status → Leased
Lease Record Created (Yardi sync)
  ↓ TRIGGER FIRES
Lease Record: upfront=$500, free_days=14 ✅
```

**Trigger Logic:**
1. Lease record inserted into `leases` table
2. Trigger looks up unit via `tenancy_id`
3. Finds active `availability` record for that unit
4. Copies `concession_upfront_amount` and `concession_free_rent_days`
5. Lease now has complete concession history

**Database Trigger:**
- **File:** `20260207000002_concession_transfer_trigger.sql`
- **Function:** `copy_concessions_to_lease()`
- **Trigger:** `trigger_copy_concessions_to_lease` (BEFORE INSERT on leases)

### Migration Notes

#### Existing Data

All existing leases will have:
- `concession_upfront_amount` = 0 or NULL
- `concession_free_rent_days` = 0 or NULL

This is **correct** since we didn't track concessions historically.

#### Going Forward

1. **Staff enters concessions** on available/applied units
2. **Concessions transfer automatically** when unit is leased
3. **Historical record preserved** in lease table
4. **No manual data entry** needed after initial entry

### Backfill Strategy (Optional)

If historical concession data exists elsewhere:

```sql
-- Example: Update from external data source
UPDATE availabilities a
SET
  concession_upfront_amount = ext.upfront_amount,
  concession_free_rent_days = ext.free_days
FROM external_concession_data ext
WHERE a.unit_id = ext.unit_id
  AND ext.effective_date >= '2025-01-01';
```

---

## Testing Checklist

- [ ] Run database migrations successfully
- [ ] Verify concession fields appear in availabilities table
- [ ] Verify concession fields appear in leases table
- [ ] Test `calculate_amenity_concession()` function
- [ ] Verify `view_concession_analysis` returns correct data
- [ ] Check TypeScript types compile without errors
- [ ] Test UI: Concession column appears in Applied view
- [ ] Test UI: Concession column appears in Leased view
- [ ] Test UI: Detail page shows concession edit section
- [ ] Test UI: Input fields update C%/A% calculation live
- [ ] Test UI: Preset buttons set correct day values
- [ ] Test UI: Save button persists changes
- [ ] Test UI: Breakdown shows correct values
- [ ] Verify saved concessions appear in table view
- [ ] Test with zero concessions (0%/0%)
- [ ] Test with amenity-only concessions
- [ ] Test with upfront-only concessions
- [ ] Test with free rent-only concessions
- [ ] Test with combined concessions

---

## Future Enhancements

### Phase 2 (Optional)

1. **Concession Approval Workflow**
   - Require manager approval for concessions > X%
   - Track approval history

2. **Concession Templates**
   - Save common concession packages
   - Quick-apply standard deals

3. **Market Comparison**
   - Compare concessions vs competitors
   - Benchmark against market averages

4. **Effective Rent Calculator**
   - Show "true" effective rent after all concessions
   - Calculate NPV of lease with concessions

5. **Concession Forecasting**
   - Predict future concession needs
   - Recommend optimal concession strategy

---

## Support & Troubleshooting

### Common Issues

**Q: C%/A% shows as "0%/0%" but I entered concessions**
- Check that rent_market is not null or zero
- Verify concession fields saved correctly
- Refresh the page to reload data

**Q: Negative percentages appearing**
- This is correct! Amenity premiums create negative concessions (increased rent)
- Example: Adding $100 parking premium = -4% on $2,500 base

**Q: Calculations don't match spreadsheet**
- Verify using 365-day year (not 360)
- Verify dividing by 12 months (not lease term)
- Check rent_market value used

**Q: Can't save concessions**
- Check user has permission to update availabilities table
- Verify unit_id exists and is valid
- Check browser console for API errors

---

## Related Documentation

- **Amenities System:** `docs/status/AMENITIES_SYSTEM_AUDIT.md`
- **Pricing Engine:** `layers/ops/utils/pricing-engine.ts`
- **Database Schema:** `docs/database/SCHEMA.md`

---

**Last Updated:** 2026-02-07
**Maintained By:** Development Team
**Version:** 1.0.0
