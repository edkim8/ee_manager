# Inventory System - Property Scoping
*Updated: 2026-02-18*

## Overview
The inventory system uses **property_code** to separate items across properties while keeping categories global.

## Design Pattern

### Categories - GLOBAL (Shared)
Categories are universal across all properties:
- ✅ "Refrigerators" - Used by all properties
- ✅ "Cabinets" - Used by all properties
- ✅ "HVAC Systems" - Used by all properties
- ✅ "Dishwashers" - Used by all properties

**Benefit:** Don't repeat category definitions for each property.

### Items - PROPERTY-SPECIFIC (Scoped)
Item definitions are scoped to individual properties via `property_code`:
- ❌ **Wrong:** One "Samsung RF28R7201SR" shared by WO and OB
- ✅ **Correct:** Two separate items:
  - "Samsung RF28R7201SR" (property_code = 'WO')
  - "Samsung RF28R7201SR" (property_code = 'OB')

**Benefit:** Each property maintains its own catalog of items.

## Why Separate Items by Property?

Even if WO and OB use the **same brand and model**, they need separate item records because:

1. **Different Suppliers/Pricing**
   - WO might buy from Home Depot
   - OB might buy from Lowe's
   - Different purchase prices, different invoices

2. **Different Warranties**
   - Each property has its own warranty documents
   - Different purchase dates = different warranty periods

3. **Different Configurations**
   - Same refrigerator model might have different finish options
   - Different photos showing actual installed units

4. **Operational Separation**
   - Property managers shouldn't see other properties' items
   - Inventory counts are property-specific
   - Reporting is property-based

5. **Different Maintenance Schedules**
   - Future: Track when items were installed at each property
   - Future: Different maintenance vendors per property

## Database Schema

```sql
-- Categories (GLOBAL)
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    expected_life_years INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true
    -- NO property_code column
);

-- Items (PROPERTY-SCOPED)
CREATE TABLE inventory_item_definitions (
    id UUID PRIMARY KEY,
    property_code TEXT NOT NULL,  -- ← Property scope
    category_id UUID REFERENCES inventory_categories(id),
    brand TEXT,
    model TEXT,
    manufacturer_part_number TEXT,
    description TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT fk_inventory_items_property
        FOREIGN KEY (property_code)
        REFERENCES properties(code)
        ON DELETE RESTRICT
);

-- Index for fast filtering
CREATE INDEX idx_inventory_items_property_code
    ON inventory_item_definitions(property_code);
```

## View with Property Scope

```sql
CREATE VIEW view_inventory_item_definitions AS
SELECT
    iid.id,
    iid.property_code,  -- ← Included in view
    iid.category_id,
    ic.name as category_name,
    ic.expected_life_years,
    iid.brand,
    iid.model,
    -- ... other fields
FROM inventory_item_definitions iid
JOIN inventory_categories ic ON ic.id = iid.category_id
WHERE iid.is_active = true;
```

## Composable Usage

```typescript
// Fetch items for active property only
const { activeProperty } = usePropertyState()
const { fetchItemDefinitions } = useInventoryItemDefinitions()

const items = await fetchItemDefinitions({
  propertyCode: activeProperty.value  // Filter by current property
})

// Create new item (auto-assigned to active property)
const newItem = await createItemDefinition({
  property_code: activeProperty.value,  // Required
  category_id: categoryId,
  brand: 'Samsung',
  model: 'RF28R7201SR',
  // ...
})
```

## UI Behavior

### Items Tab
- **Automatically filtered** to active property
- Shows property badge on each item card
- When switching properties, items list refreshes

### Categories Tab
- Shows **all categories** (not filtered by property)
- Categories are shared across properties

### Creating Items
- `property_code` is automatically set to `activeProperty.value`
- User doesn't need to select property (it's implicit)

### Property Badge Display
```vue
<span class="property-badge">{{ item.property_code }}</span>
```
- Small blue badge next to category name
- Makes it visually clear which property owns the item

## Example Scenario

### Property: WO (Woodlawn Overlook)
**Items visible:**
- Samsung RF28R7201SR (property_code = 'WO')
- GE Dishwasher DWT725SSJSS (property_code = 'WO')
- LG Washer/Dryer (property_code = 'WO')

### Property: OB (Oak Brook)
**Items visible:**
- Samsung RF28R7201SR (property_code = 'OB')  ← Different record!
- Whirlpool Dishwasher (property_code = 'OB')
- Speed Queen Washer (property_code = 'OB')

**Note:** Even though WO and OB both have "Samsung RF28R7201SR", these are **separate catalog entries** with different:
- Photos (showing actual units at each property)
- Invoices (from different purchases)
- Warranties (different purchase dates)
- Notes (property-specific installation details)

## Files Modified

### Migration
- `supabase/migrations/20260218000002_add_property_code_to_inventory_items.sql`
  - Added `property_code` column
  - Added foreign key to `properties.code`
  - Updated view to include `property_code`

### Composable
- `layers/base/composables/useInventoryItemDefinitions.ts`
  - Added `propertyCode` to `FetchItemsFilters`
  - Added `property_code` to `ItemDefinitionWithDetails` interface
  - Filter query includes `.eq('property_code', filters.propertyCode)`

### UI
- `layers/ops/pages/inventory/index.vue`
  - Imports `usePropertyState()` to get `activeProperty`
  - Passes `propertyCode` filter when fetching items
  - Auto-assigns `property_code` when creating items
  - Displays property badge on item cards

## Testing

1. ✅ Switch to property WO
2. ✅ Add item: Samsung RF28R7201SR
3. ✅ Verify property badge shows "WO"
4. ✅ Switch to property OB
5. ✅ Verify WO's Samsung is NOT visible
6. ✅ Add item: Samsung RF28R7201SR (same brand/model)
7. ✅ Verify property badge shows "OB"
8. ✅ Switch back to WO
9. ✅ Verify only WO's items are visible
10. ✅ Categories tab shows same categories regardless of property

## Future: Installations Table

When we add physical installations tracking:

```sql
CREATE TABLE inventory_installations (
    id UUID PRIMARY KEY,
    item_definition_id UUID REFERENCES inventory_item_definitions(id),
    property_code TEXT,  -- Inherited from item_definition
    serial_number TEXT,
    install_date DATE,
    location_type TEXT,  -- 'unit', 'building', 'location'
    location_id UUID,
    status TEXT,  -- 'active', 'maintenance', 'retired'
    -- ...
);
```

The installation will automatically inherit `property_code` from its `item_definition`, ensuring installations are always properly scoped.

## Key Principle

> **Categories are shared knowledge (global)**
> **Items are property inventory (scoped)**
> **Installations are physical assets (property + location scoped)**
