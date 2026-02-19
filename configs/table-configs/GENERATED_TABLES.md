# Generated Table Configurations

**Date**: 2026-02-15
**Status**: ✅ All 12 tables generated

---

## 📊 Summary

✅ **12 Excel configuration files** created from existing Vue components
📋 **98 total columns** across all tables
🎨 **Pre-calculated priorities** based on current column widths
🔐 **Role/department restrictions** preserved from existing tables

---

## 📁 Generated Files

### Assets Module (4 tables)

#### 1. **properties.xlsx** → `layers/ops/pages/assets/properties/index.vue`
- **8 columns**: code, name, website_url, street_address, city, state_code, total_unit_count, year_built
- **Priority Distribution**: P1:2, P2:3, P3:3
- **Key Features**: Property master list with website links

#### 2. **buildings.xlsx** → `layers/ops/pages/assets/buildings/index.vue`
- **5 columns**: name, unit_count, floor_plans_data, street_address, floor_count
- **Priority Distribution**: P1:2, P2:2, P3:1
- **Key Features**: Building inventory with floor plan associations

#### 3. **floor_plans.xlsx** → `layers/ops/pages/assets/floor-plans/index.vue`
- **7 columns**: code, marketing_name, bedroom_count, bathroom_count, sf, unit_count, base_rent
- **Priority Distribution**: P1:2, P2:5
- **Key Features**: Floor plan types with base pricing
- **Restrictions**: base_rent (admin, finance only)

#### 4. **units.xlsx** → `layers/ops/pages/assets/units/index.vue`
- **9 columns**: unit_name, building_name, resident_name, floor_plan_marketing_name, sf, tenancy_status, move_in_date, move_out_date, floor_number
- **Priority Distribution**: P1:2, P2:3, P3:3, P4:1
- **Key Features**: Unit inventory with current occupancy
- **Restrictions**: resident_name (admin, leasing only)

---

### Office Module (6 tables)

#### 5. **residents.xlsx** → `layers/ops/pages/office/residents/index.vue`
- **9 columns**: last_name, first_name, unit_name, status, email, phone, move_in_date, move_out_date, lease_end_date
- **Priority Distribution**: P1:2, P2:3, P3:3, P4:1
- **Filter Groups**: current, future, past, all
- **Key Features**: Resident directory with contact info
- **Restrictions**: email, phone (admin, leasing only - PII)

#### 6. **leases.xlsx** → `layers/ops/pages/office/leases/index.vue`
- **8 columns**: unit_name, resident_name, lease_start_date, lease_end_date, term_months, rent_amount, status, lease_type
- **Priority Distribution**: P1:2, P2:4, P3:2
- **Key Features**: Lease registry with rent amounts
- **Restrictions**: rent_amount (admin, finance only)

#### 7. **alerts.xlsx** → `layers/ops/pages/office/alerts/index.vue`
- **7 columns**: unit_name, alert_type, severity, description, created_at, resolved_at, assigned_to
- **Priority Distribution**: P1:3, P2:2, P3:2
- **Filter Groups**: active, resolved, all
- **Key Features**: Operational alerts and notifications
- **Restrictions**: assigned_to (admin, manager only)

#### 8. **delinquencies.xlsx** → `layers/ops/pages/office/delinquencies/index.vue`
- **7 columns**: unit_name, resident_name, balance_amount, days_overdue, last_payment_date, last_payment_amount, status
- **Priority Distribution**: P1:2, P2:4, P3:1
- **Key Features**: Delinquent resident tracking
- **Restrictions**: balance_amount, last_payment_amount (admin, finance only)

#### 9. **renewals.xlsx** → `layers/ops/pages/office/renewals/index.vue`
- **11 columns**: unit_name, resident_name, lease_end_date, days_until_expiration, current_rent, renewal_rent, increase_amount, increase_percent, status, offer_date, response_date
- **Priority Distribution**: P1:2, P2:4, P3:4, P4:1
- **Filter Groups**: upcoming, offered, accepted, declined, all
- **Key Features**: Lease renewal workflow
- **Restrictions**: rent fields (admin, finance only)

#### 10. **renewal_items_standard.xlsx** → `layers/ops/pages/office/renewals/items-standard.vue`
- **9 columns**: unit_name, resident_name, floor_plan, lease_end_date, current_rent, market_rent, recommended_rent, proposed_rent, term_months
- **Priority Distribution**: P1:2, P2:4, P3:3
- **Key Features**: Standard lease renewals with pricing recommendations
- **Restrictions**: All rent fields (admin, finance only)

#### 11. **renewal_items_mtm.xlsx** → `layers/ops/pages/office/renewals/items-mtm.vue`
- **9 columns**: unit_name, resident_name, floor_plan, mtm_start_date, days_on_mtm, current_rent, market_rent, proposed_rent, last_increase_date
- **Priority Distribution**: P1:2, P2:4, P3:3
- **Key Features**: Month-to-month lease tracking
- **Restrictions**: rent fields (admin, finance only)

---

### Maintenance Module (1 table)

#### 12. **work_orders.xlsx** → `layers/ops/pages/maintenance/work-orders/index.vue`
- **9 columns**: work_order_number, unit_name, category, priority, description, assigned_to, created_at, completed_at, status
- **Priority Distribution**: P1:3, P2:2, P3:3, P4:1
- **Filter Groups**: open, in_progress, completed, all
- **Key Features**: Maintenance work order tracking
- **Restrictions**: assigned_to (maintenance, operations only)

---

## 🎯 How to Use These Files

### 1. Review and Customize
Open each Excel file and adjust as needed:
- **Reorder columns** by dragging rows in Sheet 1
- **Adjust widths** to change priority distribution
- **Add/remove columns** to match your requirements
- **Modify roles/departments** to match your security model
- **Update filter groups** if your tables have tabs/filters

### 2. Generate TypeScript Code
For each table you want to implement:

```bash
# Example: Generate code for Properties table
npx tsx utils/table-config-parser.ts configs/table-configs/properties.xlsx

# This creates: configs/table-configs/properties.generated.ts
```

### 3. Copy to Vue Component
Copy the generated code into your Vue component:

```vue
<script setup lang="ts">
import type { TableColumn } from '@/layers/table/types'

// Copy from properties.generated.ts
const allColumns: TableColumn[] = [
  // ... generated columns with responsive classes ...
]

// If applicable
const filterGroups = { ... }
const roleColumns = { ... }
const departmentColumns = { ... }
</script>

<template>
  <GenericDataTable
    :data="filteredData"
    :columns="allColumns"
    <!-- ... other props ... -->
  />
</template>
```

### 4. Batch Processing
To regenerate all tables at once:

```bash
# Create a script or run individually
for file in configs/table-configs/*.xlsx; do
  if [[ "$file" != *"template.xlsx" && "$file" != *"availabilities.xlsx" ]]; then
    echo "Parsing: $file"
    npx tsx utils/table-config-parser.ts "$file"
  fi
done
```

---

## 📋 Priority Distribution Summary

| Priority | Tables | Avg Columns | Notes |
|----------|--------|-------------|-------|
| **P1** (0-350px) | All 12 | 2.2 | Mobile essentials - unit/name/ID |
| **P2** (351-780px) | All 12 | 3.4 | Tablet+ context |
| **P3** (781-1140px) | 10 tables | 2.5 | Desktop basic |
| **P4** (1141-1880px) | 5 tables | 1.0 | QHD enhanced |
| **P5** (1881px+) | 0 tables | 0 | Available for expansion |

**Note**: Most tables fit comfortably in P1-P3 range. Tables with 9+ columns reach P4 (QHD baseline).

---

## 🔐 Security Summary

### Role Restrictions Applied

| Role | Restricted Columns | Tables Affected |
|------|-------------------|-----------------|
| **admin, finance** | All rent/payment amounts | floor_plans, units, leases, delinquencies, renewals (3 tables) |
| **admin, leasing** | Contact PII (email, phone), resident names | residents, units |
| **admin, manager** | Assignment fields | alerts |

### Department Restrictions Applied

| Department | Access | Tables |
|------------|--------|--------|
| **finance** | Rent amounts, payment data | 6 tables |
| **leasing** | Resident contact info, renewal data | 4 tables |
| **operations** | Operational dates, assignments | 5 tables |
| **maintenance** | Work order assignments | 1 table |

---

## ✅ Verification Checklist

Before using the generated code:

- [ ] **Review column order** - Does P1 show the right mobile columns?
- [ ] **Check widths** - Do priorities make sense for your data?
- [ ] **Verify restrictions** - Are sensitive fields properly protected?
- [ ] **Test filter groups** - Do columns show in the right tabs/filters?
- [ ] **Validate alignment** - Are numbers right-aligned?
- [ ] **Test responsiveness** - Resize browser to verify column hiding

---

## 🔄 Regeneration

If you need to regenerate all configs from scratch:

```bash
# Regenerate all 12 table configurations
npx tsx utils/generate-all-table-configs.ts

# Parse all generated files
for file in configs/table-configs/{properties,buildings,floor_plans,units,residents,leases,alerts,delinquencies,work_orders,renewals,renewal_items_standard,renewal_items_mtm}.xlsx; do
  npx tsx utils/table-config-parser.ts "$file"
done
```

---

## 📚 Documentation

- **Quick Start**: `/docs/tools/TABLE_CONFIG_QUICK_START.md`
- **Template Docs**: `/docs/tools/EXCEL_TABLE_CONFIG_TEMPLATE.md`
- **Parser Source**: `/utils/table-config-parser.ts`
- **Generator Source**: `/utils/generate-all-table-configs.ts`

---

**Generated**: 2026-02-15 via `generate-all-table-configs.ts`

**Ready to use!** Open any .xlsx file in Excel to review and customize.
