# Table Configuration Workflow

**Excel-Based Table Configuration System**
**Date**: 2026-02-16
**Purpose**: Step-by-step guide for managing table columns via Excel

---

## 📋 Overview

This system allows you to configure table columns (roles, departments, priorities, filter groups) using Excel spreadsheets instead of hardcoding them in Vue components.

### File Types

| File Type | Example | Purpose | Edit? |
|-----------|---------|---------|-------|
| **`.xlsx`** | `availabilities-complete.xlsx` | Excel configuration (source of truth) | ✅ **YES - You edit this** |
| **`.generated.ts`** | `availabilities-complete.generated.ts` | Auto-generated TypeScript code | ❌ **NO - Auto-generated** |

---

## 🚀 Quick Reference

### When You Want to Change a Table

```bash
# 1. Edit Excel file
open configs/table-configs/availabilities-complete.xlsx

# 2. Save changes in Excel

# 3. Run parser to regenerate TypeScript
npx tsx utils/table-config-parser.ts configs/table-configs/availabilities-complete.xlsx

# 4. Done! Table updates automatically (if component already imports it)
```

**That's it!** Steps 1-3 are all you need for table changes.

---

## 🔧 Complete Workflow

### ONE-TIME SETUP (Per Table)

Do this **once** when setting up a new table:

#### Step 1: Create/Edit Excel Configuration

**File**: `configs/table-configs/[table-name]-complete.xlsx`

```bash
# Open existing Excel file
open configs/table-configs/availabilities-complete.xlsx

# Or generate a new one
npx tsx utils/generate-table-template.ts configs/table-configs/my-new-table-complete.xlsx
```

Edit the **Column Definitions** sheet:

| Column | What to Set | Examples |
|--------|-------------|----------|
| **key** | Database field name | `unit_name`, `rent_offered`, `b_b` |
| **label** | Display name | `Unit`, `Rent`, `Beds/Baths` |
| **width** | Column width in pixels | `90`, `120`, `150` |
| **sortable** | Enable sorting | `TRUE` or `FALSE` |
| **align** | Text alignment | `left`, `center`, `right` |
| **priority** | Auto-calculated | Formula calculates based on width |
| **roles** | Who can see it | `all` or `Owner,Manager,RPM` |
| **departments** | Which departments | `all` or `Management,Leasing` |
| **filter_groups** | Which tabs/filters | `all` or `available,applied` |
| **notes** | Description/comments | Any notes for documentation |

**Priority Auto-Calculation** (Column F):
```excel
=IF(SUM($C$2:C2)<=350,"P1",IF(SUM($C$2:C2)<=780,"P2",IF(SUM($C$2:C2)<=1140,"P3",IF(SUM($C$2:C2)<=1880,"P4","P5"))))
```
- This formula is already in the template
- Automatically recalculates when you change widths
- Don't edit this formula manually

#### Step 2: Generate TypeScript Code

```bash
npx tsx utils/table-config-parser.ts configs/table-configs/[table-name]-complete.xlsx
```

**Example**:
```bash
npx tsx utils/table-config-parser.ts configs/table-configs/availabilities-complete.xlsx
```

**Output**:
```
✅ Generated: configs/table-configs/availabilities-complete.generated.ts
📊 Table: availabilities
📋 Columns: 26
   P1: 3
   P2: 4
   P3: 4
   P4: 5
   P5: 10
🔀 Filter Groups: 4
🔐 Role Rules: 3 roles
🏢 Department Rules: 2 departments
```

#### Step 3: Add Import to Vue Component (ONE TIME ONLY)

**File**: `layers/ops/pages/office/[table-name]/index.vue`

Add these imports at the top of `<script setup>`:

```vue
<script setup lang="ts">
// ===== TABLE CONFIGURATION (from Excel) =====
import {
  allColumns,
  filterGroups,
  roleColumns,
  departmentColumns
} from '@/configs/table-configs/availabilities-complete.generated'

import { filterColumnsByAccess } from '@/layers/table/composables/useTableColumns'
import { useUserAccess } from '@/layers/base/composables/useUserAccess'

// Get user access
const { userRole, userDepartment, isSuperAdmin } = useUserAccess()
const activeFilter = ref('all') // or 'available', 'applied', 'leased'

// Filter columns by role, department, and active filter
const visibleColumns = computed(() =>
  filterColumnsByAccess(allColumns, {
    userRole: userRole.value,
    userDepartment: userDepartment.value,
    isSuperAdmin: isSuperAdmin.value,
    filterGroup: activeFilter.value
  })
)

// ... rest of your component code ...
</script>

<template>
  <GenericDataTable
    :data="yourData"
    :columns="visibleColumns"
    <!-- ... other props ... -->
  />
</template>
```

**That's it for one-time setup!** Now the table uses your Excel configuration.

---

## 🔄 REPEATABLE WORKFLOW (Every Time You Want Changes)

After one-time setup, follow these steps **every time** you want to modify table columns:

### Step 1: Edit Excel File

```bash
open configs/table-configs/availabilities-complete.xlsx
```

**What you can change**:
- ✅ Add new columns (add row)
- ✅ Remove columns (delete row)
- ✅ Change column widths (auto-updates priority)
- ✅ Change roles (who can see it)
- ✅ Change departments (which departments see it)
- ✅ Change filter groups (which tabs show it)
- ✅ Change labels, alignment, sortable
- ✅ Reorder columns (drag rows)

**Save the Excel file** when done.

### Step 2: Regenerate TypeScript Code

Run this command:

```bash
npx tsx utils/table-config-parser.ts configs/table-configs/availabilities-complete.xlsx
```

**Replace `availabilities-complete.xlsx` with your table name**:
- Units: `units-complete.xlsx`
- Residents: `residents-complete.xlsx`
- Leases: `leases-complete.xlsx`
- etc.

### Step 3: Verify & Test

1. **Check output** - Should show updated column count:
   ```
   ✅ Generated: configs/table-configs/availabilities-complete.generated.ts
   📊 Table: availabilities
   📋 Columns: 27  ← Was 26, now 27 (if you added a column)
   ```

2. **Dev server auto-reloads** (if running):
   ```bash
   npm run dev
   ```
   - Table updates automatically
   - No need to restart server

3. **Open the page** in browser:
   - Navigate to the table page (e.g., `/office/availabilities`)
   - Verify changes appear
   - Check role/department filtering works

### Step 4: Done! ✅

That's it! Your table is updated.

---

## 📦 Batch Update Multiple Tables

If you edited multiple Excel files:

```bash
# Update all tables at once
for file in configs/table-configs/*-complete.xlsx; do
  echo "Parsing: $file"
  npx tsx utils/table-config-parser.ts "$file"
done
```

Or manually run each:
```bash
npx tsx utils/table-config-parser.ts configs/table-configs/availabilities-complete.xlsx
npx tsx utils/table-config-parser.ts configs/table-configs/units-complete.xlsx
npx tsx utils/table-config-parser.ts configs/table-configs/residents-complete.xlsx
npx tsx utils/table-config-parser.ts configs/table-configs/leases-complete.xlsx
```

---

## 🎯 Priority System

**Responsive Breakpoints** (auto-assigned by parser):

| Priority | Max Width | Breakpoint | CSS Class | Devices |
|----------|-----------|------------|-----------|---------|
| **P1** | ≤ 350px | `base` | *(none)* | Mobile (always visible) |
| **P2** | ≤ 780px | `md:` (768px+) | `hidden md:table-cell` | Tablet+ |
| **P3** | ≤ 1140px | `lg:` (1024px+) | `hidden lg:table-cell` | Desktop (1080p) |
| **P4** | ≤ 1880px | `xl:` (1280px+) | `hidden xl:table-cell` | **QHD (1440p)** ⭐ |
| **P5** | > 1880px | `2xl:` (1536px+) | `hidden 2xl:table-cell` | 4K, Ultra-wide |

**How width determines priority**:
```
Cumulative Width   Priority
-----------------  --------
0 - 350px       →  P1 (mobile essentials)
351 - 780px     →  P2 (tablet)
781 - 1140px    →  P3 (desktop basic)
1141 - 1880px   →  P4 (QHD baseline)
1881+           →  P5 (4K+)
```

**Example**:
```
Row 1: width=90  → cumulative=90    → P1
Row 2: width=80  → cumulative=170   → P1
Row 3: width=150 → cumulative=320   → P1
Row 4: width=130 → cumulative=450   → P2 (crossed 350px threshold)
Row 5: width=80  → cumulative=530   → P2
...
```

---

## 🔐 Access Control

### Roles (Property-Specific)

From `user_property_access.role`:
- **Owner** - Property owner (full access)
- **Manager** - Property manager (operational + financial)
- **RPM** - Regional Property Manager (oversight)
- **Staff** - Leasing/maintenance staff (limited)
- **Asset** - Asset management (analytics)
- **all** - Everyone can see (no restriction)

**Excel syntax**:
```
Owner,Manager,RPM    ← Multiple roles (OR logic)
all                  ← Everyone
```

### Departments (Global)

From `profiles.department`:
- **Management** - Financial operations, reporting
- **Leasing** - Resident relations, applications
- **Maintenance** - Work orders, repairs
- **all** - All departments (no restriction)

**Excel syntax**:
```
Management              ← One department
Leasing,Management      ← Multiple departments (OR logic)
all                     ← All departments
```

### Filter Groups

For tabs/filters in the table UI:
- **all** - "All" tab/filter
- **available** - "Available" tab (vacant units)
- **applied** - "Applied" tab (applications pending)
- **leased** - "Leased" tab (future leases signed)
- Custom - Define your own in "Filter Groups" sheet

**Excel syntax**:
```
all                  ← Show in all tabs
available            ← Only in "Available" tab
applied,leased       ← In "Applied" and "Leased" tabs
available,all        ← In "Available" and "All" tabs
```

---

## 📂 File Structure

```
project/
├── configs/table-configs/
│   ├── availabilities-complete.xlsx         ← YOU EDIT
│   ├── availabilities-complete.generated.ts ← AUTO-GENERATED
│   ├── units-complete.xlsx                  ← YOU EDIT
│   ├── units-complete.generated.ts          ← AUTO-GENERATED
│   ├── residents-complete.xlsx              ← YOU EDIT
│   ├── residents-complete.generated.ts      ← AUTO-GENERATED
│   └── ...
├── utils/
│   ├── table-config-parser.ts               ← PARSER SCRIPT
│   ├── generate-table-template.ts           ← CREATES NEW EXCEL FILES
│   └── populate-availabilities-config.ts    ← INITIAL POPULATION SCRIPT
└── layers/ops/pages/
    ├── office/availabilities/index.vue      ← IMPORTS .generated.ts
    ├── office/residents/index.vue           ← IMPORTS .generated.ts
    └── assets/units/index.vue               ← IMPORTS .generated.ts
```

---

## 🔍 Common Tasks

### Add a New Column

1. Open Excel file
2. Insert new row at desired position
3. Fill in: key, label, width, sortable, align, roles, departments, filter_groups
4. Save Excel
5. Run parser command
6. ✅ Column appears in table!

**Priority auto-recalculates for all rows below the new column.**

### Remove a Column

1. Open Excel file
2. Delete the row
3. Save Excel
4. Run parser command
5. ✅ Column disappears from table!

### Change Column Width

1. Open Excel file
2. Change width value
3. Save Excel
4. Run parser command
5. ✅ Priority may change (if crossing threshold)
6. ✅ Column width updates in table

### Restrict Column to Managers Only

1. Open Excel file
2. Find the column row
3. Change **roles** column to: `Manager,RPM`
4. Change **departments** column to: `Management` (or keep `all`)
5. Save Excel
6. Run parser command
7. ✅ Column only visible to Managers/RPMs in Management department

### Change Column Order

1. Open Excel file
2. Cut row (Ctrl+X / Cmd+X)
3. Insert cut cells at new position
4. Save Excel
5. Run parser command
6. ✅ **WARNING**: Priority will recalculate! Check cumulative widths.

**Tip**: Better to adjust widths than reorder to avoid priority shifts.

---

## 🐛 Troubleshooting

### Column Not Showing in Table

**Check**:
1. ✅ Did you run the parser after editing Excel?
2. ✅ Does your component import the `.generated.ts` file?
3. ✅ Is user's role in the `roles` list?
4. ✅ Is user's department in the `departments` list?
5. ✅ Is current filter group in `filter_groups`?
6. ✅ Is screen wide enough for the priority? (P4 needs 1280px+)

**Debug**:
```vue
<script setup>
console.log('All columns:', allColumns)
console.log('Visible columns:', visibleColumns.value)
console.log('User role:', userRole.value)
console.log('User dept:', userDepartment.value)
console.log('Filter group:', activeFilter.value)
</script>
```

### Parser Command Not Found

**Error**: `command not found: npx`

**Fix**: Install Node.js or use full path:
```bash
# Check Node.js installed
node --version
npm --version

# If not installed, install Node.js first
# Then retry parser command
```

### Excel Formula Broken

**Symptom**: Priority shows as text instead of P1/P2/P3/P4/P5

**Fix**:
1. Click on any priority cell (Column F)
2. Formula should be:
   ```excel
   =IF(SUM($C$2:C2)<=350,"P1",IF(SUM($C$2:C2)<=780,"P2",IF(SUM($C$2:C2)<=1140,"P3",IF(SUM($C$2:C2)<=1880,"P4","P5"))))
   ```
3. If broken, copy formula from row 2 and paste down
4. Or regenerate Excel from template

### Generated File Not Updating

**Symptom**: Changes in Excel don't appear in app

**Check**:
1. ✅ Did you save the Excel file?
2. ✅ Did you run the parser command?
3. ✅ Check file modified timestamp:
   ```bash
   ls -la configs/table-configs/*.generated.ts
   ```
4. ✅ Is dev server running? Restart if needed:
   ```bash
   npm run dev
   ```

### Import Error in Component

**Error**: `Cannot find module '@/configs/table-configs/...'`

**Fix**:
1. Check file exists:
   ```bash
   ls configs/table-configs/*-complete.generated.ts
   ```
2. Check import path is correct (should start with `@/configs/`)
3. Restart dev server

---

## ✅ Checklist for Table Changes

Use this checklist every time you modify a table:

- [ ] Open Excel file: `configs/table-configs/[table]-complete.xlsx`
- [ ] Make changes (add/edit/remove columns)
- [ ] Save Excel file (Ctrl+S / Cmd+S)
- [ ] Run parser: `npx tsx utils/table-config-parser.ts configs/table-configs/[table]-complete.xlsx`
- [ ] Check parser output (column count, priorities)
- [ ] Open app in browser
- [ ] Verify changes appear correctly
- [ ] Test role/department filtering (login as different users)
- [ ] Test filter groups (switch between tabs)
- [ ] Test responsive breakpoints (resize browser)
- [ ] Commit changes to git:
  ```bash
  git add configs/table-configs/
  git commit -m "Update [table] table configuration"
  ```

---

## 📝 Example: Complete Workflow

**Scenario**: Add "Market Base Rent" column to Availabilities table

### Step 1: Edit Excel
```bash
open configs/table-configs/availabilities-complete.xlsx
```

Add new row in "Column Definitions" sheet:
```
key: market_base_rent
label: Base Rent
width: 100
sortable: TRUE
align: right
priority: (auto-calculated)
roles: Owner,Manager,RPM
departments: Management
filter_groups: all
notes: Base rent from floor plan (before amenities)
```

Save Excel (Cmd+S).

### Step 2: Generate Code
```bash
npx tsx utils/table-config-parser.ts configs/table-configs/availabilities-complete.xlsx
```

Output:
```
✅ Generated: configs/table-configs/availabilities-complete.generated.ts
📊 Table: availabilities
📋 Columns: 27 (was 26)
   P1: 3
   P2: 4
   P3: 4
   P4: 6    ← New column added here
   P5: 10
```

### Step 3: Test
```bash
npm run dev
```

Navigate to: `http://localhost:3000/office/availabilities`

**Verify**:
- ✅ "Base Rent" column appears (if screen ≥1280px wide)
- ✅ Only visible to Owner/Manager/RPM users
- ✅ Only visible to Management department
- ✅ Shows in all filter tabs (All, Available, Applied, Leased)
- ✅ Right-aligned numbers
- ✅ Sortable (click header to sort)

### Step 4: Commit
```bash
git add configs/table-configs/availabilities-complete.xlsx
git add configs/table-configs/availabilities-complete.generated.ts
git commit -m "Add market_base_rent column to availabilities table"
```

Done! 🎉

---

## 🎓 Summary

### Key Concepts

1. **Excel is the source of truth** - All table configs live in `.xlsx` files
2. **Parser generates TypeScript** - `.generated.ts` files are auto-created
3. **Component imports once** - One-time import statement, never changes
4. **File overwriting is normal** - `.generated.ts` gets completely rewritten each time

### Commands to Remember

**Only ONE command for table updates**:
```bash
npx tsx utils/table-config-parser.ts configs/table-configs/[table-name]-complete.xlsx
```

That's the ONLY command you need to remember! 🎯

### Workflow in 3 Steps

1. **Edit Excel** → Save
2. **Run parser** → `npx tsx utils/table-config-parser.ts ...`
3. **Test** → Open browser, verify changes

---

## 📚 Related Documentation

- **Column Filtering System**: `/docs/table/COLUMN_FILTERING.md`
- **Excel Template Guide**: `/docs/table/EXCEL_TABLE_CONFIG_TEMPLATE.md`
- **Quick Start**: `/docs/table/TABLE_CONFIG_QUICK_START.md`
- **Availabilities Pricing Fields**: `/docs/table/AVAILABILITIES_PRICING_FIELDS.md`

---

**Last Updated**: 2026-02-16
**Maintained By**: Development Team
