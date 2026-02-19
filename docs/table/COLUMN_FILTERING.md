# Column Filtering System

> **Role and Department-Based Column Visibility**

---

## 🏗️ Architecture

### User Access Model

```
profiles (Global - One per user)
  ├── department: 'Leasing' | 'Maintenance' | 'Management'
  └── is_super_admin: boolean

user_property_access (Property-Specific - Many per user)
  ├── user_id: uuid
  ├── property_code: text
  └── role: 'Owner' | 'Staff' | 'Manager' | 'RPM' | 'Asset'
```

**Key Insight**:
- **Department** is global (same across all properties)
- **Role** is property-specific (can vary by property)
- **Super Admin** bypasses all restrictions

---

## 📐 Filtering Logic

### Logic Rules

**Within each field: OR (any match passes)**
```typescript
roles: ['Owner', 'Manager', 'RPM']
// User must have role = Owner OR Manager OR RPM
```

**Between fields: AND (must pass both)**
```typescript
Column visible IF:
  (user.role IN column.roles OR 'all' IN column.roles)
  AND
  (user.department IN column.departments OR 'all' IN column.departments)
```

### Special Cases

1. **Super Admin**: Bypasses ALL restrictions
2. **'all' value**: Bypasses that specific check
3. **Undefined/null**: Treated as `['all']` (no restriction)

---

## 💡 Examples

### Example 1: Financial Data (Highly Restricted)

```typescript
{
  key: 'current_rent',
  label: 'Current Rent',
  roles: ['Owner', 'Manager', 'RPM'],
  departments: ['Management']
}
```

**Who can see this column:**

| User Role | User Dept | Visible? | Reason |
|-----------|-----------|----------|--------|
| Owner | Management | ✅ | Owner (role ✅) AND Management (dept ✅) |
| Owner | Leasing | ❌ | Owner (role ✅) AND Leasing (dept ❌) |
| Manager | Management | ✅ | Manager (role ✅) AND Management (dept ✅) |
| Manager | Leasing | ❌ | Manager (role ✅) AND Leasing (dept ❌) |
| RPM | Management | ✅ | RPM (role ✅) AND Management (dept ✅) |
| Staff | Management | ❌ | Staff (role ❌) AND Management (dept ✅) |
| Super Admin | Any | ✅ | Bypasses all restrictions |

### Example 2: Contact PII (Moderately Restricted)

```typescript
{
  key: 'email',
  label: 'Email',
  roles: ['Manager', 'RPM'],
  departments: ['Leasing', 'Management']
}
```

**Who can see this column:**

| User Role | User Dept | Visible? | Reason |
|-----------|-----------|----------|--------|
| Manager | Leasing | ✅ | Manager (role ✅) AND Leasing (dept ✅) |
| Manager | Management | ✅ | Manager (role ✅) AND Management (dept ✅) |
| Manager | Maintenance | ❌ | Manager (role ✅) AND Maintenance (dept ❌) |
| RPM | Leasing | ✅ | RPM (role ✅) AND Leasing (dept ✅) |
| Staff | Leasing | ❌ | Staff (role ❌) AND Leasing (dept ✅) |

### Example 3: Operational Data (Department-Restricted)

```typescript
{
  key: 'assigned_to',
  label: 'Assigned To',
  roles: ['all'],
  departments: ['Maintenance', 'Management']
}
```

**Who can see this column:**

| User Role | User Dept | Visible? | Reason |
|-----------|-----------|----------|--------|
| Owner | Maintenance | ✅ | Any role (✅) AND Maintenance (dept ✅) |
| Staff | Maintenance | ✅ | Any role (✅) AND Maintenance (dept ✅) |
| Manager | Management | ✅ | Any role (✅) AND Management (dept ✅) |
| Manager | Leasing | ❌ | Any role (✅) AND Leasing (dept ❌) |

### Example 4: Public Data (No Restrictions)

```typescript
{
  key: 'unit_name',
  label: 'Unit',
  roles: ['all'],
  departments: ['all']
}
```

**Who can see this column:**

| User Role | User Dept | Visible? | Reason |
|-----------|-----------|----------|--------|
| Any | Any | ✅ | 'all' bypasses both checks |

---

## 🔧 Implementation

### 1. Column Definition (Generated from Excel)

```typescript
import type { TableColumn } from '@/layers/table/types'

const allColumns: TableColumn[] = [
  {
    key: 'unit_name',
    label: 'Unit',
    sortable: true,
    width: '100px',
    roles: ['all'],
    departments: ['all']
  },
  {
    key: 'current_rent',
    label: 'Current Rent',
    sortable: true,
    width: '120px',
    align: 'right',
    roles: ['Owner', 'Manager', 'RPM'],
    departments: ['Management']
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
    width: '200px',
    roles: ['Manager', 'RPM'],
    departments: ['Leasing', 'Management']
  }
]
```

### 2. Get User's Role and Department

```typescript
// Composable to get current user's access
import { useSupabaseClient, useUser } from '#imports'

export function useUserAccess() {
  const supabase = useSupabaseClient()
  const user = useUser()

  // Get profile (department, super admin)
  const { data: profile } = await useAsyncData('user-profile', async () => {
    if (!user.value) return null

    const { data } = await supabase
      .from('profiles')
      .select('department, is_super_admin')
      .eq('id', user.value.id)
      .single()

    return data
  })

  // Get role for current property
  const { data: access } = await useAsyncData('user-property-access', async () => {
    if (!user.value || !activeProperty.value) return null

    const { data } = await supabase
      .from('user_property_access')
      .select('role')
      .eq('user_id', user.value.id)
      .eq('property_code', activeProperty.value)
      .single()

    return data
  })

  const userRole = computed(() => access.value?.role)
  const userDepartment = computed(() => profile.value?.department)
  const isSuperAdmin = computed(() => profile.value?.is_super_admin || false)

  return {
    userRole,
    userDepartment,
    isSuperAdmin
  }
}
```

### 3. Filter Columns in Component

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { filterColumnsByAccess } from '@/layers/table/composables/useTableColumns'
import { useUserAccess } from '@/layers/base/composables/useUserAccess'

// Your column definitions (from generated Excel code)
const allColumns: TableColumn[] = [
  // ... columns ...
]

// Get current user's access
const { userRole, userDepartment, isSuperAdmin } = useUserAccess()

// Filter columns based on role and department
const visibleColumns = computed(() =>
  filterColumnsByAccess(allColumns, {
    userRole: userRole.value,
    userDepartment: userDepartment.value,
    isSuperAdmin: isSuperAdmin.value
  })
)
</script>

<template>
  <GenericDataTable
    :data="data"
    :columns="visibleColumns"
    <!-- ... other props ... -->
  />
</template>
```

### 4. With Filter Groups (Optional)

For tables with tabs/filters (e.g., Residents with Current/Future/Past):

```vue
<script setup lang="ts">
const activeFilter = ref('current')

const visibleColumns = computed(() =>
  filterColumnsByAccess(allColumns, {
    userRole: userRole.value,
    userDepartment: userDepartment.value,
    isSuperAdmin: isSuperAdmin.value,
    filterGroup: activeFilter.value // Filter by tab
  })
)
</script>
```

---

## 📋 Column Definition Guidelines

### Setting Restrictions in Excel

When configuring columns in the Excel files:

**Column G: roles**
```
Owner,Manager,RPM    # Financial data
Manager,RPM          # PII contact info
all                  # Public data
```

**Column H: departments**
```
Management           # Financial operations
Leasing,Management   # Leasing operations
Maintenance          # Maintenance operations
all                  # All departments
```

### Recommended Patterns

#### 🔴 Financial Data (Owners, Managers, RPMs in Management)
```typescript
roles: ['Owner', 'Manager', 'RPM']
departments: ['Management']
```

**Examples**: current_rent, renewal_rent, balance_amount, increase_amount

#### 🟡 Contact PII (Managers, RPMs in Leasing/Management)
```typescript
roles: ['Manager', 'RPM']
departments: ['Leasing', 'Management']
```

**Examples**: email, phone, screening_result

#### 🟢 Operational Assignments (All roles in relevant department)
```typescript
roles: ['all']
departments: ['Maintenance', 'Management']
```

**Examples**: assigned_to (work orders), leasing_agent

#### ⚪ Public Data (Everyone)
```typescript
roles: ['all']
departments: ['all']
```

**Examples**: unit_name, status, building_name, floor_plan

---

## 🧪 Testing Column Visibility

### Test Scenarios

Create test users with different role/department combinations:

```typescript
// Test user matrix
const testUsers = [
  { role: 'Owner', dept: 'Management' },      // Should see everything
  { role: 'Manager', dept: 'Management' },    // Should see financial + operational
  { role: 'Manager', dept: 'Leasing' },       // Should see PII but not financial
  { role: 'Staff', dept: 'Leasing' },         // Should see basic + operational
  { role: 'Staff', dept: 'Maintenance' },     // Should see work assignments
]
```

### Verification Checklist

For each table:
- [ ] Financial columns only visible to Owner/Manager/RPM + Management
- [ ] Contact PII only visible to Manager/RPM + Leasing/Management
- [ ] Work assignments only visible to Maintenance/Management departments
- [ ] Public data visible to all users
- [ ] Super admin sees all columns
- [ ] Filter groups work correctly with role/department filtering

---

## 🔍 Debugging

### Check Column Visibility

```typescript
import { canShowColumn } from '@/layers/table/composables/useTableColumns'

// Test if a specific column is visible
const column = {
  key: 'current_rent',
  roles: ['Owner', 'Manager', 'RPM'],
  departments: ['Management']
}

const isVisible = canShowColumn(
  column,
  'Manager',      // userRole
  'Management',   // userDepartment
  false           // isSuperAdmin
)

console.log('Column visible?', isVisible) // true
```

### Common Issues

**Column not showing when it should:**
- Check if user's role matches one in `column.roles[]`
- Check if user's department matches one in `column.departments[]`
- Verify both checks pass (AND logic)

**Column showing when it shouldn't:**
- Check if column has `'all'` in roles or departments
- Check if user is a super admin
- Verify role/department data is loading correctly

---

## 📚 API Reference

### `canShowColumn()`

```typescript
function canShowColumn(
  column: TableColumn,
  userRole?: string,
  userDepartment?: string,
  isSuperAdmin?: boolean
): boolean
```

Checks if a single column should be visible.

**Returns**: `true` if column is visible, `false` otherwise

### `filterColumnsByAccess()`

```typescript
function filterColumnsByAccess(
  columns: TableColumn[],
  options: {
    userRole?: string
    userDepartment?: string
    isSuperAdmin?: boolean
    filterGroup?: string
  }
): TableColumn[]
```

Filters an array of columns based on access rules.

**Returns**: Array of visible columns

---

## ✅ Summary

✅ **Role** from `user_property_access.role` (property-specific)
✅ **Department** from `profiles.department` (global)
✅ **Super Admin** from `profiles.is_super_admin` (bypasses all)
✅ **OR logic** within roles[] and departments[]
✅ **AND logic** between roles and departments
✅ **'all' value** bypasses that specific check

This system provides flexible, granular control over column visibility based on user permissions! 🚀
