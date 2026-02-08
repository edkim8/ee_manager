# Simple Components - Reusable UI Utilities

**Date Created:** 2026-02-07
**Status:** Active - Use These Instead of Nuxt UI
**Location:** `/layers/base/components/`

## Overview

We've created simple, reliable Vue components to replace problematic Nuxt UI components. These are built with pure Vue, HTML, and CSS - no magic, full control, and predictable behavior.

---

## ⚠️ IMPORTANT: Why We Avoid Nuxt UI Components

### Problems Encountered with Nuxt UI:

1. **UModal / overlay.create()**
   - **Issue:** Props are completely stripped - even refs don't work
   - **Symptom:** Modal receives empty objects, props show as `undefined`
   - **Impact:** Cannot pass any data to modals opened via overlay.create()
   - **Date Discovered:** 2026-02-07 during Floor Plan Pricing Manager implementation

2. **UTabs**
   - **Issue:** Complex lifecycle, rendering issues, unpredictable slot behavior
   - **Symptom:** Content renders outside tabs, breaks reactivity
   - **Impact:** Tab content doesn't update correctly
   - **Date Discovered:** Previous implementation (see SESSION_2026_02_07)

3. **General Nuxt UI Issues:**
   - Black box behavior - hard to debug
   - Accessibility warnings spam console
   - Over-engineered for simple use cases
   - Breaking changes between versions
   - Hidden dependencies and side effects

### When to Use Nuxt UI vs Simple Components:

| Component Type | Use Nuxt UI | Use Simple Components |
|---------------|-------------|----------------------|
| Buttons | ✅ Yes (UButton works well) | ❌ Not needed |
| Input Fields | ✅ Yes (UInput works well) | ❌ Not needed |
| Cards | ✅ Yes (UCard is fine) | ❌ Not needed |
| Icons | ✅ Yes (UIcon is fine) | ❌ Not needed |
| **Modals** | ❌ **NO - Use SimpleModal** | ✅ **Always use SimpleModal** |
| **Tabs** | ❌ **NO - Use SimpleTabs** | ✅ **Always use SimpleTabs** |
| Overlays | ❌ NO - overlay.create() is broken | ✅ Use v-model pattern |
| Dropdowns | ⚠️ Proceed with caution | ✅ Consider simple version |

---

## 📦 Available Simple Components

### 1. SimpleModal

**Location:** `layers/base/components/SimpleModal.vue`

**Purpose:** Reliable modal dialog with proper prop passing and v-model control.

**Features:**
- ✅ Props work correctly (unlike UModal)
- ✅ Click outside to close
- ✅ Smooth transitions
- ✅ Prevents body scroll when open
- ✅ Escape key support
- ✅ Customizable width
- ✅ Full control over styling

**Usage Example:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import SimpleModal from '~/layers/base/components/SimpleModal.vue'
import MyModalContent from './MyModalContent.vue'

const showModal = ref(false)
const selectedItem = ref(null)

const openModal = (item) => {
  selectedItem.value = item
  showModal.value = true
}

const handleClose = (saved: boolean) => {
  showModal.value = false
  if (saved) {
    // Handle save
  }
  selectedItem.value = null
}
</script>

<template>
  <div>
    <button @click="openModal(someItem)">Open Modal</button>

    <SimpleModal
      v-model="showModal"
      title="Edit Item"
      width="max-w-4xl"
    >
      <MyModalContent
        v-if="selectedItem"
        :item="selectedItem"
        :on-close="handleClose"
      />
    </SimpleModal>
  </div>
</template>
```

**Props:**
- `modelValue: boolean` - Controls modal visibility (v-model)
- `title?: string` - Optional modal title (shows close button in header)
- `width?: string` - Tailwind width class (default: `w-full max-w-4xl`)

**Events:**
- `update:modelValue` - Emitted when modal should close

**Width Options:**
- `max-w-sm` - Small (384px)
- `max-w-md` - Medium (448px)
- `max-w-lg` - Large (512px)
- `max-w-xl` - Extra Large (576px)
- `max-w-2xl` - 2X Large (672px)
- `max-w-4xl` - 4X Large (896px)
- `max-w-7xl` - 7X Large (1280px) - **Used for Floor Plan Pricing Modal**

---

### 2. SimpleTabs

**Location:** `layers/base/components/SimpleTabs.vue`

**Purpose:** Clean, predictable tab navigation with slot-based content.

**Features:**
- ✅ Simple v-model for active tab
- ✅ Slot-based content rendering
- ✅ Clean visual design with active indicator
- ✅ No lifecycle issues
- ✅ Fully customizable

**Usage Example:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import SimpleTabs from '~/layers/base/components/SimpleTabs.vue'

const activeTab = ref('manual')

const tabs = [
  { value: 'manual', label: 'Manual Selection', icon: 'i-heroicons-adjustments-horizontal' },
  { value: 'auto', label: 'Auto Solve', icon: 'i-heroicons-sparkles' },
  { value: 'history', label: 'History', icon: 'i-heroicons-clock' }
]
</script>

<template>
  <SimpleTabs v-model="activeTab" :items="tabs">
    <!-- Tab 1: Manual -->
    <template #manual>
      <div class="p-4">
        <h3>Manual Selection Content</h3>
        <!-- Your content here -->
      </div>
    </template>

    <!-- Tab 2: Auto -->
    <template #auto>
      <div class="p-4">
        <h3>Auto Solve Content</h3>
        <!-- Your content here -->
      </div>
    </template>

    <!-- Tab 3: History -->
    <template #history>
      <div class="p-4">
        <h3>History Content</h3>
        <!-- Your content here -->
      </div>
    </template>
  </SimpleTabs>
</template>
```

**Props:**
- `modelValue: string` - Active tab value (v-model)
- `items: Tab[]` - Array of tab definitions

**Tab Interface:**
```typescript
interface Tab {
  value: string   // Unique identifier for the tab
  label: string   // Display text
  icon?: string   // Optional icon (not implemented yet)
}
```

**Slots:**
- Named slots matching each tab's `value` property

---

## 🏗️ Real-World Implementation Example

**Floor Plan Pricing Manager Modal** (`layers/ops/pages/office/pricing/floor-plans/index.vue`)

This is the reference implementation that replaced broken UModal/UTabs:

```vue
<script setup lang="ts">
import SimpleModal from '~/layers/base/components/SimpleModal.vue'
import AmenityAdjustmentModal from './modals/AmenityAdjustmentModal.vue'

// Modal state (use v-model pattern)
const showPricingModal = ref(false)
const selectedUnit = ref(null)

const openIndividualOverride = (unit) => {
  selectedUnit.value = unit
  showPricingModal.value = true
}

const handleModalClose = async (saved: boolean) => {
  showPricingModal.value = false
  if (saved) {
    await refreshUnits()
  }
  setTimeout(() => {
    selectedUnit.value = null
  }, 300) // Wait for modal close animation
}
</script>

<template>
  <div>
    <!-- Your page content -->
    <button @click="openIndividualOverride(unit)">Edit Pricing</button>

    <!-- Modal -->
    <SimpleModal
      v-model="showPricingModal"
      :title="selectedUnit ? `Unit ${selectedUnit.unit_name} Pricing Override` : ''"
      width="max-w-7xl"
    >
      <AmenityAdjustmentModal
        v-if="selectedUnit"
        :unit="selectedUnit"
        :on-close="handleModalClose"
      />
    </SimpleModal>
  </div>
</template>
```

**Key Points:**
1. ✅ Store modal state in refs (`showPricingModal`, `selectedUnit`)
2. ✅ Use v-model to control visibility
3. ✅ Pass data as regular props (they work!)
4. ✅ Handle close callback to refresh data
5. ✅ Clear selected item after modal closes

---

## 🚫 Anti-Patterns - Do NOT Do This

### ❌ DON'T Use overlay.create()

```vue
// ❌ WRONG - Props don't work!
const modal = overlay.create(MyModal, {
  data: myData,  // This will be LOST!
  onClose: callback
})
modal.open()
```

### ✅ DO Use SimpleModal with v-model

```vue
// ✅ CORRECT - Props work perfectly
const showModal = ref(false)
const modalData = ref(null)

const openModal = (data) => {
  modalData.value = data
  showModal.value = true
}

<SimpleModal v-model="showModal">
  <MyModal :data="modalData" :on-close="handleClose" />
</SimpleModal>
```

---

## 📝 Migration Checklist

If you're migrating from UModal/UTabs to Simple components:

- [ ] Import SimpleModal and/or SimpleTabs from `~/layers/base/components/`
- [ ] Create `showModal` ref for visibility control
- [ ] Create refs for any data you need to pass to modal
- [ ] Replace `overlay.create()` with setting refs and `showModal.value = true`
- [ ] Add `<SimpleModal v-model="showModal">` to template
- [ ] Pass data as regular props to your modal content component
- [ ] Replace `<UTabs>` with `<SimpleTabs>` and update slot names
- [ ] Test that props are received correctly
- [ ] Remove any workarounds for prop passing (refs, provide/inject, etc.)

---

## 🔧 Extending Simple Components

These components are intentionally simple and easy to extend. If you need additional features:

1. **Copy the component** to your layer if you need layer-specific modifications
2. **Extend with new props** - just add to the defineProps
3. **Add new features** - the code is straightforward
4. **Create variants** - e.g., SimpleModalFullScreen, SimpleTabsVertical

**Example: Adding a confirm-before-close feature:**

```vue
<script setup lang="ts">
// In SimpleModal.vue
const props = defineProps<{
  modelValue: boolean
  title?: string
  width?: string
  confirmBeforeClose?: boolean  // NEW
}>()

const close = () => {
  if (props.confirmBeforeClose) {
    if (confirm('Close without saving?')) {
      emit('update:modelValue', false)
    }
  } else {
    emit('update:modelValue', false)
  }
}
</script>
```

---

## 📚 Additional Resources

- **Original Implementation:** `layers/ops/pages/office/pricing/floor-plans/index.vue`
- **Modal Content Example:** `layers/ops/components/modals/AmenityAdjustmentModal.vue`
- **Documentation:** `docs/status/SESSION_2026_02_07_MODAL_IMPLEMENTATION.md`
- **Memory Entry:** `.claude/memory/MEMORY.md` - "Simple Components Pattern"

---

## 🎯 Summary

**Golden Rules:**
1. **Never use UModal or overlay.create()** - Use SimpleModal with v-model
2. **Never use UTabs** - Use SimpleTabs with named slots
3. **Always test prop passing** - If props don't work, you're using the wrong component
4. **Keep it simple** - Vue's built-in features work great, don't over-complicate

**When in doubt:**
- Can you do it with plain Vue? → Use plain Vue
- Need a modal? → Use SimpleModal
- Need tabs? → Use SimpleTabs
- Need something else? → Check if we have a Simple version first

---

**Last Updated:** 2026-02-07
**Maintained By:** Development Team
**Questions?** Check this doc first, then ask in team chat
