# Inventory Installations - Mobile UX
*Created: 2026-02-19*

## Problem
Native `<select>` dropdowns are terrible on mobile when you have hundreds of options:
- **SB Property:** 392 units - impossible to scroll through
- Small touch targets
- No search/filter capability
- Poor UX on phones

## Solution: Searchable Modal Selector

### New Component: `LocationSelector.vue`

**Features:**
1. **Large Touch Targets** - 48px minimum height (Apple/Google guidelines)
2. **Search Functionality** - Filter 392+ options as you type
3. **Mobile-First Design** - Slides up from bottom on mobile, centered modal on desktop
4. **Live Filtering** - Shows "X of Y options" as you search
5. **Clear Button** - Easy to reset selection
6. **Keyboard Friendly** - Auto-focus on search input

### UI Pattern

**Desktop:**
```
┌─────────────────────────────────┐
│  Select Unit             ▼      │  ← Click to open
└─────────────────────────────────┘

Opens centered modal:
┌─────────────────────────────────┐
│  Unit                        ✕  │
├─────────────────────────────────┤
│  🔍 Search...                   │
│  Showing 5 of 392 options       │
├─────────────────────────────────┤
│  ☐ Unit 101                     │
│  ☐ Unit 102A                    │
│  ☐ Unit 105                     │
│  ☐ Unit 107                     │
│  ☐ Unit 110                     │
├─────────────────────────────────┤
│  [Clear]  [Done]                │
└─────────────────────────────────┘
```

**Mobile:**
```
Slides up from bottom:
┌─────────────────────────────────┐
│  Unit                        ✕  │
├─────────────────────────────────┤
│  🔍 Search...                   │  ← Auto-focus
│  Showing 5 of 392 options       │
├─────────────────────────────────┤
│                                 │
│  ☐ Unit 101                     │  ← Large
│                                 │     touch
│  ☐ Unit 102A                    │     targets
│                                 │
│  ☐ Unit 105                     │
│                                 │
└─────────────────────────────────┘
```

### Usage Example

**Before (Native Select):**
```vue
<select v-model="locationId">
  <option value="">Select...</option>
  <option v-for="unit in 392units">...</option>
</select>
```
❌ Can't search, hard to find unit, tiny dropdown

**After (LocationSelector):**
```vue
<LocationSelector
  v-model="locationId"
  :options="units"
  label="Unit"
  placeholder="Select unit..."
  required
/>
```
✅ Search "101" → Instantly filters to matching units

## Implementation

### 1. Location Type Buttons
**Before:** Small dropdown
```html
<select v-model="location_type">
  <option>unit</option>
  <option>building</option>
  <option>common_area</option>
</select>
```

**After:** Large button group (mobile-friendly)
```html
<div class="grid grid-cols-3 gap-2">
  <button>Unit</button>
  <button>Building</button>
  <button>Common</button>
</div>
```
- 48px tall buttons
- Visual feedback (blue when selected)
- Easy thumb tapping

### 2. Item Selector
Also uses `LocationSelector` component:
```vue
<LocationSelector
  v-model="item_definition_id"
  :options="itemDefinitions.map(item => ({
    id: item.id,
    name: `${item.category_name} - ${item.brand} ${item.model}`
  }))"
  label="Item"
  required
/>
```

### 3. Location Selector
Three types, all searchable:
- **Units** - Search 392 units by typing
- **Buildings** - Search buildings
- **Common Areas** - Search locations

## User Flow

### Adding Installation on Mobile

1. **Tap "Add Installation"** → Modal opens
2. **Select Item** → Tap → Search modal → Type "Samsung" → Select
3. **Select Location Type** → Tap "Unit" button (large, easy)
4. **Select Unit** → Tap → Search modal → Type "101" → Shows 5 results → Select Unit 101
5. **Fill dates, prices** (native inputs work fine)
6. **Tap Save** → Done!

**Time saved:** From scrolling through 392 options to typing 3 characters and tapping.

## Technical Details

### Component Props
```typescript
interface Props {
  modelValue: string           // Selected ID
  options: LocationOption[]    // Array of {id, name}
  label: string                // "Unit", "Building", etc.
  placeholder?: string         // "Select..."
  required?: boolean           // Show red asterisk
}
```

### Responsive Behavior
```css
/* Mobile: Full-screen bottom sheet */
@media (max-width: 640px) {
  .modal {
    border-radius: 1.5rem 1.5rem 0 0;
    max-height: 80vh;
  }
}

/* Desktop: Centered modal */
@media (min-width: 641px) {
  .modal {
    border-radius: 0.5rem;
    max-width: 32rem;
    max-height: 600px;
  }
}
```

### Animation
- Slides up from bottom on mobile (0.3s ease-out)
- Backdrop fade-in
- Smooth, native feel

## Files

**New Component:**
- `layers/base/components/LocationSelector.vue`

**Updated Page:**
- `layers/ops/pages/inventory/installations.vue`

**Documentation:**
- `docs/inventory/MOBILE_UX.md` (this file)

## Benefits

✅ **Searchable** - Find 1 of 392 units instantly
✅ **Touch-Friendly** - 48px+ buttons, easy to tap
✅ **Fast** - Type 3 chars vs scroll through 392
✅ **Accessible** - Keyboard navigation works
✅ **Beautiful** - Smooth animations, modern UI
✅ **Reusable** - Use for any long dropdown

## Future Enhancements

1. **Recent Selections** - Show last 5 used units at top
2. **Grouping** - Group units by floor/building
3. **Icons** - Show icons for location types
4. **Quick Actions** - "Add new location" button in modal
5. **Barcode Scan** - Scan unit QR code to select

## Testing

**Desktop:**
```
✅ Opens centered modal
✅ Search filters options
✅ Selected value shows checkmark
✅ Clear button removes selection
```

**Mobile (iPhone/Android):**
```
✅ Slides up from bottom
✅ Auto-focuses search input
✅ Large touch targets (48px+)
✅ Smooth close animation
✅ Works in landscape mode
```

## Accessibility

- ✅ ARIA labels on buttons
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Screen reader friendly
- ✅ High contrast mode compatible
- ✅ Focus indicators visible

---

## Mobile Design Framework 2.0 (The "EE-Mobile" Standard)

This section establishes the visual and functional "model" for all future mobile components, as finalized during the Feb 2026 Mobile UI refinement.

### 1. Glassmorphism Layout Specs
The mobile shell uses a specialized layout defined in `mobile-app.vue`.
- **Blur Depth**: `backdrop-blur-2xl`
- **Transparency**: `bg-white/80` (Light) or `bg-slate-900/80` (Dark)
- **Borders**: Explicit `border-white/30` or `border-white/10` to define surface edges.
- **Safe Areas**: All components MUST respect `env(safe-area-inset-*)` using the `.safe-top` and `.pb-safe` utilities.

### 2. High-Visibility Button Model
Standard buttons often "disappear" on high-density mobile screens with translucent backgrounds. The refined model requires:
- **Explicit Borders**: `border-2` (minimum) on all primary and secondary actions.
- **Color Coding**:
  - `primary`: Interactive/Theme core.
  - `sky`: Information/Global actions (e.g. Share).
  - `red`: Destructive actions (e.g. Delete).
  - `amber`: Warning/Closing actions (e.g. Close Modal).
- **Typography**: `font-black`, `uppercase`, `tracking-widest` for clear legibility.
- **Micro-animations**: `active:scale-95` on tap for tactile feedback.

### 3. Department-Aware Hubs
Dashboard/Grid interactions are dynamically filtered by `userContext.profile.department`.
- **Maintenance**: Focuses on `Scan`, `Work Orders`, `Inventory`.
- **Leasing**: Focuses on `Applications`, `Availability`, `Residents`.
- **Default**: All users see `Locations`, `Alerts`, `Profile`.

### 4. Component Implementation
- **Modals**: All mobile modals MUST use `SimpleModal.vue`, which functions as a "Bottom Sheet" on screens `< 640px`.
- **Help/Context**: Floating help bubbles move to `top-right` on mobile to avoid bottom nav collision.

---

**Result:** A robust, consistent mobile design language that prioritizes thumb-accessibility and visual clarity. 📱✨
