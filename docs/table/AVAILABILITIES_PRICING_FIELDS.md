# Availabilities Pricing & Concession Fields

**Date**: 2026-02-15
**Migration**: `20260215000004_add_pricing_fields_to_leasing_pipeline.sql`
**Status**: ✅ Ready to Deploy

---

## Summary

Added comprehensive pricing, concession, and turnover tracking fields to `view_leasing_pipeline` for complete visibility into unit economics and pricing overrides.

---

## New Fields Added (11 fields)

### 1. Turnover Metrics

| Field | Type | Formula | Description |
|-------|------|---------|-------------|
| `turnover_days` | INTEGER | `COALESCE(available_date - move_out_date, 0)` | Days between move-out and availability (turnover time) |

**Usage**: Track unit readiness efficiency
- **Positive value**: Days from move-out to available (normal turnover)
- **Zero**: Same-day turnover or no previous tenant
- **Negative**: Unit available before move-out (pre-leasing scenario)

---

### 2. Temporary Amenities

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `temp_amenities_total` | NUMERIC | Derived Delta | Difference between True Market Rent and Offered Rent |
| `market_base_rent` | NUMERIC | Calculated | True Market Baseline (Base Floor Plan Rent + Fixed Amenities) |

**Calculation**:
```sql
temp_amenities_total = (Calculated Market Rent - Rent Offered)
```

**Interpretation**:
- **Positive Value**: Total pricing discount/concession from all temporary amenities or manual overrides.
- **Negative Value**: Total pricing premium over the base floor plan and fixed amenities.
- **Zero**: Rent matches the True Market baseline exactly.

---

### 3. Concession Tracking (Raw Data)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `concession_upfront_amount` | NUMERIC | `availabilities.concession_upfront_amount` | Dollar amount of upfront concession (e.g., $500 off first month) |
| `concession_free_rent_days` | INTEGER | `availabilities.concession_free_rent_days` | Number of days of free rent applied |

**Examples**:
- **Upfront**: $500 move-in special
- **Free Rent**: 14 days (~2 weeks free)

---

### 4. Concession Calculations (Monthly Amortization)

| Field | Type | Formula | Description |
|-------|------|---------|-------------|
| `concession_upfront_monthly` | NUMERIC | `upfront_amount / 12` | Upfront concession amortized over 12 months |
| `concession_amenity_monthly` | NUMERIC | `calculate_amenity_concession(unit_id)` | Monthly amenity-based concessions (premiums + discounts) |
| `concession_free_rent_monthly` | NUMERIC | `rent_market * (free_rent_days / 365)` | Free rent value amortized monthly |

**Example Calculation**:
```
Market Rent: $2,000/month
Upfront Concession: $600
Free Rent Days: 30
Amenity Discount: -$100/month

upfront_monthly = $600 / 12 = $50/month
free_rent_monthly = $2,000 * (30/365) = $164/month
amenity_monthly = -$100/month

Total Monthly Concession = $50 + $164 - $100 = $114/month
```

---

### 5. Concession Percentages

| Field | Type | Formula | Description |
|-------|------|---------|-------------|
| `concession_amenity_pct` | NUMERIC | `(amenity_monthly / rent_market) * 100` | **C%** - Amenity-based concessions as % of market rent |
| `concession_total_pct` | NUMERIC | `((amenity_monthly + upfront_monthly + free_rent_monthly) / rent_market) * 100` | **A%** - Total concessions as % of market rent |
| `concession_display_calc` | TEXT | `'C%/A%'` format | Display string (e.g., "5.0%/8.5%") |

**Example**:
```
Market Rent: $2,000
Amenity Concession: -$100/month
Total Concession: $114/month

C% = (-$100 / $2,000) * 100 = -5.0%  (discount)
A% = ($114 / $2,000) * 100 = 5.7%    (total concession)

Display: "5.0%/5.7%"
```

**Interpretation**:
- **C%** (Amenity %): Ongoing monthly concessions from amenities
  - Negative = Discount (e.g., -5% = $100 discount on $2,000 rent)
  - Positive = Premium (e.g., +10% = $200 premium for penthouse)
- **A%** (Total %): All concessions averaged over 12 months
  - Includes upfront specials and free rent periods
  - Always expressed as positive percentage

---

### 6. Pricing Notes & Comments

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `pricing_notes` | TEXT | `unit_amenities.comment` (aggregated) | All active pricing override notes, joined with ' \| ' |
| `pricing_comment` | TEXT | `unit_amenities.comment` (latest) | Most recent price override comment |

**Storage Location**: `unit_amenities.comment` field

**Set Via**: Floor Plan Pricing Manager → Unit Pricing Override → Notes/Comment field

**Examples**:
- `pricing_notes`: "Corporate discount approved by manager | Premium view upgrade"
- `pricing_comment`: "Premium view upgrade" (latest only)

**Use Cases**:
- Audit trail for pricing adjustments
- Manager approval notes
- Special discount authorizations
- Premium justifications

---

## Data Sources

### Tables
- `availabilities` - Main availability records with concession tracking
- `leases` - Executed leases with concession data
- `unit_amenities` - Amenity assignments with pricing notes/comments
- `amenities` - Amenity library (type: fixed, premium, discount)

### Views (Joined)
- `view_unit_pricing_analysis` - Temporary amenities calculation
- `view_concession_analysis` - Concession percentage calculations (C%/A%)

### Functions
- `calculate_amenity_concession(unit_id)` - Calculates net monthly amenity concessions

---

## Complete Field List (Updated)

`view_leasing_pipeline` now has **44 total fields**:

### Core Fields (14)
1. record_type
2. availability_id
3. unit_id
4. property_code
5. unit_name
6. status
7. available_date
8. rent_offered
9. amenities
10. future_tenancy_id
11. move_in_date
12. move_out_date
13. leasing_agent
14. is_active

### Resident Fields (3)
15. resident_name
16. resident_email
17. resident_phone

### Building Fields (2)
18. building_id
19. building_name

### Floor Plan Fields (7)
20. floor_plan_id
21. floor_plan_name
22. floor_plan_code
23. sf (area_sqft)
24. bedroom_count
25. bathroom_count
26. **b_b** (bedroom x bathroom)
27. market_base_rent

### Metrics (2)
28. vacant_days
29. **turnover_days** ✨ NEW

### Lease Fields (3)
30. lease_start_date
31. lease_end_date
32. lease_rent_amount

### Application Fields (2)
33. application_date
34. screening_result

### **NEW: Pricing & Concession Fields (11)** ✨
35. **temp_amenities_total** - Sum of temporary amenities
36. **concession_upfront_amount** - Upfront dollar concession
37. **concession_free_rent_days** - Free rent days
38. **concession_upfront_monthly** - Upfront amortized monthly
39. **concession_amenity_monthly** - Amenity concessions monthly
40. **concession_free_rent_monthly** - Free rent amortized monthly
41. **concession_amenity_pct** - C% (amenity concessions %)
42. **concession_total_pct** - A% (total concessions %)
43. **concession_display_calc** - C%/A% display string
44. **pricing_notes** - All pricing override notes
45. **pricing_comment** - Latest pricing override comment

---

## Usage Examples

### 1. Turnover Analysis
```sql
SELECT
  unit_name,
  move_out_date,
  available_date,
  turnover_days,
  CASE
    WHEN turnover_days <= 3 THEN 'Excellent'
    WHEN turnover_days <= 7 THEN 'Good'
    WHEN turnover_days <= 14 THEN 'Average'
    ELSE 'Slow'
  END AS turnover_rating
FROM view_leasing_pipeline
WHERE status = 'Available'
ORDER BY turnover_days DESC;
```

### 2. High Concession Units
```sql
SELECT
  unit_name,
  rent_offered,
  concession_total_pct AS total_concession_pct,
  concession_display_calc,
  concession_upfront_amount,
  pricing_comment
FROM view_leasing_pipeline
WHERE concession_total_pct > 10  -- More than 10% total concessions
ORDER BY concession_total_pct DESC;
```

### 3. Pricing Override Audit
```sql
SELECT
  unit_name,
  temp_amenities_total,
  pricing_notes,
  pricing_comment,
  concession_amenity_pct,
  updated_at
FROM view_leasing_pipeline
WHERE pricing_notes IS NOT NULL
ORDER BY updated_at DESC;
```

### 4. Unit Economics Summary
```sql
SELECT
  unit_name,
  market_base_rent AS base_rent,
  temp_amenities_total AS temp_amenities,
  (market_base_rent + temp_amenities_total) AS calculated_rent,
  rent_offered AS yardi_rent,
  concession_upfront_amount AS upfront_special,
  concession_free_rent_days AS free_rent_days,
  concession_display_calc AS concessions,
  turnover_days,
  pricing_comment
FROM view_leasing_pipeline
WHERE status = 'Available';
```

---

## Migration Notes

### Before Migration
- `view_leasing_pipeline` had 33 fields
- Concession data required separate join to `view_concession_analysis`
- Temporary amenities required separate join to `view_unit_pricing_analysis`
- No turnover metrics
- No pricing notes visibility

### After Migration
- `view_leasing_pipeline` has 44 fields (+11 new fields)
- **Self-contained** - All pricing data in one view
- **No additional joins needed** for concession analysis
- **Complete unit economics** in single query
- **Audit trail** via pricing notes/comments

### Performance Considerations
- Added joins to `view_unit_pricing_analysis` and `view_concession_analysis`
- Subqueries for pricing notes aggregation (STRING_AGG)
- Recommend indexing:
  - `unit_amenities(unit_id, active, updated_at)` - For pricing notes lookup
  - Already indexed on unit_id

### Backward Compatibility
- ✅ **100% Backward Compatible**
- All existing fields preserved
- New fields added at end
- Existing queries continue to work
- Optional fields - all have defaults/COALESCE

---

## UI Integration

### Floor Plan Pricing Manager
The pricing override modal (`AmenityAdjustmentModal`) already saves to `unit_amenities.comment`:

```vue
<UInput
  v-model="concessionComment"
  placeholder="Optional notes about this concession..."
/>
<p class="text-xs text-gray-500 mt-1">
  Saved to unit_amenities.comment for audit trail
</p>
```

**Workflow**:
1. Manager opens Unit Pricing Override
2. Adjusts amenities (add discounts/premiums)
3. Adds note: "Corporate rate per agreement #2024-156"
4. Saves → Stored in `unit_amenities.comment`
5. Appears in `view_leasing_pipeline.pricing_comment` and `pricing_notes`

### Availabilities Table
New columns can be added to show:
- Turnover efficiency (color-coded: <3 days = green, >14 days = red)
- Total concessions (C%/A% badge)
- Pricing notes (hover tooltip or expandable)
- Temporary amenities impact

---

## Next Steps

### 1. Deploy Migration
```bash
# Apply migration to database
supabase db push

# Or manually run SQL
psql $DATABASE_URL -f supabase/migrations/20260215000004_add_pricing_fields_to_leasing_pipeline.sql
```

### 2. Update Excel Configuration
Add new columns to `availabilities-complete.xlsx`:
- turnover_days (P3 - Desktop metric)
- temp_amenities_total (P4 - Financial)
- concession_total_pct (P4 - Financial)
- pricing_comment (P5 - Audit trail)

### 3. Update UI Components
```vue
<!-- Turnover Days with Color Coding -->
<template #cell-turnover_days="{ value }">
  <span
    class="font-mono font-semibold"
    :class="{
      'text-green-600': value <= 3,
      'text-blue-600': value <= 7,
      'text-yellow-600': value <= 14,
      'text-red-600': value > 14
    }"
  >
    {{ value }} days
  </span>
</template>

<!-- Concession Display -->
<template #cell-concession_display_calc="{ value }">
  <CellsBadgeCell
    :text="value"
    :color="parseFloat(value) > 5 ? 'warning' : 'neutral'"
  />
</template>

<!-- Pricing Notes Tooltip -->
<template #cell-pricing_comment="{ value, row }">
  <UTooltip v-if="value" :text="row.pricing_notes || value">
    <UIcon name="i-heroicons-chat-bubble-left-ellipsis" class="text-blue-500" />
  </UTooltip>
</template>
```

### 4. Analytics Dashboards
- Turnover time trends
- Concession effectiveness analysis
- Pricing override frequency
- Amenity impact on leasing speed

---

## Benefits

✅ **Complete Unit Economics** - All pricing data in one view
✅ **Turnover Tracking** - Measure operational efficiency
✅ **Concession Visibility** - Understand discount impact
✅ **Audit Trail** - Track all pricing adjustments with notes
✅ **Single Query** - No additional joins needed
✅ **Manager Transparency** - See why rents were adjusted
✅ **Performance Analysis** - Correlate concessions with lease velocity

---

## Files Modified

### New Files
1. ✅ `supabase/migrations/20260215000004_add_pricing_fields_to_leasing_pipeline.sql`
2. ✅ `docs/table/AVAILABILITIES_PRICING_FIELDS.md` (this file)

### Existing Files Referenced
- `supabase/migrations/20260207000000_add_concession_tracking.sql` - Concession fields
- `supabase/migrations/20260207000001_view_concession_analysis.sql` - C%/A% calculations
- `supabase/migrations/20260205000001_amenities_pricing_views.sql` - Temporary amenities
- `layers/ops/components/modals/AmenityAdjustmentModal.vue` - Pricing override UI

---

## Summary

This migration transforms `view_leasing_pipeline` into a comprehensive pricing and operations view with:
- **Turnover metrics** for operational efficiency
- **Complete concession tracking** (upfront, free rent, amenity-based)
- **Percentage calculations** (C% and A%) for financial analysis
- **Pricing audit trail** with manager notes/comments
- **Temporary amenities** impact visibility

All data is now accessible in a single query, enabling powerful analytics and transparent pricing governance.
