# Table Configuration Files

> **Excel-based table column planning with auto-generated TypeScript code**

---

## Quick Start

```bash
# 1. Generate a blank template
npx tsx utils/generate-table-template.ts configs/table-configs/my-table.xlsx

# 2. Open in Excel and fill in your columns

# 3. Parse and generate TypeScript code
npx tsx utils/table-config-parser.ts configs/table-configs/my-table.xlsx

# 4. Copy generated code into your Vue component
```

---

## Files in This Directory

### Templates
- **`template.xlsx`** - Blank template with 5 sheets and auto-calculation formulas
- **`availabilities.xlsx`** - Complete working example (21 columns, 4 filter groups)

### Generated Code
- **`availabilities.generated.ts`** - Auto-generated TypeScript from availabilities.xlsx

---

## How It Works

### 1. Excel Configuration
Open `template.xlsx` or `availabilities.xlsx` in Excel. You'll see 5 sheets:

#### Sheet 1: Column Definitions (Main workspace)
Define your table columns with auto-calculated priorities:

| Column | Purpose |
|--------|---------|
| `key` | TypeScript column key (e.g., `unit_name`) |
| `label` | Display label (e.g., "Unit") |
| `width` | Column width in pixels (e.g., `120`) |
| `sortable` | TRUE or FALSE |
| `align` | left, center, right, or blank |
| **`priority`** | **AUTO-CALCULATED** - Don't edit! |
| `roles` | Comma-separated or "all" |
| `departments` | Comma-separated or "all" |
| `filter_groups` | Comma-separated or "all" |
| `notes` | Your comments |

**The magic:** As you add columns, the `priority` column auto-calculates based on cumulative width using this formula:

```excel
=IF(SUM($C$2:C2)<=350,"P1",IF(SUM($C$2:C2)<=780,"P2",IF(SUM($C$2:C2)<=1140,"P3",IF(SUM($C$2:C2)<=1880,"P4","P5"))))
```

#### Sheet 2: Table Configuration
Table-level settings (key-value pairs):
- `table_name`: Short name (e.g., "properties")
- `file_path`: Vue component path
- `has_filter_groups`: TRUE/FALSE
- `default_sort_field`: Column key
- Pagination, export, clickable rows settings

#### Sheet 3: Filter Groups (Optional)
Define tabs/filters if your table has different "modes":
- `group_name`: Code name (e.g., "available")
- `label`: Display label (e.g., "Available Units")
- `description`: Optional notes

#### Sheet 4: Priority Reference
Read-only reference showing breakpoint thresholds:
- **P1**: 0-350px (Mobile)
- **P2**: 351-780px (Tablet+)
- **P3**: 781-1140px (Desktop basic)
- **P4**: 1141-1880px (QHD baseline) ⭐
- **P5**: 1881px+ (4K enhanced)

#### Sheet 5: Instructions
How-to guide embedded in the Excel file

### 2. Code Generation
Run the parser to generate TypeScript code:

```bash
npx tsx utils/table-config-parser.ts configs/table-configs/my-table.xlsx
```

This creates `my-table.generated.ts` with:
- Column definitions grouped by priority (P1-P5)
- Tailwind responsive classes (`hidden md:table-cell`, etc.)
- Filter group mappings
- Role-based column visibility rules
- Department-based column visibility rules

### 3. Use in Vue Component
Copy the generated code into your Vue component:

```vue
<script setup lang="ts">
import type { TableColumn } from '@/layers/table/types'

// Copy from generated file
const allColumns: TableColumn[] = [
  // ... generated columns ...
]

const filterGroups = {
  // ... generated filter groups ...
}

const roleColumns = {
  // ... generated role rules ...
}

const departmentColumns = {
  // ... generated department rules ...
}
</script>

<template>
  <GenericDataTable
    :data="data"
    :columns="allColumns"
    <!-- ... -->
  />
</template>
```

---

## Column Width Guidelines

| Type | Width | Examples |
|------|-------|----------|
| **Narrow** | 60-90px | Status, Icon, Checkbox, ID |
| **Medium** | 100-150px | Unit Name, Code, Short Text |
| **Wide** | 150-250px | Names, Emails, Addresses |
| **Actions** | 100-120px | Dropdown, Buttons |

**Average:** ~130px per column

---

## Priority Distribution Targets

| Priority | Columns | Cumulative Width | Guidance |
|----------|---------|------------------|----------|
| **P1** | 2-3 | ~250-350px | Bare minimum for identification |
| **P2** | +3-4 | ~650-780px | Essential context |
| **P3** | +2-3 | ~950-1140px | Key operational data |
| **P4** | +4-5 | ~1500-1880px | Full dataset (QHD baseline) ⭐ |
| **P5** | +4-5 | ~2000-2520px | Maximum detail (4K) |

---

## Example: Availabilities Table

See `availabilities.xlsx` for a complete working example:

**21 columns across 5 priorities:**
- **P1** (3 cols, 320px): unit_name, sync_alerts, building_name
- **P2** (4 cols, +410px): floor_plan_name, sf, bedroom_count, status
- **P3** (4 cols, +400px): rent_offered, available_date, vacant_days, move_out_date
- **P4** (5 cols, +710px): resident_name, resident_email, application_date, screening_result, move_in_date
- **P5** (5 cols, +550px): concession_display, leasing_agent, lease_start_date, lease_end_date, lease_rent_amount

**4 filter groups:**
- `available`: Vacancy metrics
- `applied`: Application workflow
- `leased`: Executed leases
- `all`: Mixed view

**Role/Department restrictions:**
- Admin sees PII, screening, concessions
- Leasing sees applicant details, agents
- Finance sees rent amounts, concessions

---

## Documentation

- **Quick Start**: `/docs/tools/TABLE_CONFIG_QUICK_START.md`
- **Comprehensive Docs**: `/docs/tools/EXCEL_TABLE_CONFIG_TEMPLATE.md`
- **Parser Source**: `/utils/table-config-parser.ts`
- **Template Generator**: `/utils/generate-table-template.ts`
- **Example Generator**: `/utils/generate-availabilities-example.ts`

---

## Tips

✅ **DO:**
- Start with the most essential columns (ID, name, status)
- Aim for P1: 2-3 columns, P2: +3-4, P3: +2-3, P4: +4-5, P5: +4-5
- Use "all" for roles/departments unless you need restrictions
- Commit both `.xlsx` and `.generated.ts` files to version control

❌ **DON'T:**
- Edit the `priority` column manually (it auto-calculates)
- Put 5+ columns in P1 (too cramped on mobile)
- Forget to set `has_filter_groups = TRUE` if you define filter groups

---

**Questions?** See the Availabilities example or read the comprehensive docs.
