# Ops Module: Architecture & Patterns Handoff

This document provides a technical overview of the patterns established during the implementation of the Asset and Office modules within the `layers/ops` directory.

## 1. Data Layer: SQL View Architecture (Supabase)

All list and detail pages are powered by dedicated SQL views. This ensures that the frontend receives pre-joined, denormalized data, reducing client-side logic and improving performance.

### Key Views:
- **`view_table_units`**: Consolidates unit, building, property, and primary resident data.
- **`view_table_residents`**: Maps residents to tenancies, leases, and units.
- **`view_table_leases`**: Tracks lease terms and financial metrics.
- **`view_table_availabilities`**: The primary inventory tracking view, including vacancy and turnover days.

---

## 2. Component Layer: Standardized Tables

We utilize the `GenericDataTable` component from `layers/table` for all list views.

### Pattern: Custom Cells
Always use the `#cell-[key]` slots to apply consistent styling:
- **`CellsLinkCell`**: Primary identifiers (Units, Buildings, Residents).
- **`CellsBadgeCell`**: Operational and lease statuses.
- **`CellsCurrencyCell`**: Financial data (Rent, etc.).

### UI Innovation: Vacancy Intensity Scale
The Availabilities module introduces a "Heatmap" pattern for units:
- **Location**: `unit_name` column (index) and header (detail).
- **Implementation**: Custom logic (see `AVAILABILITY_COLORS.md`) maps `vacant_days` to specific background colors.
- **Contrast**: Always use **Extra Bold Black text** (`text-gray-950`) on these colored backgrounds for maximum accessibility.

---

## 3. Interaction Patterns

### Detail Pages (`[id].vue`)
- **Breadcrumbs**: Use the `UButton` back + link sequence for robust desktop/mobile navigation.
- **Synchronized Visuals**: The intensity colors and metrics from the list view MUST be reflected exactly on the detail page.
- **Image Modals**: 
    - Use the reusable `ImageModal.vue` component.
    - Always implement with `v-if="showImageModal"` to prevent "already opened" DOM errors.
    - Providing both a quick-view modal AND a "View Full Resolution" solid button (separate tab) is the established standard.

### Navigation State
- Use the `usePropertyState` composable to filter all views by the active property code.
- Always include `activeProperty` in the `useAsyncData` watch array.

---

## 4. Documentation References
- [AVAILABILITY_COLORS.md](file:///Users/edward/Dev/Nuxt/EE_manager/layers/ops/docs/AVAILABILITY_COLORS.md) - The intensity scale legend.
- `walkthrough.md` - Chronological log of implementation steps.

*This document is intended for transition to future development cycles.*
