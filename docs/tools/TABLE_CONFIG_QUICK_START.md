# Table Configuration System - Quick Start Guide

> **Excel-based table column planning with auto-generated TypeScript code**

---

## What You Get

✅ **Visual column planning** in Excel spreadsheets
✅ **Auto-calculated priorities** based on cumulative width
✅ **TypeScript code generation** - no manual coding
✅ **Multi-dimensional visibility** - screen size, role, department, filter groups
✅ **QHD/4K optimization** - designed for modern displays

---

## 30-Second Workflow

```bash
# 1. Generate a blank template (one-time setup)
npx tsx utils/generate-table-template.ts configs/table-configs/my-table.xlsx

# 2. Open in Excel and fill in your columns

# 3. Parse and generate TypeScript code
npx tsx utils/table-config-parser.ts configs/table-configs/my-table.xlsx

# 4. Copy generated code into your Vue component
```

---

## Example: See It In Action

```bash
# Generate the Availabilities example (complete working example)
npx tsx utils/generate-availabilities-example.ts configs/table-configs/availabilities.xlsx

# Parse it to see the generated code
npx tsx utils/table-config-parser.ts configs/table-configs/availabilities.xlsx

# Open the generated file
cat configs/table-configs/availabilities.generated.ts
```

**What's in the example:**
- 21 columns across all 5 priority levels
- 4 filter groups (Available, Applied, Leased, All)
- Role restrictions (admin, leasing see extra columns)
- Department restrictions (finance, leasing, operations)

---

## Files Created

```
/configs/table-configs/
  ├── template.xlsx                    # Blank template
  ├── availabilities.xlsx              # Complete example
  ├── availabilities.generated.ts      # Auto-generated code
  └── (your tables here...)

/utils/
  ├── table-config-parser.ts           # Parser script
  ├── generate-table-template.ts       # Template generator
  └── generate-availabilities-example.ts # Example generator

/docs/tools/
  ├── EXCEL_TABLE_CONFIG_TEMPLATE.md   # Comprehensive docs
  └── TABLE_CONFIG_QUICK_START.md      # This file
```

---

## Excel Sheets Explained

When you open the template, you'll see 5 sheets:

### 1. Column Definitions ⭐ (Main sheet)
**This is where you work!**

| Column | What It Does |
|--------|--------------|
| `key` | TypeScript column key (e.g., `unit_name`) |
| `label` | Display label (e.g., "Unit") |
| `width` | Column width in pixels (e.g., `120`) |
| `sortable` | TRUE or FALSE |
| `align` | left, center, right, or blank |
| `priority` | **AUTO-CALCULATED** - Don't edit! |
| `roles` | Comma-separated or "all" |
| `departments` | Comma-separated or "all" |
| `filter_groups` | Comma-separated or "all" |
| `notes` | Your comments |

**The magic:** As you add columns, the `priority` column auto-calculates based on cumulative width.

### 2. Table Configuration
Key-value pairs for table metadata:
- `table_name`: Short name (e.g., "availabilities")
- `file_path`: Vue component path
- `has_filter_groups`: TRUE/FALSE
- `default_sort_field`: Column key
- Pagination, export, clickable rows settings

### 3. Filter Groups (Optional)
Define tabs/filters if your table has different "modes":
- `group_name`: Code name (e.g., "available")
- `label`: Display label (e.g., "Available Units")
- `description`: Optional notes

### 4. Priority Reference
**Read-only reference** showing breakpoint thresholds:
- P1: 0-350px (Mobile)
- P2: 351-780px (Tablet+)
- P3: 781-1140px (Desktop basic)
- P4: 1141-1880px (QHD baseline) ⭐
- P5: 1881px+ (4K enhanced)

### 5. Instructions
How-to guide embedded in the Excel file

---

## Priority Auto-Calculation

The secret sauce is this Excel formula in the `priority` column:

```excel
=IF(SUM($C$2:C2)<=350,"P1",IF(SUM($C$2:C2)<=780,"P2",IF(SUM($C$2:C2)<=1140,"P3",IF(SUM($C$2:C2)<=1880,"P4","P5"))))
```

**What it does:**
- Calculates cumulative width from first column to current row
- Assigns priority based on breakpoint thresholds
- Updates automatically as you add/remove/reorder columns

**Example:**
```
Row  | Column        | Width | Cumulative | Priority
-----|---------------|-------|------------|----------
1    | unit_name     | 90    | 90         | P1
2    | building_name | 150   | 240        | P1
3    | floor_plan    | 130   | 370        | P2  <- Jumped to P2!
4    | sf            | 80    | 450        | P2
5    | beds          | 70    | 520        | P2
...
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

**Rule of thumb:**
- P1: 2-3 columns (~250-350px)
- P2: +3-4 columns (~650-780px total)
- P3: +2-3 columns (~950-1140px total)
- P4: +4-5 columns (~1500-1880px total) ⭐ Desktop baseline
- P5: +4-5 columns (~2000-2520px total) 4K enhancement

---

## Generated Code Format

The parser creates clean, well-documented TypeScript code:

```typescript
// ============================================================
// AUTO-GENERATED from availabilities.xlsx
// Generated: 2026-02-15
// DO NOT EDIT MANUALLY - Edit Excel and regenerate
// ============================================================

const allColumns: TableColumn[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Mobile Essentials (3 columns, 320px total)
  // BREAKPOINT: base (no class)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '90px',
    align: 'center'
  },
  // ... P1 columns ...

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Tablet+ (4 columns, +410px → 730px total)
  // BREAKPOINT: hidden md:table-cell (768px+)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    key: 'floor_plan_name',
    label: 'Floor Plan',
    sortable: true,
    width: '130px',
    class: 'hidden md:table-cell',
    headerClass: 'hidden md:table-cell'
  },
  // ... P2 columns ...

  // ... P3, P4, P5 sections ...
]

// Filter Groups
const filterGroups = {
  available: ['unit_name', 'building_name', ...],
  applied: ['unit_name', 'resident_name', ...],
  leased: ['unit_name', 'lease_start_date', ...]
}

// Role-based column visibility
const roleColumns = {
  admin: ['resident_email', 'screening_result', ...],
  leasing: ['resident_name', 'leasing_agent', ...]
}

// Department-based column visibility
const departmentColumns = {
  finance: ['rent_offered', 'concession_display', ...],
  operations: ['vacant_days', 'move_out_date', ...]
}
```

---

## Tips & Best Practices

### ✅ DO:
- Start with the most essential columns (ID, name, status)
- Aim for P1: 2-3 columns, P2: +3-4, P3: +2-3, P4: +4-5, P5: +4-5
- Use "all" for roles/departments unless you need restrictions
- Test the generated code in your component
- Commit both `.xlsx` and `.generated.ts` files to version control

### ❌ DON'T:
- Edit the `priority` column manually (it auto-calculates)
- Put 5+ columns in P1 (too cramped on mobile)
- Forget to set `has_filter_groups = TRUE` if you define filter groups
- Skip the example - it's the best way to learn!

---

## Common Issues

### Priority jumped unexpectedly (P2 → P4)
**Cause:** Single column width pushed cumulative total past P3 threshold

**Fix:**
- Check cumulative width
- Reduce column widths in P2 range
- Or reorder columns (move expensive column later)

### Too many columns in P1
**Cause:** Column widths too small

**Fix:**
- Be ruthless - P1 should be 2-3 columns max
- Move "nice to have" columns to P2
- Increase P1 column widths slightly

### Column not appearing in filter group
**Cause:** `filter_groups` column doesn't include the group name

**Fix:**
- Add group name to `filter_groups` column: `available,all`
- Or use "all" to show in every group

---

## Next Steps

1. **Try the example:**
   ```bash
   npx tsx utils/generate-availabilities-example.ts configs/table-configs/availabilities.xlsx
   npx tsx utils/table-config-parser.ts configs/table-configs/availabilities.xlsx
   ```

2. **Create your first table:**
   ```bash
   npx tsx utils/generate-table-template.ts configs/table-configs/properties.xlsx
   # Open in Excel, fill in columns, then parse
   npx tsx utils/table-config-parser.ts configs/table-configs/properties.xlsx
   ```

3. **Apply to all tables:**
   - Properties
   - Buildings
   - Floor Plans
   - Units
   - Residents
   - Leases
   - Availabilities
   - Delinquencies
   - Alerts
   - Work Orders
   - Renewals

---

## Documentation

- **This file**: Quick start guide
- **EXCEL_TABLE_CONFIG_TEMPLATE.md**: Comprehensive documentation
- **Parser source**: `utils/table-config-parser.ts`
- **Example source**: `utils/generate-availabilities-example.ts`

---

**Questions?** See the Availabilities example: `configs/table-configs/availabilities.xlsx`
