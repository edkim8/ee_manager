# Inventory Composables - Quick Reference

**Date:** 2026-02-18
**Status:** ✅ Complete

---

## 📦 Available Composables

### 1. **useInventoryCategories**
Manage asset type categories (Refrigerator, HVAC, Carpet, etc.)

**Methods:**
- `fetchCategories()` - Get all active categories
- `fetchCategory(id)` - Get single category
- `createCategory(data)` - Add custom category
- `updateCategory(id, updates)` - Edit category
- `deleteCategory(id)` - Soft delete

---

### 2. **useInventoryItems**
Manage physical asset instances with polymorphic location support

**Methods:**
- `fetchItems(filters?)` - Get items with optional filtering
- `fetchItemsByLocation(type, id)` - Reverse search by location
- `fetchItem(id)` - Get single item
- `fetchItemWithLifecycle(id)` - Get item with health status
- `createItem(data)` - Add new item
- `updateItem(id, updates)` - Edit item
- `deleteItem(id)` - Soft delete
- `fetchLocationSummary(type, id)` - Get health summary for location

**Filters:**
```typescript
{
  propertyCode?: string
  locationType?: 'unit' | 'building' | 'location'
  locationId?: string
  categoryId?: string
  status?: 'active' | 'retired' | 'replaced'
  healthStatus?: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
}
```

---

### 3. **useInventoryHistory**
Manage event ledger (install, refinish, replace, repair, retire)

**Methods:**
- `fetchHistory(itemId)` - Get event timeline
- `fetchEvent(id)` - Get single event
- `addEvent(data)` - Create new event
- `fetchLatestEvent(itemId)` - Get most recent event
- `fetchEventsByType(itemId, type)` - Filter by event type
- `calculateTotalCost(itemId)` - Sum of all event costs
- `addInstallEvent(itemId, data)` - Helper for install
- `addRefinishEvent(itemId, data)` - Helper for refinish

---

### 4. **useInventoryLifecycle**
Helper utilities for health calculations and display

**Methods:**
- `calculateAge(installDate)` - Age in years
- `calculateLifeRemaining(installDate, expectedLife)` - Years remaining
- `calculateHealthStatus(installDate, expectedLife)` - Health status
- `calculateLifecycleProgress(installDate, expectedLife)` - Progress % (0-100)
- `getHealthColor(status)` - Color for badges
- `getHealthLabel(status)` - Display label
- `formatLifeRemaining(installDate, expectedLife)` - Human-readable
- `getRecommendedAction(status)` - Action suggestion
- `needsAttention(status)` - Boolean for alerts
- `getPriorityLevel(status)` - Priority 1-5

---

## 🚀 Usage Examples

### Example 1: Show All Items in a Unit
```vue
<script setup>
const { fetchItemsByLocation } = useInventoryItems()
const { getHealthColor } = useInventoryLifecycle()

const props = defineProps<{ unitId: string }>()
const items = ref([])

onMounted(async () => {
  items.value = await fetchItemsByLocation('unit', props.unitId)
})
</script>

<template>
  <div>
    <h2>Unit Assets</h2>
    <div v-for="item in items" :key="item.id">
      <span>{{ item.category_name }}</span>
      <span>{{ item.brand }} {{ item.model }}</span>
      <UBadge :color="getHealthColor(item.health_status)">
        {{ item.health_status }}
      </UBadge>
    </div>
  </div>
</template>
```

---

### Example 2: Create New Item with Photo
```vue
<script setup>
const { createItem } = useInventoryItems()
const { addAttachment } = useAttachments()
const { addInstallEvent } = useInventoryHistory()

const handleSubmit = async (formData: any, photoFile: File) => {
  // 1. Create item
  const item = await createItem({
    category_id: formData.categoryId,
    brand: formData.brand,
    model: formData.model,
    serial_number: formData.serialNumber,
    install_date: formData.installDate,
    location_type: 'unit',
    location_id: formData.unitId,
    property_code: formData.propertyCode,
    status: 'active',
  })

  // 2. Upload photo (auto-compressed)
  const attachment = await addAttachment(
    item.id,
    'inventory_item',
    photoFile,
    'image'
  )

  // 3. Log install event
  await addInstallEvent(item.id, {
    event_date: formData.installDate,
    description: 'Initial installation',
    cost: formData.cost,
    vendor: formData.vendor,
    attachment_id: attachment.id,
  })

  console.log('✅ Item created with photo and install event')
}
</script>
```

---

### Example 3: Display Health Dashboard
```vue
<script setup>
const { fetchItems } = useInventoryItems()
const { needsAttention, getPriorityLevel } = useInventoryLifecycle()

const items = ref([])
const criticalItems = computed(() =>
  items.value
    .filter(i => needsAttention(i.health_status))
    .sort((a, b) => getPriorityLevel(b.health_status) - getPriorityLevel(a.health_status))
)

onMounted(async () => {
  items.value = await fetchItems({ propertyCode: 'PROP001' })
})
</script>

<template>
  <div>
    <h2>Items Needing Attention: {{ criticalItems.length }}</h2>
    <div v-for="item in criticalItems" :key="item.id">
      <span>{{ item.category_name }} in {{ item.unit_name }}</span>
      <span>Priority: {{ getPriorityLevel(item.health_status) }}</span>
      <span>{{ getRecommendedAction(item.health_status) }}</span>
    </div>
  </div>
</template>
```

---

### Example 4: Event Timeline
```vue
<script setup>
const { fetchHistory } = useInventoryHistory()

const props = defineProps<{ itemId: string }>()
const history = ref([])

onMounted(async () => {
  history.value = await fetchHistory(props.itemId)
})

const eventIcons = {
  install: '🔧',
  refinish: '🎨',
  replace: '🔄',
  repair: '⚙️',
  retire: '🗑️',
}
</script>

<template>
  <div>
    <h3>Event History</h3>
    <div v-for="event in history" :key="event.id" class="timeline-item">
      <span>{{ eventIcons[event.event_type] }}</span>
      <span>{{ event.event_type }}</span>
      <span>{{ event.event_date }}</span>
      <p v-if="event.description">{{ event.description }}</p>
      <span v-if="event.cost">${{ event.cost }}</span>
      <img v-if="event.attachment" :src="event.attachment.file_url" alt="Event photo" />
    </div>
  </div>
</template>
```

---

### Example 5: Location Summary Widget
```vue
<script setup>
const { fetchLocationSummary } = useInventoryItems()

const props = defineProps<{
  locationType: 'unit' | 'building' | 'location'
  locationId: string
}>()

const summary = ref(null)

onMounted(async () => {
  summary.value = await fetchLocationSummary(props.locationType, props.locationId)
})
</script>

<template>
  <div v-if="summary" class="summary-card">
    <h3>Asset Health Summary</h3>
    <div class="stats">
      <div class="stat">
        <span class="count">{{ summary.total_items }}</span>
        <span class="label">Total Assets</span>
      </div>
      <div class="stat expired">
        <span class="count">{{ summary.expired_count }}</span>
        <span class="label">Expired</span>
      </div>
      <div class="stat critical">
        <span class="count">{{ summary.critical_count }}</span>
        <span class="label">Critical</span>
      </div>
      <div class="stat warning">
        <span class="count">{{ summary.warning_count }}</span>
        <span class="label">Warning</span>
      </div>
      <div class="stat healthy">
        <span class="count">{{ summary.healthy_count }}</span>
        <span class="label">Healthy</span>
      </div>
    </div>
    <p class="avg-age">Average Age: {{ summary.avg_age_years }} years</p>
  </div>
</template>
```

---

## 🎯 Common Patterns

### Pattern 1: Photo Upload Flow
1. Create item → 2. Upload photo → 3. Log install event with attachment_id

### Pattern 2: Reverse Search
Use `fetchItemsByLocation()` to show all assets in a specific unit/building

### Pattern 3: Health Monitoring
Filter by `healthStatus: 'critical'` or use `needsAttention()` helper

### Pattern 4: Cost Tracking
Use `calculateTotalCost()` + events with `cost` field

---

## 📚 Type Definitions

All types are generated from the database schema in `types/supabase.ts`.

**Key Types:**
- `InventoryItem` - Raw table row
- `InventoryItemWithLifecycle` - View with calculated fields
- `InventoryHistory` - Event record
- `InventoryCategory` - Asset type

---

## ✅ Ready For

- UI component development
- Test page creation
- Integration into existing pages
- Mobile QR code scanner

---

**Next:** Build UI components or create test page to verify composables work!
