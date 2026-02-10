# Delinquencies Feature Setup Guide

## Issues Fixed

### 1. ✅ Dark Mode Dots
**Problem:** Daily Trend chart dots were too dark in dark mode.
**Solution:** Changed from `fill="rgb(var(--color-primary-600))"` to Tailwind classes:
```vue
class="fill-primary-500 dark:fill-primary-400"
```

### 2. ⚠️ Missing Delinquent Residents Data
**Problem:** Database view doesn't exist yet.
**Solution:** Need to create the view manually.

### 3. ✅ Route Access Clarified
**Problem:** How to access the detail page?
**Solution:** Multiple ways to access.

---

## Database Setup

### Option 1: Run SQL Manually (RECOMMENDED)

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `create_delinquent_residents_view.sql`
3. Execute the SQL
4. Refresh your app at `/office/delinquencies`

### Option 2: Fix Migration Conflicts (Advanced)

The migration conflict happens because existing tables already exist. You can:
1. Reset local DB: `npx supabase db reset`
2. Then push: `npx supabase db push`

**⚠️ WARNING:** This will wipe your local database!

---

## Accessing the Detail Page

### Method 1: Click a Row (Automatic)
1. Go to `/office/delinquencies`
2. Scroll to "Delinquent Residents" section
3. Click any row
4. Automatically navigates to `/office/delinquencies/2026-02-09` (or whatever date that record is from)

### Method 2: Direct URL
Navigate directly to: `/office/delinquencies/YYYY-MM-DD`

**Examples:**
- `/office/delinquencies/2026-02-09`
- `/office/delinquencies/2026-01-15`
- `/office/delinquencies/2025-12-26`

### Method 3: From Daily Trend Chart (Future Enhancement)
Could add click handler to dots to navigate to that day's snapshot.

---

## What Each Route Shows

### Dashboard: `/office/delinquencies`
- Summary cards (Total Unpaid, Balance, Aging, Prepays)
- Aging breakdown progress bar
- Daily Trend Chart (last 30 days) - NOW WITH Y-AXIS LABELS ✨
- Monthly Benchmarks (26th of each month)
- **NEW:** Delinquent Residents table (scrollable)

### Detail Page: `/office/delinquencies/[date]`
- Date-specific snapshot header
- Summary cards for that date
- Aging distribution bar
- Full breakdown table with all residents
- Export to CSV functionality

---

## Verification Steps

1. **Check Dark Mode Dots:**
   - Toggle dark mode
   - Dots should be: Light mode = darker blue, Dark mode = lighter blue

2. **Check Delinquent Residents Table:**
   - If you see orange error box → Run the SQL from `create_delinquent_residents_view.sql`
   - If you see green checkmark → No delinquencies (all residents current)
   - If you see table with data → ✅ Working!

3. **Check Detail Page:**
   - Click a row or navigate to `/office/delinquencies/2026-02-09`
   - Should show full snapshot with summary cards and table

---

## Troubleshooting

### "No active delinquencies found"
- This is correct if all residents are current on payments
- Upload a Delinquencies report via the Solver to populate data

### Orange error box about view not found
- Run the SQL from `create_delinquent_residents_view.sql` in Supabase SQL Editor

### Detail page shows "Invalid Snapshot Date"
- Check the URL format: must be `YYYY-MM-DD`
- Make sure that date has delinquency records

### Row click doesn't navigate
- Check browser console for errors
- Make sure the row has a `created_at` field

---

## Files Modified

1. `layers/ops/pages/office/delinquencies.vue` - Enhanced chart + added table
2. `supabase/migrations/20260209000001_create_view_table_delinquent_residents.sql` - View definition
3. `layers/ops/pages/office/delinquencies/[date].vue` - Detail page
4. `create_delinquent_residents_view.sql` - Manual SQL script (run this!)

---

## Next Steps

1. Run the SQL to create the view
2. Test in both light and dark mode
3. Click around to verify navigation
4. Export a snapshot to CSV to verify export functionality

**Questions?** Check the Field Report at `docs/status/LATEST_UPDATE.md`
