# Tasks #5 & #6: LeaseExpirationDashboard & Enhanced Summary Cards

**Date**: 2026-02-11
**Status**: ✅ **COMPLETE**

---

## 📋 **Summary**

Implemented two major UI enhancements for the Renewals Module:
1. **Task #5**: 24-month Lease Expiration Dashboard with target setting
2. **Task #6**: Enhanced worksheet summary cards with detailed breakdowns

---

## ✅ Task #5: Lease Expiration Dashboard

### **Overview**

A strategic planning dashboard showing 24-month lease expiration forecast with visual chart and editable monthly targets.

### **Key Features**

1. **24-Month Timeline** - Shows current month + 23 future months
2. **Multi-Dataset Bar Chart**:
   - **Target (Red)** - User-defined monthly targets for months 12-24
   - **Forecast (Blue)** - Projects current Y1 expirations into Y2
   - **Current Scheduled (Green)** - Actual lease expirations from database
   - **Monthly Average (Dashed Line)** - Total units / 12
3. **Target Setting Panel**:
   - Editable inputs for all 24 months
   - Months 0-11 (current year) disabled (read-only)
   - Months 12-23 (planning year) editable
   - Net Difference tracker: `totalUnits - sum(planning month targets)`
4. **Real-time Calculation** - Chart updates as targets are edited
5. **Persistent Storage** - Saves targets to `renewal_expiration_targets` table

### **Technical Implementation**

**Files Created:**

1. **`layers/ops/composables/useExpirationDashboard.ts`**
   - Fetches expiration counts by month for next 24 months
   - Queries leases with `lease_status = 'Current'` and `end_date` in range
   - Fetches total units for property
   - Fetches/saves monthly targets from database
   - Provides reactive `dashboardData`, `fetch()`, and `saveTargets()` methods

2. **`layers/ops/components/renewals/LeaseExpirationDashboard.vue`**
   - Chart.js Bar chart with 4 datasets
   - Target input panel with scrollable 24-month list
   - Net difference calculator (green/red based on sign)
   - Save targets button with loading state
   - Refresh button to reload data

3. **`supabase/migrations/20260211000001_create_renewal_expiration_targets.sql`**
   - Table: `renewal_expiration_targets(property_code, month, target_count)`
   - Unique constraint on (property_code, month)
   - Auto-update trigger for updated_at

**Integration:**
- Added to `layers/ops/pages/office/renewals/index.vue` at top of page
- Auto-fetches on mount based on active property

### **Data Flow**

```typescript
// 1. Fetch expiration counts
SELECT end_date::TEXT
FROM leases
JOIN tenancies ON leases.tenancy_id = tenancies.id
WHERE tenancies.property_code = :propertyCode
  AND lease_status = 'Current'
  AND is_active = true
  AND end_date >= :month0
  AND end_date <= :month23

// 2. Group by month (YYYY-MM)
const countsByMonth = {}
leases.forEach(lease => {
  const month = lease.end_date.substring(0, 7)
  countsByMonth[month]++
})

// 3. Fetch total units
SELECT COUNT(*) FROM units WHERE property_code = :propertyCode

// 4. Fetch saved targets
SELECT month, target_count
FROM renewal_expiration_targets
WHERE property_code = :propertyCode
```

### **Chart Configuration**

```javascript
{
  responsive: true,
  maintainAspectRatio: false,
  barPercentage: 2.5,
  categoryPercentage: 0.8,
  scales: {
    x: { stacked: false },
    y: { stacked: false, beginAtZero: true }
  }
}
```

**Dataset Colors:**
- Target: `rgba(239, 68, 68, 0.5)` (Red/Warning)
- Forecast: `rgba(96, 165, 250, 0.5)` (Blue/Info)
- Current Scheduled: `rgba(52, 211, 153, 0.7)` (Green/Success)
- Monthly Average: `rgba(107, 114, 128, 0.7)` (Gray, dashed line)

### **User Workflow**

1. User views dashboard showing current expiration forecast
2. Sees "Net Difference" showing how many units need to be distributed across planning year
3. Edits target values for months 12-23 to balance distribution
4. Net difference updates in real-time (green when = 0, red when < 0)
5. Clicks "Save Targets" to persist changes
6. Dashboard refreshes with updated data

### **Strategic Use Cases**

- **Avoid Expiration Peaks**: Spread renewals evenly to prevent operational bottlenecks
- **Plan Staffing**: Anticipate high-volume renewal months
- **Budget Forecasting**: Estimate turnover costs based on target distribution
- **Market Timing**: Align renewals with favorable market conditions

---

## ✅ Task #6: Enhanced Worksheet Summary Cards

### **Overview**

Rich summary cards displaying detailed breakdowns of renewal worksheets by rent source and status.

### **Key Features**

1. **Rent Source Breakdown** (Draft worksheets):
   - Standard Renewals: LTL %, Max %, Manual
   - MTM Renewals: MTM fee + increase
   - Shows count, total rent, current rent, increase ($, %) for each source
2. **Status Breakdown** (All worksheets):
   - Pending, Offered, Manually Accepted, Manually Declined
   - Accepted (Yardi ✓), Declined
   - Separate panels for Standard vs MTM
3. **Visual Indicators**:
   - Color-coded status badges (yellow = manual, green = Yardi confirmed)
   - Fully approved worksheets have green background
   - Archived worksheets have gray background
4. **Collapsible Layout** - Uses UCard with header/body slots

### **Technical Implementation**

**Files Created:**

1. **`layers/ops/components/renewals/WorksheetSummaryCard.vue`**
   - Accepts `worksheet` prop (from view_renewal_worksheet_summaries)
   - Computes rent source breakdown for Standard and MTM
   - Computes status breakdown by renewal_type
   - Displays in grid layout (2 columns on desktop)
   - Provides `actions` slot for buttons

2. **`supabase/migrations/20260211000002_enhance_worksheet_summaries_view.sql`**
   - Enhanced `view_renewal_worksheet_summaries` with 40+ new fields
   - Breakdown by rent_offer_source (ltl_percent, max_percent, manual)
   - Breakdown by renewal_type (standard, mtm)
   - Breakdown by status (pending, offered, manually_accepted, accepted, etc.)
   - Aggregates counts and sums for each combination

**View Schema (Enhanced Fields):**

```sql
-- Standard Renewals by Rent Source
standard_ltl_count, standard_ltl_total, standard_ltl_current
standard_max_count, standard_max_total, standard_max_current
standard_manual_count, standard_manual_total, standard_manual_current

-- Standard Renewals by Status
standard_pending_count
standard_offered_count
standard_manually_accepted_count
standard_manually_declined_count
standard_accepted_count
standard_declined_count

-- MTM Renewals
mtm_total, mtm_total_rent, mtm_current_rent
mtm_pending_count
mtm_offered_count
mtm_manually_accepted_count
mtm_manually_declined_count
mtm_accepted_count
mtm_declined_count

-- Global Stats (all types combined)
total_current_rent, total_offered_rent, total_rent_increase
avg_increase_percent
yardi_confirmed_count, approved_count
```

### **Component Structure**

```vue
<UCard>
  <!-- Header: Name, Date Range, Status Badge -->
  <template #header>
    <h3>{{ worksheet.name }}</h3>
    <UBadge>{{ worksheet.status }}</UBadge>
    <slot name="actions" />
  </template>

  <!-- Body: Summaries -->
  <div class="space-y-6">
    <!-- Rent Source Breakdown (Draft only) -->
    <div class="grid md:grid-cols-2 gap-6">
      <div>Standard Renewals (breakdown by LTL/Max/Manual)</div>
      <div>MTM Renewals (MTM fee info)</div>
    </div>

    <!-- Status Breakdown (All statuses) -->
    <div class="grid md:grid-cols-2 gap-6">
      <div>Standard Status (counts by status)</div>
      <div>MTM Status (counts by status)</div>
    </div>
  </div>
</UCard>
```

### **Computed Properties**

**standardSourceBreakdown:**
```typescript
{
  title: "Standard Renewals (15)",
  sources: [
    { label: "LTL %", count: 10, total: 10500, current: 10000, increase: 500, increasePercent: 5 },
    { label: "Max %", count: 3, total: 3150, current: 3000, increase: 150, increasePercent: 5 },
    { label: "Manual", count: 2, total: 2200, current: 2000, increase: 200, increasePercent: 10 }
  ],
  totalOffered: 15850,
  totalCurrent: 15000,
  totalIncrease: 850,
  avgIncrease: 5.67
}
```

**statusBreakdown:**
```typescript
{
  standard: {
    pending: 5,
    offered: 3,
    manually_accepted: 4,
    manually_declined: 1,
    accepted: 2,
    declined: 0,
    total: 15
  },
  mtm: {
    pending: 2,
    offered: 1,
    manually_accepted: 1,
    manually_declined: 0,
    accepted: 1,
    declined: 0,
    total: 5
  }
}
```

### **Display Logic**

**Draft Worksheets:**
- Show rent source breakdown (helps user understand which strategy is being used)
- Show status breakdown (track acceptance rates)

**Final Worksheets:**
- Hide rent source breakdown (no longer editable)
- Show status breakdown only (final results)

**Archived Worksheets:**
- Gray background
- Show status breakdown (historical record)

### **Integration**

The WorksheetSummaryCard component is available for use in:
- Index page (can replace GenericDataTable rows with expandable cards)
- Detail page (can show at top as worksheet header)
- Reports (can export summary data)

**Current Usage:**
- Component created and ready to use
- Not yet integrated into index page (currently uses GenericDataTable)
- Can be added as optional expanded view or detail page header

---

## 🔧 **Database Changes**

### **New Table: renewal_expiration_targets**
```sql
id UUID PRIMARY KEY
property_code TEXT NOT NULL
month TEXT NOT NULL  -- YYYY-MM format
target_count INTEGER NOT NULL DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

UNIQUE(property_code, month)
```

### **Enhanced View: view_renewal_worksheet_summaries**
- Added 40+ new aggregation fields
- Breakdown by rent_offer_source (ltl_percent, max_percent, manual)
- Breakdown by renewal_type (standard, mtm)
- Breakdown by status for each type
- Enables rich summary card display

---

## 📦 **Dependencies Added**

```bash
npm install chart.js vue-chartjs
```

**Packages:**
- `chart.js` (^4.x) - Chart rendering engine
- `vue-chartjs` (^5.x) - Vue 3 wrapper for Chart.js

---

## ✅ **Testing Checklist**

### **Dashboard (Task #5)**
- [x] Chart displays 24 months correctly
- [x] Current expiration counts fetched from database
- [x] Target inputs work (months 0-11 disabled, 12-23 editable)
- [x] Net difference calculates correctly
- [x] Save targets persists to database
- [x] Refresh reloads data
- [x] Chart.js renders without errors
- [x] Responsive layout (chart + panel side-by-side on desktop)

### **Summary Cards (Task #6)**
- [x] Rent source breakdown displays correctly
- [x] Status breakdown displays correctly
- [x] Draft vs Final layout logic works
- [x] Badge colors match status (draft=yellow, final=primary, archived=gray)
- [x] Fully approved worksheets have green background
- [x] Currency formatting works
- [x] Percentage calculations correct
- [x] Database view returns all required fields

### **Build & Integration**
- [x] Compiles successfully
- [x] No TypeScript errors
- [x] Dashboard displays on renewals index page
- [x] Summary card component ready for integration

---

## 🎯 **Impact**

### **Before Tasks #5 & #6:**
❌ No strategic planning tool for lease expirations
❌ No visibility into 24-month forecast
❌ No target setting for renewal distribution
❌ Basic worksheet summaries (counts only)
❌ No breakdown by rent source

### **After Tasks #5 & #6:**
✅ 24-month visual forecast with Chart.js
✅ Editable monthly targets for strategic planning
✅ Net difference tracker ensures balanced distribution
✅ Rich worksheet summaries with detailed breakdowns
✅ Rent source transparency (LTL vs Max vs Manual usage)
✅ Status tracking (Manual vs Yardi confirmed)
✅ Ready for production use

---

## 🚀 **Next Steps**

**Remaining Tasks:**
- [ ] **Task #7**: Add simple comment system (single field)
- [ ] **Task #8**: Implement term configuration (bulk, up to 3 alt terms)
- [ ] **Task #9**: Implement Finalize workflow (lock + Mail Merger)
- [ ] **Task #10**: Build Mail Merger Excel export (MS Word integration)
- [ ] **Task #11**: Configure GenericDataTable export

**Future Enhancements:**
- Add WorksheetSummaryCard to detail page header
- Make GenericDataTable rows expandable to show summary cards
- Add export functionality to dashboard (download chart as image)
- Add comparison view (compare multiple worksheets side-by-side)

---

## 📝 **Documentation References**

**Chart.js:**
- Official Docs: https://www.chartjs.org/docs/latest/
- Vue wrapper: https://vue-chartjs.org/

**Database Views:**
- `view_renewal_worksheet_summaries` - Enhanced with 40+ fields
- `renewal_expiration_targets` - Stores monthly targets

**Components:**
- `LeaseExpirationDashboard.vue` - 24-month chart + targets
- `WorksheetSummaryCard.vue` - Rich worksheet summary

---

**Implementation Complete**: 2026-02-11
**Build Status**: ✅ Compiles successfully
**Integration**: Dashboard live on index page, Summary cards ready
**Next Session**: Tasks #7-11 (Comments, Term Config, Finalize, Mail Merger)
