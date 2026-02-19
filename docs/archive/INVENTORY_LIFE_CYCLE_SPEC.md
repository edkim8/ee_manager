# Specification: Inventory Life-Cycle Module (V4.1)

## Status: ARCHIVED / COMPLETED (2026-02-19)

This module implements a property-scoped inventory tracking system with polymorphic location associations and mobile-optimized search.

---

## 🏗️ Core Architecture

### Three-Tier Model
1. **Global Categories**: Shared definitions (e.g. "Refrigerators") with expected life years (Budgeting logic).
2. **Property Items**: Brand/Model catalog definitions scoped to a specific property (e.g. "Samsung RF28" at Property WO).
3. **Location Installations**: Physical assets tracked by Serial Number / Asset Tag at a specific Unit, Building, or Common Area.

### Polymorphic Location Tracking
Items are linked to containers via `location_type` and `location_id`, enabling fast "Reverse Searches" (find everything in Unit 101).

---

## 📂 Database Schema (Supabase)

### Tables
- `inventory_categories`: Lifecycle library (Fridge, Stove, HVAC).
- `inventory_items`: The item catalog (Brand, Model, Seller).
- `inventory_history`: Event ledger (Installed, Refinished, Replaced).

### Views
- `view_inventory_lifecycle`: Real-time health calculation (Age vs Expected Life).
- `view_inventory_summary_by_location`: Aggregated health metrics for Unit/Building views.

---

## 📱 Mobile & UI Standards
- **Simple Components Law**: UI built with `SimpleModal` and `SimpleTabs` to avoid Nuxt UI quirks.
- **Searchable Selector**: Mobile-optimized `LocationSelector.vue` to handle properties with large unit counts (e.g., 392 units).
- **Photo-First**: Auto-compressed photo capturing via existing `attachments` system.

---

## 🔄 Historical Record (Shift H-042)
*The following is the final report from the Foundation Build:*

render_diffs(file:///Users/edward/Dev/Nuxt/EE_manager/docs/status/LATEST_UPDATE.md)
