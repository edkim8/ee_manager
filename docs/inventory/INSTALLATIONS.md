# Inventory Installations System
*Created: 2026-02-18*

## Overview
The installations table tracks **physical inventory items** installed at specific locations (units, buildings, common areas).

## Three-Tier Pattern

```
┌─────────────────────────────────────────────────────────┐
│ 1. CATEGORIES (Global - Shared across all properties)  │
│    Example: "Refrigerators", "HVAC Systems"            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ITEM DEFINITIONS (Property-Scoped Catalog)          │
│    Example: Samsung RF28R7201SR (WO property)          │
│    Example: Samsung RF28R7201SR (OB property)          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. INSTALLATIONS (Location-Scoped Physical Assets)     │
│    Example: Serial #123456 in Unit 101                 │
│    Example: Serial #789012 in Unit 205                 │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### inventory_installations Table

```sql
CREATE TABLE inventory_installations (
    id UUID PRIMARY KEY,

    -- Item Reference
    item_definition_id UUID → inventory_item_definitions.id (ON DELETE RESTRICT),
    property_code TEXT → properties.code,

    -- Physical Identification
    serial_number TEXT,
    asset_tag TEXT UNIQUE (per property),

    -- Installation Details
    install_date DATE,
    warranty_expiration DATE,
    purchase_price DECIMAL(10,2),
    supplier TEXT,

    -- Location (Polymorphic)
    location_type TEXT ('unit', 'building', 'common_area'),
    location_id UUID,

    -- Status
    status TEXT ('active', 'maintenance', 'retired', 'disposed'),
    condition TEXT ('excellent', 'good', 'fair', 'poor'),

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### view_inventory_installations

Enriched view with:
- Item details (brand, model, category)
- Location name (unit name, building name)
- **Lifecycle calculations:**
  - `age_years` - Time since install_date
  - `life_remaining_years` - Expected life minus age
  - `health_status` - healthy, warning, critical, expired
  - `warranty_status` - active, expiring_soon, expired

## Lifecycle Calculations

### Health Status
```
healthy   = age < 60% of expected_life
warning   = age 60-80% of expected_life
critical  = age 80-100% of expected_life
expired   = age > expected_life
```

**Example:** Refrigerator expected life = 15 years
- 0-9 years: healthy 🟢
- 9-12 years: warning 🟡
- 12-15 years: critical 🟠
- 15+ years: expired 🔴

### Warranty Status
```
active         = warranty_expiration > today
expiring_soon  = warranty_expiration within 90 days
expired        = warranty_expiration < today
```

## Deletion Protection

### Item Definition Deletion
**Before deleting an item from the catalog:**
```typescript
const canDelete = await canDeleteItemDefinition(itemId)
if (!canDelete) {
  throw new Error('Cannot delete: Active installations exist')
}
```

**Database enforces this via:**
- Foreign key: `ON DELETE RESTRICT`
- Composable checks installation count
- UI shows warning: "3 active installations"

### Safe Deletion Flow
1. User tries to delete item definition
2. System checks: `SELECT COUNT(*) FROM installations WHERE item_definition_id = ?`
3. If count > 0: Show error with count
4. If count = 0: Allow deletion

## Use Cases

### 1. Install New Refrigerator in Unit

```typescript
const { createInstallation } = useInventoryInstallations()

await createInstallation({
  item_definition_id: 'uuid-samsung-rf28',
  property_code: 'WO',
  serial_number: 'RF28R720123456',
  asset_tag: 'WO-REF-0101',
  install_date: '2024-01-15',
  warranty_expiration: '2025-01-15',
  purchase_price: 2499.99,
  supplier: 'Home Depot',
  location_type: 'unit',
  location_id: 'uuid-unit-101',
  status: 'active',
  condition: 'excellent',
  notes: 'Installed during unit turnover'
})
```

### 2. View All Assets in Unit 101

```typescript
const { getInstallationsByLocation } = useInventoryInstallations()

const assets = await getInstallationsByLocation(
  'unit',
  'uuid-unit-101',
  'WO'
)

// Returns: All active installations in Unit 101
```

### 3. Track Asset Lifecycle

```typescript
const { fetchInstallationWithDetails } = useInventoryInstallations()

const installation = await fetchInstallationWithDetails(installationId)

console.log({
  brand: installation.brand,           // "Samsung"
  model: installation.model,           // "RF28R7201SR"
  age: installation.age_years,         // 2
  remaining: installation.life_remaining_years,  // 13
  health: installation.health_status,  // "healthy"
  warranty: installation.warranty_status  // "expired"
})
```

### 4. Retire Old Asset

```typescript
const { updateInstallation } = useInventoryInstallations()

await updateInstallation(installationId, {
  status: 'retired',
  condition: 'poor',
  notes: 'Replaced due to compressor failure after 14 years'
})
```

### 5. Asset Moved to Different Unit

```typescript
await updateInstallation(installationId, {
  location_id: 'uuid-unit-205',
  notes: 'Moved from Unit 101 to Unit 205 during renovation'
})
```

## Composable API

### useInventoryInstallations()

**Fetch Methods:**
```typescript
fetchInstallations(filters?) → InstallationWithDetails[]
fetchInstallation(id) → Installation
fetchInstallationWithDetails(id) → InstallationWithDetails
getInstallationsByLocation(type, id, propertyCode?) → InstallationWithDetails[]
```

**CRUD Methods:**
```typescript
createInstallation(data) → Installation
updateInstallation(id, updates) → Installation
deleteInstallation(id) → void // Soft delete
```

**Utility Methods:**
```typescript
getInstallationCount(itemDefinitionId) → number
canDeleteItemDefinition(itemDefinitionId) → boolean
```

## Filters

```typescript
interface FetchInstallationsFilters {
  propertyCode?: string      // Filter by property
  itemDefinitionId?: string  // All installations of specific item
  locationType?: string      // 'unit', 'building', 'common_area'
  locationId?: string        // Specific location
  status?: string            // 'active', 'maintenance', 'retired', 'disposed'
  healthStatus?: string      // 'healthy', 'warning', 'critical', 'expired'
}
```

## RLS Policies

Property-scoped access:
```sql
-- Users can only access installations for properties they have access to
WHERE property_code IN (
  SELECT p.code FROM properties p
  JOIN property_roles pr ON pr.property_id = p.id
  WHERE pr.user_id = auth.uid()
)
```

## Example Scenarios

### Scenario 1: Unit Turnover
When Unit 101 turns over, need to install new appliances:
1. Create installation for Refrigerator (item_definition_id → catalog)
2. Create installation for Dishwasher
3. Create installation for Microwave
4. Each has: serial_number, install_date, warranty_expiration
5. All linked to location_type='unit', location_id=Unit 101 ID

### Scenario 2: Preventive Maintenance
Query all refrigerators with `health_status = 'warning'` or `'critical'`:
```typescript
const aging = await fetchInstallations({
  propertyCode: 'WO',
  healthStatus: 'warning'
})
// Returns list of refrigerators, HVAC, etc. approaching end of life
```

### Scenario 3: Warranty Tracking
Query assets with `warranty_status = 'expiring_soon'`:
```typescript
const expiringWarranties = await fetchInstallations({
  propertyCode: 'WO'
})
const filtered = expiringWarranties.filter(
  i => i.warranty_status === 'expiring_soon'
)
// Alert: "5 warranties expiring in next 90 days"
```

### Scenario 4: Asset Audit
View all assets in property:
```typescript
const allAssets = await fetchInstallations({
  propertyCode: 'WO',
  status: 'active'
})
// Group by location_type
const byUnit = allAssets.filter(a => a.location_type === 'unit')
const byBuilding = allAssets.filter(a => a.location_type === 'building')
```

## Files

### Migration
- `supabase/migrations/20260218000003_create_inventory_installations.sql`

### Composable
- `layers/base/composables/useInventoryInstallations.ts`

### Related
- `layers/base/composables/useInventoryItemDefinitions.ts` (updated with deletion check)

## Next Steps

UI components needed:
1. **Installations Management Page** - CRUD for installations
2. **Unit Assets Widget** - Show all installations in a unit
3. **Health Dashboard** - Show aging assets needing replacement
4. **Warranty Tracker** - Expiring warranties alert
5. **Installation Modal** - Add/edit installation with item selector

## Key Benefits

✅ **Prevents data duplication** - One catalog entry, many physical units
✅ **Tracks lifecycle** - Age, health, replacement timing
✅ **Warranty management** - Know when warranties expire
✅ **Location-aware** - Know exactly where each asset is
✅ **Deletion protection** - Can't delete catalog items in use
✅ **Property-scoped** - Each property manages own inventory
✅ **Audit trail** - created_by, created_at, updated_at tracking
